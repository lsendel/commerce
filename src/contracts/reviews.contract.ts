import { initContract } from "@ts-rest/core";
import { z } from "zod";
import { paginationSchema, slugParamSchema, idParamSchema } from "../shared/validators";

const c = initContract();

const reviewSchema = z.object({
  id: z.string(),
  productId: z.string(),
  userId: z.string(),
  rating: z.number().int().min(1).max(5),
  title: z.string().nullable(),
  content: z.string().nullable(),
  isVerifiedPurchase: z.boolean(),
  status: z.enum(["pending", "approved", "rejected", "flagged"]),
  helpfulCount: z.number(),
  reportedCount: z.number(),
  createdAt: z.coerce.date().nullable(),
});

export const submitReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).optional(),
  content: z.string().max(2000).optional(),
});

export const moderateReviewSchema = z.object({
  action: z.enum(["approved", "rejected"]),
});

export const reviewsContract = c.router({
  submit: {
    method: "POST",
    path: "/api/products/:slug/reviews",
    pathParams: slugParamSchema,
    body: submitReviewSchema,
    responses: {
      201: reviewSchema,
      400: z.object({ error: z.string() }),
      401: z.object({ error: z.string() }),
      404: z.object({ error: z.string() }),
    },
  },
  list: {
    method: "GET",
    path: "/api/products/:slug/reviews",
    pathParams: slugParamSchema,
    query: paginationSchema,
    responses: {
      200: z.object({
        reviews: z.array(reviewSchema),
        total: z.number(),
        page: z.number(),
        limit: z.number(),
        averageRating: z.number(),
        totalReviews: z.number(),
      }),
      404: z.object({ error: z.string() }),
    },
  },
  moderationQueue: {
    method: "GET",
    path: "/api/reviews/moderation",
    query: paginationSchema,
    responses: {
      200: z.object({
        reviews: z.array(reviewSchema),
        total: z.number(),
        page: z.number(),
        limit: z.number(),
      }),
    },
  },
  moderate: {
    method: "PATCH",
    path: "/api/reviews/:id/moderate",
    pathParams: idParamSchema,
    body: moderateReviewSchema,
    responses: {
      200: reviewSchema,
      400: z.object({ error: z.string() }),
      404: z.object({ error: z.string() }),
    },
  },
});
