import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Env } from "../../env";
import { createDb } from "../../infrastructure/db/client";
import { CurrencyRepository } from "../../infrastructure/repositories/currency.repository";
import { requireAuth } from "../../middleware/auth.middleware";
import { cacheResponse } from "../../middleware/cache.middleware";

const currency = new Hono<{ Bindings: Env }>();

// GET /currency/rates — public, cached for 1 hour
currency.get(
  "/currency/rates",
  cacheResponse({ ttl: 3600, tags: ["currency:rates"] }),
  zValidator(
    "query",
    z.object({
      base: z.string().length(3).toUpperCase().optional(),
    }),
  ),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;
    const repo = new CurrencyRepository(db, storeId);
    const { base } = c.req.valid("query");

    const baseCurrency = base ?? "USD";
    const rates = await repo.getRates(baseCurrency);

    return c.json(
      {
        rates: rates.map((r) => ({
          id: r.id,
          baseCurrency: r.baseCurrency,
          targetCurrency: r.targetCurrency,
          rate: Number(r.rate),
          source: r.source,
          fetchedAt: r.fetchedAt?.toISOString() ?? new Date().toISOString(),
        })),
        baseCurrency,
      },
      200,
    );
  },
);

// PATCH /currency/config — admin only
currency.patch(
  "/currency/config",
  requireAuth(),
  zValidator(
    "json",
    z.object({
      baseCurrency: z.string().length(3).toUpperCase().optional(),
      enabledCurrencies: z
        .array(z.string().length(3).toUpperCase())
        .min(1)
        .optional(),
      displayFormat: z.enum(["symbol", "code", "symbol_code"]).optional(),
      autoDetectLocale: z.boolean().optional(),
    }),
  ),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;
    const repo = new CurrencyRepository(db, storeId);
    const body = c.req.valid("json");

    const config = await repo.updateStoreConfig(body);

    if (!config) {
      return c.json({ error: "Failed to update currency configuration" }, 500);
    }

    return c.json(
      {
        config: {
          id: config.id,
          storeId: config.storeId,
          baseCurrency: config.baseCurrency,
          enabledCurrencies: config.enabledCurrencies,
          displayFormat: config.displayFormat,
          autoDetectLocale: config.autoDetectLocale,
          createdAt: config.createdAt?.toISOString() ?? new Date().toISOString(),
        },
      },
      200,
    );
  },
);

export { currency as currencyRoutes };
