import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "../../env";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/role.middleware";
import { createDb } from "../../infrastructure/db/client";
import { AffiliateRepository } from "../../infrastructure/repositories/affiliate.repository";
import { ProductRepository } from "../../infrastructure/repositories/product.repository";
import { GetAffiliateMissionsUseCase } from "../../application/affiliates/get-affiliate-missions.usecase";
import { ProcessPayoutsUseCase } from "../../application/affiliates/process-payouts.usecase";
import { resolveFeatureFlags } from "../../shared/feature-flags";
import {
  registerAffiliateSchema,
  createLinkSchema,
} from "../../contracts/affiliates.contract";

const affiliateRoutes = new Hono<{ Bindings: Env }>();

function checkFeature(c: any, key: "affiliate_missions_dashboard" | "creator_storefront_pages") {
  const flags = resolveFeatureFlags(c.env.FEATURE_FLAGS);
  if (!flags[key]) {
    return c.json({ error: "Feature is currently disabled", code: "FEATURE_DISABLED" }, 403);
  }
  return null;
}

function appendReferral(targetUrl: string, referralCode: string) {
  try {
    const url = new URL(targetUrl);
    url.searchParams.set("ref", referralCode);
    return url.toString();
  } catch {
    return `${targetUrl}${targetUrl.includes("?") ? "&" : "?"}ref=${encodeURIComponent(referralCode)}`;
  }
}

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

// Weekly mission dashboard metrics
affiliateRoutes.get("/missions", requireAuth(), async (c) => {
  const featureError = checkFeature(c, "affiliate_missions_dashboard");
  if (featureError) return featureError;

  const storeId = c.get("storeId");
  const db = createDb(c.env.DATABASE_URL);
  const repo = new AffiliateRepository(db, storeId);
  const useCase = new GetAffiliateMissionsUseCase(repo);

  try {
    const result = await useCase.execute(c.get("userId"));
    return c.json(result, 200);
  } catch (error) {
    if (error instanceof Error && error.name === "NotFoundError") {
      return c.json({ error: "Not an affiliate" }, 404);
    }
    throw error;
  }
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

// Public creator storefront payload
affiliateRoutes.get("/storefront/:slug", async (c) => {
  const featureError = checkFeature(c, "creator_storefront_pages");
  if (featureError) return featureError;

  const storeId = c.get("storeId");
  const db = createDb(c.env.DATABASE_URL);
  const repo = new AffiliateRepository(db, storeId);
  const productRepo = new ProductRepository(db, storeId);
  const slug = c.req.param("slug");

  const creator = await repo.findApprovedByCustomSlug(slug);
  if (!creator) {
    return c.json({ error: "Creator storefront not found" }, 404);
  }

  const [links, catalog] = await Promise.all([
    repo.findTopLinksByClicks(creator.id, 8),
    productRepo.findAll({
      page: 1,
      limit: 12,
      available: true,
      status: "active",
      sort: "newest",
    }),
  ]);

  const featuredLinks = links.map((link) => ({
    id: link.id,
    shortCode: link.shortCode,
    clickCount: link.clickCount,
    targetUrl: link.targetUrl,
    referralUrl: appendReferral(link.targetUrl, creator.referralCode),
  }));

  const featuredProducts = catalog.products.map((product: any) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    featuredImageUrl: product.featuredImageUrl ?? product.images?.[0]?.url ?? null,
    price: Number(product.variants?.[0]?.price ?? product.priceRange?.min ?? 0).toFixed(2),
    referralUrl: `${c.env.APP_URL}/products/${product.slug}?ref=${encodeURIComponent(creator.referralCode)}`,
  }));

  return c.json({
    creator: {
      id: creator.id,
      name: creator.creatorName ?? `Creator ${creator.customSlug}`,
      customSlug: creator.customSlug,
      referralCode: creator.referralCode,
      commissionRate: creator.commissionRate,
      totalEarnings: creator.totalEarnings,
      totalClicks: creator.totalClicks,
      totalConversions: creator.totalConversions,
      createdAt: creator.createdAt?.toISOString() ?? null,
    },
    featuredLinks,
    featuredProducts,
  }, 200);
});

// Admin: list pending
affiliateRoutes.get("/admin/pending", requireAuth(), requireRole("admin"), async (c) => {
  const storeId = c.get("storeId");
  const db = createDb(c.env.DATABASE_URL);
  const repo = new AffiliateRepository(db, storeId);
  const pending = await repo.listPending();
  return c.json({ affiliates: pending });
});

// Admin: approve
affiliateRoutes.patch("/admin/:id/approve", requireAuth(), requireRole("admin"), async (c) => {
  const storeId = c.get("storeId");
  const db = createDb(c.env.DATABASE_URL);
  const repo = new AffiliateRepository(db, storeId);
  const affiliate = await repo.updateStatus(c.req.param("id"), "approved");
  if (!affiliate) {
    return c.json({ error: "Affiliate not found" }, 404);
  }
  return c.json({ affiliate });
});

// Admin: suspend
affiliateRoutes.patch("/admin/:id/suspend", requireAuth(), requireRole("admin"), async (c) => {
  const storeId = c.get("storeId");
  const db = createDb(c.env.DATABASE_URL);
  const repo = new AffiliateRepository(db, storeId);
  const affiliate = await repo.updateStatus(c.req.param("id"), "suspended");
  if (!affiliate) {
    return c.json({ error: "Affiliate not found" }, 404);
  }
  return c.json({ affiliate });
});

// Admin: process payouts
affiliateRoutes.post("/admin/payouts", requireAuth(), requireRole("admin"), async (c) => {
  const storeId = c.get("storeId");
  const db = createDb(c.env.DATABASE_URL);
  const repo = new AffiliateRepository(db, storeId);
  const useCase = new ProcessPayoutsUseCase(repo);
  const payouts = await useCase.execute();
  return c.json({ processed: payouts.length }, 200);
});

export default affiliateRoutes;
