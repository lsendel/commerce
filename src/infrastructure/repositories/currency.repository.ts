import { eq } from "drizzle-orm";
import type { Database } from "../db/client";
import { exchangeRates, storeCurrencies } from "../db/schema";

export class CurrencyRepository {
  constructor(
    private db: Database,
    private storeId: string,
  ) {}

  /**
   * Insert or update an exchange rate.
   * Uses ON CONFLICT (base_currency, target_currency) DO UPDATE.
   */
  async upsertRate(
    baseCurrency: string,
    targetCurrency: string,
    rate: string,
    source: string,
  ) {
    const now = new Date();

    const rows = await this.db
      .insert(exchangeRates)
      .values({
        baseCurrency,
        targetCurrency,
        rate,
        source,
        fetchedAt: now,
      })
      .onConflictDoUpdate({
        target: [exchangeRates.baseCurrency, exchangeRates.targetCurrency],
        set: {
          rate,
          source,
          fetchedAt: now,
        },
      })
      .returning();

    return rows[0] ?? null;
  }

  /**
   * Get all exchange rates, optionally filtered by base currency.
   */
  async getRates(baseCurrency?: string) {
    if (baseCurrency) {
      return this.db
        .select()
        .from(exchangeRates)
        .where(eq(exchangeRates.baseCurrency, baseCurrency));
    }

    return this.db.select().from(exchangeRates);
  }

  /**
   * Build a rate map for the currency converter service.
   * Returns Map<string, number> with keys like "USD_EUR".
   */
  async getRateMap(baseCurrency: string): Promise<Map<string, number>> {
    const rates = await this.getRates(baseCurrency);
    const map = new Map<string, number>();

    for (const rate of rates) {
      map.set(
        `${rate.baseCurrency}_${rate.targetCurrency}`,
        Number(rate.rate),
      );
    }

    return map;
  }

  /**
   * Get the store's currency configuration.
   */
  async getStoreConfig() {
    const rows = await this.db
      .select()
      .from(storeCurrencies)
      .where(eq(storeCurrencies.storeId, this.storeId))
      .limit(1);

    return rows[0] ?? null;
  }

  /**
   * Upsert the store's currency configuration.
   */
  async updateStoreConfig(data: {
    baseCurrency?: string;
    enabledCurrencies?: string[];
    displayFormat?: string;
    autoDetectLocale?: boolean;
  }) {
    // Check if config exists
    const existing = await this.getStoreConfig();

    if (existing) {
      const rows = await this.db
        .update(storeCurrencies)
        .set({
          ...(data.baseCurrency !== undefined && {
            baseCurrency: data.baseCurrency,
          }),
          ...(data.enabledCurrencies !== undefined && {
            enabledCurrencies: data.enabledCurrencies,
          }),
          ...(data.displayFormat !== undefined && {
            displayFormat: data.displayFormat,
          }),
          ...(data.autoDetectLocale !== undefined && {
            autoDetectLocale: data.autoDetectLocale,
          }),
        })
        .where(eq(storeCurrencies.storeId, this.storeId))
        .returning();

      return rows[0] ?? null;
    }

    const rows = await this.db
      .insert(storeCurrencies)
      .values({
        storeId: this.storeId,
        baseCurrency: data.baseCurrency ?? "USD",
        enabledCurrencies: data.enabledCurrencies ?? ["USD"],
        displayFormat: data.displayFormat ?? "symbol",
        autoDetectLocale: data.autoDetectLocale ?? true,
      })
      .returning();

    return rows[0] ?? null;
  }
}
