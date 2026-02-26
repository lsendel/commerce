import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "../../env";
import { requireAuth } from "../../middleware/auth.middleware";
import { createDb } from "../../infrastructure/db/client";
import { AffiliateRepository } from "../../infrastructure/repositories/affiliate.repository";
import {
  registerAffiliateSchema,
  createLinkSchema,
} from "../../contracts/affiliates.contract";

const affiliateRoutes = new Hono<{ Bindings: Env }>();

// Register as affiliate
affiliateRoutes.post(
  "/register",
  requireAuth(),
  zValidator("json", registerAffiliateSchema),
  async (c) => {
    const data = c.req.valid("json");
    const storeId = c.get("storeId");
    const db = createDb(c.env.DATABASE_URL);
    const repo = new AffiliateRepository(db, storeId);

    const existing = await repo.findByUserId(c.get("userId"));
    if (existing) {
      return c.json({ error: "Already registered as affiliate" }, 409);
    }

    // Generate unique referral code
    const referralCode =
      data.customSlug ?? crypto.randomUUID().slice(0, 8).toUpperCase();

    // Find parent affiliate if referral provided
    let parentAffiliateId: string | undefined;
    if (data.parentCode) {
      const parent = await repo.findByReferralCode(data.parentCode);
      if (parent) parentAffiliateId = parent.id;
    }

    const tiers = await repo.findTiers();
    const defaultTier = tiers.find((t) => t.level === 1);

    const affiliate = await repo.create({
      userId: c.get("userId"),
      referralCode,
      commissionRate: defaultTier?.commissionRate ?? "5",
      parentAffiliateId,
      tierId: defaultTier?.id,
      customSlug: data.customSlug,
    });

    return c.json({ affiliate }, 201);
  },
);

// Dashboard
affiliateRoutes.get("/dashboard", requireAuth(), async (c) => {
  const storeId = c.get("storeId");
  const db = createDb(c.env.DATABASE_URL);
  const repo = new AffiliateRepository(db, storeId);

  const affiliate = await repo.findByUserId(c.get("userId"));
  if (!affiliate) return c.json({ error: "Not an affiliate" }, 404);

  const conversions = await repo.findConversions(affiliate.id, 1, 10);

  return c.json({
    affiliate,
    recentConversions: conversions,
    recentClicks: affiliate.totalClicks,
  });
});

// Links
affiliateRoutes.post(
  "/links",
  requireAuth(),
  zValidator("json", createLinkSchema),
  async (c) => {
    const { targetUrl } = c.req.valid("json");
    const storeId = c.get("storeId");
    const db = createDb(c.env.DATABASE_URL);
    const repo = new AffiliateRepository(db, storeId);

    const affiliate = await repo.findByUserId(c.get("userId"));
    if (!affiliate) return c.json({ error: "Not an affiliate" }, 404);

    const shortCode = crypto.randomUUID().slice(0, 8);
    const link = await repo.createLink({
      affiliateId: affiliate.id,
      targetUrl,
      shortCode,
    });

    return c.json({ link }, 201);
  },
);

affiliateRoutes.get("/links", requireAuth(), async (c) => {
  const storeId = c.get("storeId");
  const db = createDb(c.env.DATABASE_URL);
  const repo = new AffiliateRepository(db, storeId);

  const affiliate = await repo.findByUserId(c.get("userId"));
  if (!affiliate) return c.json({ error: "Not an affiliate" }, 404);

  const links = await repo.findLinks(affiliate.id);
  return c.json({ links });
});

// Conversions
affiliateRoutes.get("/conversions", requireAuth(), async (c) => {
  const storeId = c.get("storeId");
  const db = createDb(c.env.DATABASE_URL);
  const repo = new AffiliateRepository(db, storeId);

  const affiliate = await repo.findByUserId(c.get("userId"));
  if (!affiliate) return c.json({ error: "Not an affiliate" }, 404);

  const page = Number(c.req.query("page") ?? "1");
  const conversions = await repo.findConversions(affiliate.id, page);
  return c.json({ conversions });
});

// Payouts
affiliateRoutes.get("/payouts", requireAuth(), async (c) => {
  const storeId = c.get("storeId");
  const db = createDb(c.env.DATABASE_URL);
  const repo = new AffiliateRepository(db, storeId);

  const affiliate = await repo.findByUserId(c.get("userId"));
  if (!affiliate) return c.json({ error: "Not an affiliate" }, 404);

  const payouts = await repo.findPayouts(affiliate.id);
  return c.json({ payouts });
});

// Admin: list pending
affiliateRoutes.get("/admin/pending", requireAuth(), async (c) => {
  const storeId = c.get("storeId");
  const db = createDb(c.env.DATABASE_URL);
  const repo = new AffiliateRepository(db, storeId);
  const pending = await repo.listPending();
  return c.json({ affiliates: pending });
});

// Admin: approve
affiliateRoutes.patch("/admin/:id/approve", requireAuth(), async (c) => {
  const storeId = c.get("storeId");
  const db = createDb(c.env.DATABASE_URL);
  const repo = new AffiliateRepository(db, storeId);
  const affiliate = await repo.updateStatus(c.req.param("id"), "approved");
  return c.json({ affiliate });
});

// Admin: suspend
affiliateRoutes.patch("/admin/:id/suspend", requireAuth(), async (c) => {
  const storeId = c.get("storeId");
  const db = createDb(c.env.DATABASE_URL);
  const repo = new AffiliateRepository(db, storeId);
  const affiliate = await repo.updateStatus(c.req.param("id"), "suspended");
  return c.json({ affiliate });
});

export default affiliateRoutes;
