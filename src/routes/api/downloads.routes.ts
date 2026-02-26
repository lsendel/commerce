import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import type { Env } from "../../env";
import { createDb } from "../../infrastructure/db/client";
import { requireAuth } from "../../middleware/auth.middleware";
import { GenerateDownloadUrlUseCase } from "../../application/catalog/generate-download-url.usecase";
import { RedeemDownloadUseCase } from "../../application/catalog/redeem-download.usecase";
import { DownloadRepository } from "../../infrastructure/repositories/download.repository";
import {
  downloadTokens,
  orderItems,
  productVariants,
  digitalAssets,
} from "../../infrastructure/db/schema";
import { NotFoundError, ValidationError } from "../../shared/errors";

const downloads = new Hono<{ Bindings: Env }>();

/**
 * POST /downloads/generate — Create a time-limited download token (auth required)
 */
downloads.post(
  "/downloads/generate",
  requireAuth(),
  zValidator(
    "json",
    z.object({
      orderId: z.string().uuid(),
      orderItemId: z.string().uuid(),
    }),
  ),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;
    const userId = c.get("userId");
    const { orderId, orderItemId } = c.req.valid("json");

    const useCase = new GenerateDownloadUrlUseCase(db, storeId, c.env.APP_URL);
    const result = await useCase.execute({ userId, orderId, orderItemId });

    return c.json(result);
  },
);

/**
 * GET /downloads/:token — Validate token and serve file (no auth required, token-is-auth)
 */
downloads.get("/downloads/:token", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const tokenValue = c.req.param("token");
  const storeId = (c.get("storeId") as string | undefined) ?? "";
  const repo = new DownloadRepository(db, storeId);
  const useCase = new RedeemDownloadUseCase(repo);

  let downloadToken;
  try {
    downloadToken = await useCase.validateAndConsume(tokenValue);
  } catch (err) {
    if (err instanceof NotFoundError) {
      return c.json({ error: "Invalid or expired download link" }, 404);
    }
    if (err instanceof ValidationError) {
      return c.json({ error: (err as Error).message }, 410);
    }
    throw err;
  }

  // Resolve digital asset key from the order item's variant
  const itemRows = await db
    .select({
      variantId: orderItems.variantId,
    })
    .from(orderItems)
    .where(eq(orderItems.id, downloadToken.orderItemId!))
    .limit(1);

  const item = itemRows[0];
  if (!item?.variantId) {
    return c.json({ error: "No downloadable content" }, 404);
  }

  const variantRows = await db
    .select({ digitalAssetKey: productVariants.digitalAssetKey })
    .from(productVariants)
    .where(eq(productVariants.id, item.variantId))
    .limit(1);

  const variant = variantRows[0];
  if (!variant?.digitalAssetKey) {
    return c.json({ error: "No downloadable content" }, 404);
  }

  // Serve from R2
  const object = await c.env.IMAGES.get(variant.digitalAssetKey);
  if (!object) {
    return c.json({ error: "File not found" }, 404);
  }

  const headers = new Headers();
  headers.set("Content-Type", object.httpMetadata?.contentType || "application/octet-stream");
  headers.set("Content-Disposition", `attachment; filename="${variant.digitalAssetKey.split("/").pop()}"`);
  headers.set("Cache-Control", "no-store");

  return new Response(object.body, { headers });
});

export { downloads as downloadRoutes };
