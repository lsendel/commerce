import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Env } from "../../env";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/role.middleware";
import { createDb } from "../../infrastructure/db/client";
import { StoreRepository } from "../../infrastructure/repositories/store.repository";
import { StripeConnectAdapter } from "../../infrastructure/stripe/connect.adapter";
import { InviteMemberUseCase } from "../../application/platform/invite-member.usecase";
import { AcceptInvitationUseCase } from "../../application/platform/accept-invitation.usecase";
import { ChangeMemberRoleUseCase } from "../../application/platform/change-member-role.usecase";
import { UploadStoreLogoUseCase } from "../../application/platform/upload-store-logo.usecase";
import {
  createStoreSchema,
  updateStoreSchema,
  addMemberSchema,
  addDomainSchema,
  subscribePlanSchema,
} from "../../contracts/platform.contract";

const platform = new Hono<{ Bindings: Env }>();

// Create store
platform.post(
  "/stores",
  requireAuth(),
  zValidator("json", createStoreSchema),
  async (c) => {
    const data = c.req.valid("json");
    const db = createDb(c.env.DATABASE_URL);
    const repo = new StoreRepository(db);

    const existing = await repo.findBySlug(data.slug);
    if (existing) {
      return c.json({ error: "Store slug already taken" }, 409);
    }

    const store = await repo.create({
      name: data.name,
      slug: data.slug,
      subdomain: data.subdomain ?? data.slug,
    });

    if (!store) {
      return c.json({ error: "Failed to create store" }, 500);
    }

    // Add creator as owner
    await repo.addMember(store.id, c.get("userId"), "owner");

    return c.json({ id: store.id, slug: store.slug }, 201);
  },
);

// List stores (super_admin only)
platform.get("/stores", requireAuth(), requireRole("super_admin"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const repo = new StoreRepository(db);
  const page = Number(c.req.query("page") ?? "1");
  const limit = Number(c.req.query("limit") ?? "20");
  const stores = await repo.listAll(page, limit);
  return c.json({ stores });
});

// Get store
platform.get("/stores/:id", requireAuth(), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const repo = new StoreRepository(db);
  const store = await repo.findById(c.req.param("id"));
  if (!store) return c.json({ error: "Store not found" }, 404);
  return c.json({ store });
});

// Update store
platform.patch(
  "/stores/:id",
  requireAuth(),
  zValidator("json", updateStoreSchema),
  async (c) => {
    const data = c.req.valid("json");
    const db = createDb(c.env.DATABASE_URL);
    const repo = new StoreRepository(db);
    const store = await repo.update(c.req.param("id"), data);
    if (!store) return c.json({ error: "Store not found" }, 404);
    return c.json({ store });
  },
);

// Members
platform.get("/stores/:id/members", requireAuth(), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const repo = new StoreRepository(db);
  const members = await repo.findMembers(c.req.param("id"));
  return c.json({ members });
});

platform.post(
  "/stores/:id/members",
  requireAuth(),
  zValidator("json", addMemberSchema),
  async (c) => {
    const { userId, role } = c.req.valid("json");
    const db = createDb(c.env.DATABASE_URL);
    const repo = new StoreRepository(db);
    const member = await repo.addMember(c.req.param("id"), userId, role);
    return c.json({ member }, 201);
  },
);

platform.delete("/stores/:id/members/:userId", requireAuth(), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const repo = new StoreRepository(db);
  await repo.removeMember(c.req.param("id"), c.req.param("userId"));
  return c.json({ ok: true });
});

// Domains
platform.get("/stores/:id/domains", requireAuth(), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const repo = new StoreRepository(db);
  const domains = await repo.findDomains(c.req.param("id"));
  return c.json({ domains });
});

platform.post(
  "/stores/:id/domains",
  requireAuth(),
  zValidator("json", addDomainSchema),
  async (c) => {
    const { domain } = c.req.valid("json");
    const db = createDb(c.env.DATABASE_URL);
    const repo = new StoreRepository(db);
    const token = crypto.randomUUID();
    const record = await repo.addDomain(c.req.param("id"), domain, token);
    return c.json({ domain: record }, 201);
  },
);

platform.post(
  "/stores/:id/domains/:domainId/verify",
  requireAuth(),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const repo = new StoreRepository(db);
    const record = await repo.verifyDomain(c.req.param("domainId"));
    return c.json({ domain: record });
  },
);

// Dashboard
platform.get("/stores/:id/dashboard", requireAuth(), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const repo = new StoreRepository(db);
  const store = await repo.findById(c.req.param("id"));
  const members = await repo.findMembers(c.req.param("id"));
  const domains = await repo.findDomains(c.req.param("id"));
  const billing = await repo.getBilling(c.req.param("id"));
  const settings = await repo.getSettings(c.req.param("id"));
  return c.json({
    dashboard: { store, members, domains, billing, settings },
  });
});

// Plans
platform.get("/plans", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const repo = new StoreRepository(db);
  const plans = await repo.findAllPlans();
  return c.json({ plans });
});

// Billing
platform.get("/stores/:id/billing", requireAuth(), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const repo = new StoreRepository(db);
  const billing = await repo.getBilling(c.req.param("id"));
  return c.json({ billing });
});

platform.post(
  "/stores/:id/billing/subscribe",
  requireAuth(),
  zValidator("json", subscribePlanSchema),
  async (c) => {
    const { planId } = c.req.valid("json");
    const db = createDb(c.env.DATABASE_URL);
    const repo = new StoreRepository(db);
    const storeId = c.req.param("id");

    const plan = await repo.findPlanById(planId);
    if (!plan) return c.json({ error: "Plan not found" }, 404);

    const existingBilling = await repo.getBilling(storeId);
    let billing;
    if (existingBilling) {
      billing = await repo.updateBilling(storeId, { platformPlanId: planId });
    } else {
      billing = await repo.createBilling({ storeId, platformPlanId: planId });
    }
    return c.json({ billing: billing ?? null });
  },
);

// Connect onboarding
platform.post(
  "/stores/:id/connect/onboard",
  requireAuth(),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const repo = new StoreRepository(db);
    const store = await repo.findById(c.req.param("id"));
    if (!store) return c.json({ error: "Store not found" }, 404);

    const connect = new StripeConnectAdapter(c.env.STRIPE_SECRET_KEY);
    let accountId = store.stripeConnectAccountId;

    if (!accountId) {
      const account = await connect.createConnectAccount(
        c.get("user").email,
      );
      accountId = account.id;
      await repo.update(store.id, { stripeConnectAccountId: accountId });
    }

    const link = await connect.createAccountLink(
      accountId,
      `${c.env.APP_URL}/platform/settings`,
      `${c.env.APP_URL}/platform/settings`,
    );
    return c.json({ url: link.url });
  },
);

// ── Logo Upload ─────────────────────────────────────────────────────────────

platform.post("/stores/:id/logo", requireAuth(), async (c) => {
  const body = await c.req.parseBody();
  const file = body["logo"];
  if (!(file instanceof File)) {
    return c.json({ error: "No logo file provided" }, 400);
  }
  if (file.size > 2 * 1024 * 1024) {
    return c.json({ error: "File must be under 2MB" }, 400);
  }
  if (!file.type.startsWith("image/")) {
    return c.json({ error: "File must be an image" }, 400);
  }

  const db = createDb(c.env.DATABASE_URL);
  const repo = new StoreRepository(db);
  const useCase = new UploadStoreLogoUseCase(repo, c.env.IMAGES);
  const result = await useCase.execute(c.req.param("id"), file);
  return c.json(result);
});

// ── Invitations ─────────────────────────────────────────────────────────────

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "staff"]),
});

platform.post(
  "/stores/:id/invite",
  requireAuth(),
  zValidator("json", inviteSchema),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const repo = new StoreRepository(db);
    const useCase = new InviteMemberUseCase(repo);
    const { email, role } = c.req.valid("json");
    const invitation = await useCase.execute({
      storeId: c.req.param("id"),
      email,
      role,
      invitedBy: c.get("userId"),
    });
    return c.json({ invitation }, 201);
  },
);

platform.post(
  "/invitations/:token/accept",
  requireAuth(),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const repo = new StoreRepository(db);
    const useCase = new AcceptInvitationUseCase(repo);
    const result = await useCase.execute(
      c.req.param("token"),
      c.get("userId"),
    );
    return c.json(result, 200);
  },
);

const changeRoleSchema = z.object({
  role: z.enum(["admin", "staff"]),
});

platform.patch(
  "/stores/:id/members/:userId/role",
  requireAuth(),
  zValidator("json", changeRoleSchema),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const repo = new StoreRepository(db);
    const useCase = new ChangeMemberRoleUseCase(repo);
    const { role } = c.req.valid("json");
    const member = await useCase.execute({
      storeId: c.req.param("id"),
      targetUserId: c.req.param("userId"),
      newRole: role,
      requesterId: c.get("userId"),
    });
    return c.json({ member }, 200);
  },
);

export default platform;
