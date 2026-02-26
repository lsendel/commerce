import type { DisplayFormat } from "./store-currency.entity";

/**
 * Convert a monetary amount from one currency to another using a pre-loaded rate map.
 *
 * The rate map keys are formatted as `${fromCurrency}_${toCurrency}`.
 * Returns the converted amount rounded to 2 decimal places.
 */
export function convertMoney(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Map<string, number>,
): number {
  if (fromCurrency === toCurrency) return amount;

  const rate = rates.get(`${fromCurrency}_${toCurrency}`);
  if (!rate) {
    throw new Error(
      `No exchange rate found for ${fromCurrency} \u2192 ${toCurrency}`,
    );
  }

  return Math.round(amount * rate * 100) / 100;
}

/** ISO 4217 currency symbol lookup for common currencies */
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "\u20AC",
  GBP: "\u00A3",
  JPY: "\u00A5",
  CAD: "CA$",
  AUD: "A$",
  CHF: "CHF",
  CNY: "\u00A5",
  INR: "\u20B9",
  MXN: "MX$",
  BRL: "R$",
  KRW: "\u20A9",
  SEK: "kr",
  NOK: "kr",
  DKK: "kr",
  NZD: "NZ$",
  SGD: "S$",
  HKD: "HK$",
  TRY: "\u20BA",
  ZAR: "R",
  PLN: "z\u0142",
  THB: "\u0E3F",
  ILS: "\u20AA",
  CZK: "K\u010D",
  PHP: "\u20B1",
  TWD: "NT$",
  RUB: "\u20BD",
};

/**
 * Format a monetary amount for display.
 *
 * @param amount  The numeric amount
 * @param currency  ISO 4217 currency code (e.g. "USD", "EUR")
 * @param displayFormat  How to render the currency identifier
 */
export function formatMoney(
  amount: number,
  currency: string,
  displayFormat: DisplayFormat = "symbol",
): string {
  const formatted = amount.toFixed(2);
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency;

  switch (displayFormat) {
    case "code":
      return `${formatted} ${currency}`;
    case "symbol_code":
      return `${symbol}${formatted} ${currency}`;
    case "symbol":
    default:
      return `${symbol}${formatted}`;
  }
}
