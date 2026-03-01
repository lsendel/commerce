export interface DeliveryPromiseWindow {
  minDays: number | null | undefined;
  maxDays: number | null | undefined;
}

export interface DeliveryPromise {
  minDays: number;
  maxDays: number;
  label: string;
  confidence: "high" | "medium" | "low";
  source: "production+shipping" | "production-only";
}

interface BuildDeliveryPromiseInput {
  productionDays: number[];
  shippingWindows?: DeliveryPromiseWindow[];
}

function normalizePositiveDays(value: number | null | undefined): number | null {
  if (typeof value !== "number") return null;
  if (!Number.isFinite(value)) return null;
  if (value <= 0) return null;
  return Math.round(value);
}

export function buildDeliveryPromise(input: BuildDeliveryPromiseInput): DeliveryPromise | null {
  const productionDays = input.productionDays
    .map((value) => normalizePositiveDays(value))
    .filter((value): value is number => value !== null);

  if (productionDays.length === 0) {
    return null;
  }

  const prodMin = Math.min(...productionDays);
  const prodMax = Math.max(...productionDays);

  const windows = (input.shippingWindows ?? [])
    .map((window) => {
      const min = normalizePositiveDays(window.minDays);
      const max = normalizePositiveDays(window.maxDays);
      if (min === null && max === null) return null;
      return {
        min: min ?? max ?? 0,
        max: Math.max(max ?? min ?? 0, min ?? 0),
      };
    })
    .filter((value): value is { min: number; max: number } => value !== null);

  const shippingMin = windows.length > 0 ? Math.min(...windows.map((w) => w.min)) : 2;
  const shippingMax = windows.length > 0 ? Math.max(...windows.map((w) => w.max)) : 5;

  const minDays = Math.max(1, prodMin + shippingMin);
  const maxDays = Math.max(minDays, prodMax + shippingMax);
  const spread = maxDays - minDays;
  const hasShippingData = windows.length > 0;

  let confidence: DeliveryPromise["confidence"];
  if (spread <= 3) {
    confidence = "high";
  } else if (spread <= 6) {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  return {
    minDays,
    maxDays,
    label: hasShippingData ? "Delivery promise" : "Estimated delivery",
    confidence,
    source: hasShippingData ? "production+shipping" : "production-only",
  };
}
