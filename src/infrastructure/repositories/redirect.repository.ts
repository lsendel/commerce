import { and, eq } from "drizzle-orm";
import type { Database } from "../db/client";
import { redirects } from "../db/schema";

export class RedirectRepository {
  constructor(
    private db: Database,
    private storeId: string,
  ) {}

  async findByPath(path: string) {
    const result = await this.db
      .select()
      .from(redirects)
      .where(and(eq(redirects.storeId, this.storeId), eq(redirects.fromPath, path)))
      .limit(1);
    return result[0] ?? null;
  }

  async findAll() {
    return this.db
      .select()
      .from(redirects)
      .where(eq(redirects.storeId, this.storeId))
      .orderBy(redirects.createdAt);
  }

  async create(data: { fromPath: string; toPath: string; statusCode?: number }) {
    const result = await this.db
      .insert(redirects)
      .values({
        storeId: this.storeId,
        fromPath: data.fromPath,
        toPath: data.toPath,
        statusCode: data.statusCode ?? 301,
      })
      .returning();
    return result[0];
  }

  async delete(id: string) {
    await this.db
      .delete(redirects)
      .where(and(eq(redirects.id, id), eq(redirects.storeId, this.storeId)));
  }
}
