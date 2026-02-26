import { eq, and } from "drizzle-orm";
import type { Database } from "../db/client";
import { digitalAssets, downloadTokens } from "../db/schema";

export class DownloadRepository {
  constructor(
    private db: Database,
    private storeId: string,
  ) {}

  async createAsset(data: {
    productId: string;
    fileName: string;
    fileSize: number;
    storageKey: string;
    contentType: string;
  }) {
    const rows = await this.db
      .insert(digitalAssets)
      .values(data)
      .returning();
    return rows[0]!;
  }

  async findAssetsByProduct(productId: string) {
    return this.db
      .select()
      .from(digitalAssets)
      .where(eq(digitalAssets.productId, productId));
  }

  async findAssetById(id: string) {
    const rows = await this.db
      .select()
      .from(digitalAssets)
      .where(eq(digitalAssets.id, id))
      .limit(1);
    return rows[0] ?? null;
  }

  async createToken(data: {
    userId: string;
    orderId: string;
    orderItemId?: string;
    token: string;
    expiresAt: Date;
  }) {
    const rows = await this.db
      .insert(downloadTokens)
      .values({
        storeId: this.storeId,
        userId: data.userId,
        orderId: data.orderId,
        orderItemId: data.orderItemId,
        token: data.token,
        expiresAt: data.expiresAt,
      })
      .returning();
    return rows[0]!;
  }

  async findByToken(token: string) {
    const now = new Date();
    const rows = await this.db
      .select()
      .from(downloadTokens)
      .where(
        and(
          eq(downloadTokens.token, token),
          eq(downloadTokens.revoked, false),
        ),
      )
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    // Check expiry
    if (row.expiresAt < now) return null;

    return row;
  }

  async markDownloaded(tokenId: string) {
    await this.db
      .update(downloadTokens)
      .set({ downloadedAt: new Date() })
      .where(eq(downloadTokens.id, tokenId));
  }

  async revokeToken(tokenId: string) {
    await this.db
      .update(downloadTokens)
      .set({ revoked: true })
      .where(eq(downloadTokens.id, tokenId));
  }
}
