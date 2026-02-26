import type { Variant } from "./variant.entity";
import type { Collection } from "./collection.entity";

export type ProductType = "physical" | "digital" | "subscription" | "bookable";

export interface ProductImage {
  id: string;
  url: string;
  altText: string;
  position: number;
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  description: string;
  productType: ProductType;
  vendor: string;
  status: "active" | "draft" | "archived";
  seoTitle: string | null;
  seoDescription: string | null;
  featuredImageUrl: string | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;

  /** Optional includes */
  variants?: Variant[];
  images?: ProductImage[];
  collections?: Collection[];
}

export function createProduct(
  params: Omit<Product, "createdAt" | "updatedAt" | "status"> & {
    status?: Product["status"];
  }
): Product {
  const now = new Date();
  return {
    ...params,
    status: params.status ?? "draft",
    createdAt: now,
    updatedAt: now,
  };
}

export function canPurchase(
  variant: Variant,
  product: Product,
): { ok: boolean; reason?: string } {
  if (product.status !== "active") {
    return { ok: false, reason: "Product is not available" };
  }
  if (!variant.availableForSale) {
    return { ok: false, reason: "Variant is not available for sale" };
  }
  if (variant.inventoryQuantity <= 0) {
    return { ok: false, reason: "Out of stock" };
  }
  return { ok: true };
}

export function canReview(
  userId: string,
  productId: string,
  purchasedProductIds: string[],
): boolean {
  return purchasedProductIds.includes(productId);
}
