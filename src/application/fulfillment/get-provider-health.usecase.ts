import type { Database } from "../../infrastructure/db/client";
import { eq, and, gte, desc } from "drizzle-orm";
import { providerHealthSnapshots } from "../../infrastructure/db/schema";

interface ProviderHealthSummary {
  provider: string;
  totalRequests: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  avgResponseMs: number | null;
  period: string;
}

export class GetProviderHealthUseCase {
  constructor(
    private db: Database,
    private storeId: string,
  ) {}

  async execute(days: number = 30): Promise<ProviderHealthSummary[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().split("T")[0] ?? "";

    const rows = await this.db
      .select()
      .from(providerHealthSnapshots)
      .where(
        and(
          eq(providerHealthSnapshots.storeId, this.storeId),
          gte(providerHealthSnapshots.period, sinceStr),
        ),
      )
      .orderBy(desc(providerHealthSnapshots.period));

    const byProvider = new Map<string, {
      totalRequests: number;
      successCount: number;
      failureCount: number;
      totalResponseMs: number;
      responseMsCount: number;
    }>();

    for (const row of rows) {
      const existing = byProvider.get(row.provider) ?? {
        totalRequests: 0,
        successCount: 0,
        failureCount: 0,
        totalResponseMs: 0,
        responseMsCount: 0,
      };
      existing.totalRequests += row.totalRequests;
      existing.successCount += row.successCount;
      existing.failureCount += row.failureCount;
      if (row.avgResponseMs !== null) {
        existing.totalResponseMs += row.avgResponseMs * row.totalRequests;
        existing.responseMsCount += row.totalRequests;
      }
      byProvider.set(row.provider, existing);
    }

    const summaries: ProviderHealthSummary[] = [];
    for (const [provider, data] of byProvider) {
      summaries.push({
        provider,
        totalRequests: data.totalRequests,
        successCount: data.successCount,
        failureCount: data.failureCount,
        successRate: data.totalRequests > 0
          ? Math.round((data.successCount / data.totalRequests) * 10000) / 100
          : 0,
        avgResponseMs: data.responseMsCount > 0
          ? Math.round(data.totalResponseMs / data.responseMsCount)
          : null,
        period: `${days}d`,
      });
    }

    return summaries;
  }
}
