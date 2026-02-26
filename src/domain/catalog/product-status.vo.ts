export type ProductStatus = "draft" | "active" | "archived";

export function isVisible(status: ProductStatus): boolean {
  return status === "active";
}

export function canPurchaseByStatus(status: ProductStatus): boolean {
  return status === "active";
}

export function canEdit(status: ProductStatus): boolean {
  return status !== "archived";
}
