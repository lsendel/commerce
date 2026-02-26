import type { Env } from "../env";
import { createDb } from "../infrastructure/db/client";
import { exchangeRates } from "../infrastructure/db/schema";

interface ExchangeRateApiResponse {
  result: string;
  base_code: string;
  rates: Record<string, number>;
  time_last_update_utc: string;
}

/**
 * Daily cron job (6 AM UTC) that fetches the latest exchange rates
 * from the free Open Exchange Rates API and upserts them into the database.
 *
 * Source: https://open.er-api.com/v6/latest/USD
 */
export async function runSyncExchangeRates(env: Env): Promise<void> {
  const db = createDb(env.DATABASE_URL);

  const response = await fetch("https://open.er-api.com/v6/latest/USD");
  if (!response.ok) {
    console.error(
      `[sync-exchange-rates] API request failed: ${response.status} ${response.statusText}`,
    );
    return;
  }

  const data = (await response.json()) as ExchangeRateApiResponse;

  if (data.result !== "success") {
    console.error("[sync-exchange-rates] API returned non-success result");
    return;
  }

  const baseCurrency = data.base_code;
  const now = new Date();
  const source = "open.er-api.com";

  let upserted = 0;

  const entries = Object.entries(data.rates);
  for (const entry of entries) {
    const targetCurrency = entry[0];
    const rate = entry[1];

    if (!targetCurrency || rate === undefined) continue;
    if (targetCurrency === baseCurrency) continue;

    await db
      .insert(exchangeRates)
      .values({
        baseCurrency,
        targetCurrency,
        rate: rate.toString(),
        source,
        fetchedAt: now,
      })
      .onConflictDoUpdate({
        target: [exchangeRates.baseCurrency, exchangeRates.targetCurrency],
        set: {
          rate: rate.toString(),
          source,
          fetchedAt: now,
        },
      });

    upserted++;
  }

  console.log(
    `[sync-exchange-rates] Upserted ${upserted} exchange rates for ${baseCurrency}`,
  );
}
