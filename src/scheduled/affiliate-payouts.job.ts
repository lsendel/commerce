import { createDb } from "../infrastructure/db/client";
import type { Env } from "../env";
import { AffiliateRepository } from "../infrastructure/repositories/affiliate.repository";
import { ProcessPayoutsUseCase } from "../application/affiliates/process-payouts.usecase";
import { stores } from "../infrastructure/db/schema";

export async function runAffiliatePayouts(env: Env) {
  const db = createDb(env.DATABASE_URL);

  // Process payouts for each active store
  const activeStores = await db.select().from(stores);

  let totalPayouts = 0;
  for (const store of activeStores) {
    const affiliateRepo = new AffiliateRepository(db, store.id);
    const useCase = new ProcessPayoutsUseCase(affiliateRepo);
    const payouts = await useCase.execute();
    totalPayouts += payouts.length;
  }

  return { processedPayouts: totalPayouts };
}
