import { invalidateByTags } from "./cache";
import {
  buildCacheInvalidationPlan,
  type CacheInvalidationPlan,
  type CacheInvalidationResolvers,
  type CacheInvalidationResource,
} from "./invalidation-plan";

export interface ExecutedCacheInvalidation extends CacheInvalidationPlan {
  dryRun: boolean;
  directKeysPurged: number;
}

export async function executeCacheInvalidation(input: {
  storeId: string;
  resources: CacheInvalidationResource[];
  resolvers?: CacheInvalidationResolvers;
  dryRun?: boolean;
}): Promise<ExecutedCacheInvalidation> {
  const plan = await buildCacheInvalidationPlan({
    storeId: input.storeId,
    resources: input.resources,
    resolvers: input.resolvers,
  });

  const dryRun = input.dryRun ?? false;
  if (dryRun) {
    return {
      ...plan,
      dryRun: true,
      directKeysPurged: 0,
    };
  }

  await invalidateByTags(plan.tags);

  let directKeysPurged = 0;
  if (plan.directKeys.length > 0) {
    try {
      const cache = (caches as any).default as Cache;
      const results = await Promise.all(
        plan.directKeys.map((key) =>
          cache.delete(new Request(key)).catch(() => false),
        ),
      );
      directKeysPurged = results.filter(Boolean).length;
    } catch {
      // Cache API unavailable or failed - non-fatal.
    }
  }

  return {
    ...plan,
    dryRun: false,
    directKeysPurged,
  };
}
