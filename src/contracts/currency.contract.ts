import { initContract } from "@ts-rest/core";
import { z } from "zod";

const c = initContract();

const exchangeRateSchema = z.object({
  id: z.string(),
  baseCurrency: z.string(),
  targetCurrency: z.string(),
  rate: z.number(),
  source: z.string(),
  fetchedAt: z.string(),
});

const storeCurrencyConfigSchema = z.object({
  id: z.string(),
  storeId: z.string(),
  baseCurrency: z.string(),
  enabledCurrencies: z.array(z.string()),
  displayFormat: z.string(),
  autoDetectLocale: z.boolean(),
  createdAt: z.string(),
});

export const updateCurrencyConfigSchema = z.object({
  baseCurrency: z.string().length(3).toUpperCase().optional(),
  enabledCurrencies: z.array(z.string().length(3).toUpperCase()).min(1).optional(),
  displayFormat: z.enum(["symbol", "code", "symbol_code"]).optional(),
  autoDetectLocale: z.boolean().optional(),
});

export const currencyContract = c.router({
  getRates: {
    method: "GET",
    path: "/api/currency/rates",
    query: z.object({
      base: z.string().length(3).toUpperCase().optional(),
    }),
    responses: {
      200: z.object({
        rates: z.array(exchangeRateSchema),
        baseCurrency: z.string(),
      }),
    },
  },
  updateConfig: {
    method: "PATCH",
    path: "/api/currency/config",
    body: updateCurrencyConfigSchema,
    responses: {
      200: z.object({ config: storeCurrencyConfigSchema }),
      401: z.object({ error: z.string() }),
    },
  },
});
