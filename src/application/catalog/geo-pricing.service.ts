import type { CurrencyRepository } from "../../infrastructure/repositories/currency.repository";

const EURO_COUNTRIES = new Set([
  "AT",
  "BE",
  "CY",
  "DE",
  "EE",
  "ES",
  "FI",
  "FR",
  "GR",
  "HR",
  "IE",
  "IT",
  "LT",
  "LU",
  "LV",
  "MT",
  "NL",
  "PT",
  "SI",
  "SK",
]);

const COUNTRY_TO_CURRENCY: Record<string, string> = {
  US: "USD",
  CA: "CAD",
  GB: "GBP",
  AU: "AUD",
  NZ: "NZD",
  JP: "JPY",
  CH: "CHF",
  SE: "SEK",
  NO: "NOK",
  DK: "DKK",
};

export interface GeoPricingContext {
  enabled: boolean;
  country: string | null;
  requestedCurrency: string | null;
  currency: string;
  baseCurrency: string;
  exchangeRate: number;
  autoDetected: boolean;
}

function normalizeCountryCode(value: string | null | undefined) {
  const code = String(value ?? "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : null;
}

function normalizeCurrencyCode(value: string | null | undefined) {
  const code = String(value ?? "").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : null;
}

function resolveCurrencyFromCountry(country: string | null) {
  if (!country) return null;
  if (EURO_COUNTRIES.has(country)) return "EUR";
  return COUNTRY_TO_CURRENCY[country] ?? null;
}

function toNumber(input: unknown) {
  const value = Number(input);
  return Number.isFinite(value) ? value : null;
}

function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

export function resolveCountryFromRequest(c: any, explicitCountry?: string) {
  const queryCountry = normalizeCountryCode(explicitCountry);
  if (queryCountry) return queryCountry;

  const headerCountry = normalizeCountryCode(
    c.req.header("CF-IPCountry") ??
      c.req.header("X-Vercel-IP-Country") ??
      c.req.header("CloudFront-Viewer-Country"),
  );
  if (headerCountry) return headerCountry;

  return normalizeCountryCode((c.req.raw as any)?.cf?.country);
}

export async function resolveGeoPricingContext(
  currencyRepo: CurrencyRepository,
  input: {
    enabled: boolean;
    queryCurrency?: string;
    queryCountry?: string;
    requestCountry?: string | null;
  },
): Promise<GeoPricingContext> {
  const fallbackContext: GeoPricingContext = {
    enabled: false,
    country: normalizeCountryCode(input.queryCountry ?? input.requestCountry) ?? null,
    requestedCurrency: normalizeCurrencyCode(input.queryCurrency),
    currency: "USD",
    baseCurrency: "USD",
    exchangeRate: 1,
    autoDetected: false,
  };

  if (!input.enabled) {
    return fallbackContext;
  }

  const config = await currencyRepo.getStoreConfig();
  const baseCurrency = normalizeCurrencyCode(config?.baseCurrency) ?? "USD";
  const enabledCurrenciesRaw = Array.isArray(config?.enabledCurrencies)
    ? config.enabledCurrencies
    : [baseCurrency];
  const enabledCurrencies = [...new Set(
    enabledCurrenciesRaw
      .map((entry) => normalizeCurrencyCode(String(entry)))
      .filter((entry): entry is string => entry !== null),
  )];
  if (!enabledCurrencies.includes(baseCurrency)) {
    enabledCurrencies.unshift(baseCurrency);
  }

  const country = normalizeCountryCode(input.queryCountry ?? input.requestCountry) ?? null;
  const requestedCurrency = normalizeCurrencyCode(input.queryCurrency);
  const autoCurrency = resolveCurrencyFromCountry(country);
  const autoDetected = !requestedCurrency && Boolean(config?.autoDetectLocale) && Boolean(autoCurrency);
  let candidate = requestedCurrency ?? (autoDetected ? autoCurrency : null) ?? baseCurrency;

  if (!candidate || !enabledCurrencies.includes(candidate)) {
    candidate = baseCurrency;
  }

  let exchangeRate = 1;
  let currency = candidate;

  if (candidate !== baseCurrency) {
    const rates = await currencyRepo.getRates(baseCurrency);
    const match = rates.find(
      (rate) => normalizeCurrencyCode(rate.targetCurrency) === candidate,
    );
    const parsedRate = toNumber(match?.rate);

    if (parsedRate && parsedRate > 0) {
      exchangeRate = parsedRate;
    } else {
      currency = baseCurrency;
      exchangeRate = 1;
    }
  }

  return {
    enabled: true,
    country,
    requestedCurrency,
    currency,
    baseCurrency,
    exchangeRate,
    autoDetected,
  };
}

export function convertDisplayPriceToBase(
  amount: number | undefined,
  context: GeoPricingContext,
) {
  if (amount === undefined) return undefined;
  if (!context.enabled || context.exchangeRate <= 0) return amount;
  if (context.currency === context.baseCurrency) return amount;
  return roundMoney(amount / context.exchangeRate);
}

function convertPriceValue(value: unknown, context: GeoPricingContext) {
  const numeric = toNumber(value);
  if (numeric === null) return value;
  if (!context.enabled || context.currency === context.baseCurrency) {
    return roundMoney(numeric);
  }
  return roundMoney(numeric * context.exchangeRate);
}

export function applyGeoPricingToProduct(product: any, context: GeoPricingContext): any {
  if (!product) return product;

  const variants = Array.isArray(product.variants)
    ? product.variants.map((variant: any) => ({
      ...variant,
      price: convertPriceValue(variant.price, context),
      compareAtPrice: variant.compareAtPrice == null
        ? null
        : convertPriceValue(variant.compareAtPrice, context),
    }))
    : product.variants;

  const priceRange = product.priceRange
    ? {
      min: convertPriceValue(product.priceRange.min, context),
      max: convertPriceValue(product.priceRange.max, context),
    }
    : product.priceRange;

  const relatedProducts: any[] | undefined = Array.isArray(product.relatedProducts)
    ? applyGeoPricingToProducts(product.relatedProducts, context)
    : product.relatedProducts;

  return {
    ...product,
    variants,
    priceRange,
    relatedProducts,
    pricing: {
      currency: context.currency,
      baseCurrency: context.baseCurrency,
      exchangeRate: context.exchangeRate,
      country: context.country,
      autoDetected: context.autoDetected,
    },
  };
}

export function applyGeoPricingToProducts(products: any[], context: GeoPricingContext): any[] {
  return products.map((product) => applyGeoPricingToProduct(product, context));
}
