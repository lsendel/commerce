export interface InventoryLevel {
  quantity: number;
  reserved: number;
}

export function availableCount(level: InventoryLevel): number {
  return Math.max(0, level.quantity - level.reserved);
}

export function isLowStock(level: InventoryLevel, threshold = 5): boolean {
  return availableCount(level) > 0 && availableCount(level) <= threshold;
}

export function isOutOfStock(level: InventoryLevel): boolean {
  return availableCount(level) <= 0;
}
