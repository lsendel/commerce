export type StockConfidenceLevel = "out" | "low" | "healthy";

export interface StockConfidence {
  level: StockConfidenceLevel;
  inventoryQuantity: number;
  urgency: boolean;
  message: string;
  etaMessage: string | null;
}

export function getStockConfidence(
  inventoryQuantity: number | null | undefined,
  estimatedProductionDays: number | null | undefined,
): StockConfidence {
  const inventory = Math.max(0, Number(inventoryQuantity ?? 0));
  const productionDays = Number(estimatedProductionDays ?? 0);

  if (inventory <= 0) {
    return {
      level: "out",
      inventoryQuantity: 0,
      urgency: true,
      message: "Currently unavailable",
      etaMessage:
        productionDays > 0
          ? `Expected availability in about ${productionDays} day(s).`
          : "Restock timing unavailable.",
    };
  }

  if (inventory <= 5) {
    return {
      level: "low",
      inventoryQuantity: inventory,
      urgency: true,
      message: `Hurry! Only ${inventory} left in stock.`,
      etaMessage:
        productionDays > 0
          ? `Ships in about ${productionDays}-${productionDays + 2} days.`
          : "Ships soon.",
    };
  }

  return {
    level: "healthy",
    inventoryQuantity: inventory,
    urgency: false,
    message: "In stock",
    etaMessage:
      productionDays > 0
        ? `Ships in about ${productionDays}-${productionDays + 2} days.`
        : null,
  };
}
