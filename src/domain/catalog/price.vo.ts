export interface Price {
  amount: string;
  currency: string;
}

export function createPrice(amount: string, currency = "USD"): Price {
  return { amount, currency };
}

export function formatPrice(price: Price): string {
  const num = Number(price.amount);
  if (Number.isNaN(num)) return `$0.00`;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: price.currency,
  }).format(num);
}

export function comparePrices(a: Price, b: Price): number {
  return Number(a.amount) - Number(b.amount);
}

export function applyDiscount(price: Price, percent: number): Price {
  const discounted = Number(price.amount) * (1 - percent / 100);
  return {
    amount: Math.max(0, discounted).toFixed(2),
    currency: price.currency,
  };
}
