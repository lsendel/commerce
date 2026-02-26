import { eq, and, sql } from "drizzle-orm";
import type { Database } from "../../infrastructure/db/client";
import { redirects } from "../../infrastructure/db/schema";
import { NotFoundError } from "../../shared/errors";

export class ManageRedirectsUseCase {
  constructor(
    private db: Database,
    private storeId: string,
  ) {}

  async createRedirect(fromPath: string, toPath: string, statusCode = 301) {
    const rows = await this.db
      .insert(redirects)
      .values({
        storeId: this.storeId,
        fromPath,
        toPath,
        statusCode,
      })
      .onConflictDoUpdate({
        target: [redirects.storeId, redirects.fromPath],
        set: { toPath, statusCode },
      })
      .returning();

    return rows[0]!;
  }

  async deleteRedirect(id: string) {
    const rows = await this.db
      .delete(redirects)
      .where(and(eq(redirects.id, id), eq(redirects.storeId, this.storeId)))
      .returning();

    if (!rows[0]) {
      throw new NotFoundError("Redirect", id);
    }
    return rows[0];
  }

  async listRedirects(page = 1, limit = 50) {
    const offset = (page - 1) * limit;

    const countResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(redirects)
      .where(eq(redirects.storeId, this.storeId));

    const total = Number(countResult[0]?.count ?? 0);

    const rows = await this.db
      .select()
      .from(redirects)
      .where(eq(redirects.storeId, this.storeId))
      .limit(limit)
      .offset(offset);

    return { redirects: rows, total, page, limit };
  }
}
