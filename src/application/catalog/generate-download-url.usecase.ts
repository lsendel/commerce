import { eq, and, gt, sql } from "drizzle-orm";
import type { Database } from "../../infrastructure/db/client";
import {
  orders,
  orderItems,
  productVariants,
  downloadTokens,
} from "../../infrastructure/db/schema";
import { NotFoundError, ValidationError, ForbiddenError } from "../../shared/errors";

interface GenerateDownloadInput {
  userId: string;
  orderId: string;
  orderItemId: string;
}

interface DownloadTokenResult {
  token: string;
  downloadUrl: string;
  expiresAt: Date;
}

export class GenerateDownloadUrlUseCase {
  constructor(
    private db: Database,
    private storeId: string,
    private appUrl: string,
  ) {}

  async execute(input: GenerateDownloadInput): Promise<DownloadTokenResult> {
    const { userId, orderId, orderItemId } = input;

    // 1. Verify order belongs to user
    const orderRows = await this.db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.id, orderId),
          eq(orders.storeId, this.storeId),
          eq(orders.userId, userId),
        ),
      )
      .limit(1);

    const order = orderRows[0];
    if (!order) {
      throw new NotFoundError("Order", orderId);
    }

    if (order.status === "cancelled" || order.status === "refunded") {
      throw new ValidationError("Cannot download from a cancelled or refunded order");
    }

    // 2. Verify order item exists and belongs to this order
    const itemRows = await this.db
      .select({
        id: orderItems.id,
        variantId: orderItems.variantId,
      })
      .from(orderItems)
      .where(
        and(eq(orderItems.id, orderItemId), eq(orderItems.orderId, orderId)),
      )
      .limit(1);

    const item = itemRows[0];
    if (!item) {
      throw new NotFoundError("Order item", orderItemId);
    }

    // 3. Verify variant has a digital asset
    if (!item.variantId) {
      throw new ValidationError("This item has no downloadable content");
    }

    const variantRows = await this.db
      .select({ digitalAssetKey: productVariants.digitalAssetKey })
      .from(productVariants)
      .where(eq(productVariants.id, item.variantId))
      .limit(1);

    const variant = variantRows[0];
    if (!variant?.digitalAssetKey) {
      throw new ValidationError("This item has no downloadable content");
    }

    // 4. Rate limit: max 10 tokens per hour per user+order
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const countRows = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(downloadTokens)
      .where(
        and(
          eq(downloadTokens.userId, userId),
          eq(downloadTokens.orderId, orderId),
          gt(downloadTokens.createdAt, oneHourAgo),
        ),
      );

    const tokenCount = Number(countRows[0]?.count ?? 0);
    if (tokenCount >= 10) {
      throw new ValidationError("Too many download requests. Please try again later.");
    }

    // 5. Generate token (24-hour expiry)
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.db.insert(downloadTokens).values({
      storeId: this.storeId,
      userId,
      orderId,
      orderItemId,
      token,
      expiresAt,
    });

    const downloadUrl = `${this.appUrl}/api/downloads/${token}`;

    return { token, downloadUrl, expiresAt };
  }
}
