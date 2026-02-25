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
