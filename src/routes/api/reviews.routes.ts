import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { Env } from "../../env";
import { createDb } from "../../infrastructure/db/client";
import { ProductRepository } from "../../infrastructure/repositories/product.repository";
import { ReviewRepository } from "../../infrastructure/repositories/review.repository";
import { SubmitReviewUseCase } from "../../application/catalog/submit-review.usecase";
import { ListReviewsUseCase } from "../../application/catalog/list-reviews.usecase";
import { ModerateReviewUseCase } from "../../application/catalog/moderate-review.usecase";
import { RespondToReviewUseCase } from "../../application/catalog/respond-to-review.usecase";
import {
  submitReviewSchema,
  moderateReviewSchema,
} from "../../contracts/reviews.contract";
import { paginationSchema } from "../../shared/validators";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/role.middleware";

const reviews = new Hono<{ Bindings: Env }>();

// POST /products/:slug/reviews — submit review (authenticated)
reviews.post(
  "/products/:slug/reviews",
  requireAuth(),
  zValidator("json", submitReviewSchema),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;
    const userId = c.get("userId");
    const slug = c.req.param("slug");

    // Resolve product by slug
    const productRepo = new ProductRepository(db, storeId);
    const product = await productRepo.findBySlug(slug);
    if (!product) {
      return c.json({ error: "Product not found" }, 404);
    }

    const reviewRepo = new ReviewRepository(db, storeId);
    const useCase = new SubmitReviewUseCase(reviewRepo, db);

    const body = c.req.valid("json");
    const review = await useCase.execute({
      productId: product.id,
      userId,
      rating: body.rating,
      title: body.title ?? null,
      content: body.content ?? null,
    });

    return c.json(review, 201);
  },
);

// GET /products/:slug/reviews — list approved reviews (public)
reviews.get(
  "/products/:slug/reviews",
  zValidator("query", paginationSchema),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;
    const slug = c.req.param("slug");

    // Resolve product by slug
    const productRepo = new ProductRepository(db, storeId);
    const product = await productRepo.findBySlug(slug);
    if (!product) {
      return c.json({ error: "Product not found" }, 404);
    }

    const reviewRepo = new ReviewRepository(db, storeId);
    const useCase = new ListReviewsUseCase(reviewRepo);

    const { page, limit } = c.req.valid("query");
    const result = await useCase.execute(product.id, page, limit);

    return c.json(result, 200);
  },
);

// GET /reviews/moderation — flagged reviews queue (admin)
reviews.get(
  "/reviews/moderation",
  requireAuth(),
  requireRole("admin"),
  zValidator("query", paginationSchema),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;

    const reviewRepo = new ReviewRepository(db, storeId);
    const { page, limit } = c.req.valid("query");
    const result = await reviewRepo.findFlagged(page, limit);

    return c.json(result, 200);
  },
);

// PATCH /reviews/:id/moderate — approve/reject (admin)
reviews.patch(
  "/reviews/:id/moderate",
  requireAuth(),
  requireRole("admin"),
  zValidator("json", moderateReviewSchema),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;
    const reviewId = c.req.param("id");

    const reviewRepo = new ReviewRepository(db, storeId);
    const useCase = new ModerateReviewUseCase(reviewRepo);

    const { action } = c.req.valid("json");
    const review = await useCase.execute(reviewId, action);

    return c.json(review, 200);
  },
);

// POST /reviews/:id/respond — add store owner response (admin)
reviews.post(
  "/reviews/:id/respond",
  requireAuth(),
  requireRole("admin"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;
    const reviewId = c.req.param("id");
    const body = await c.req.json<{ responseText: string }>();

    const reviewRepo = new ReviewRepository(db, storeId);
    const useCase = new RespondToReviewUseCase(reviewRepo);

    const review = await useCase.execute(reviewId, body.responseText);
    return c.json(review, 200);
  },
);

// POST /reviews/:id/helpful — increment helpful count (public)
reviews.post("/reviews/:id/helpful", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const storeId = c.get("storeId") as string;
  const reviewId = c.req.param("id");

  const reviewRepo = new ReviewRepository(db, storeId);
  const review = await reviewRepo.incrementHelpful(reviewId);
  if (!review) {
    return c.json({ error: "Review not found" }, 404);
  }

  return c.json(
    {
      id: review.id,
      helpfulCount: review.helpfulCount ?? 0,
    },
    200,
  );
});

// POST /reviews/:id/report — report review for moderation (public)
reviews.post("/reviews/:id/report", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const storeId = c.get("storeId") as string;
  const reviewId = c.req.param("id");

  const reviewRepo = new ReviewRepository(db, storeId);
  const review = await reviewRepo.incrementReported(reviewId);
  if (!review) {
    return c.json({ error: "Review not found" }, 404);
  }

  return c.json(
    {
      id: review.id,
      reportedCount: review.reportedCount ?? 0,
      status: review.status,
    },
    200,
  );
});

export { reviews as reviewRoutes };
