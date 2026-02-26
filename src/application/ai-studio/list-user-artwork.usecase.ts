import { eq, and, desc, count } from "drizzle-orm";
import type { Database } from "../../infrastructure/db/client";
import { generationJobs } from "../../infrastructure/db/schema";

export class ListUserArtworkUseCase {
  constructor(
    private db: Database,
    private storeId: string,
  ) {}

  async execute(userId: string, pagination: { page: number; limit: number }) {
    const { page, limit } = pagination;
    const offset = (page - 1) * limit;

    const conditions = and(
      eq(generationJobs.userId, userId),
      eq(generationJobs.storeId, this.storeId),
      eq(generationJobs.status, "completed"),
    );

    const countResult = await this.db
      .select({ total: count() })
      .from(generationJobs)
      .where(conditions);

    const total = countResult[0]?.total ?? 0;

    const rows = await this.db
      .select()
      .from(generationJobs)
      .where(conditions)
      .orderBy(desc(generationJobs.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      artwork: rows.map((j) => ({
        id: j.id,
        templateId: j.templateId,
        outputRasterUrl: j.outputRasterUrl,
        outputSvgUrl: j.outputSvgUrl,
        prompt: j.prompt,
        createdAt: j.createdAt?.toISOString() ?? new Date().toISOString(),
      })),
      total,
      page,
      limit,
    };
  }
}
