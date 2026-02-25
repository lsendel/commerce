import type { Product } from "./product.entity";

export interface Collection {
  id: string;
  name: string;
  slug: string;
  description: string;
  seoTitle: string | null;
  seoDescription: string | null;
  imageUrl: string | null;

  /** Optional include */
  products?: Product[];
}

export function createCollection(
  params: Omit<Collection, "seoTitle" | "seoDescription" | "imageUrl" | "products"> & {
    seoTitle?: string | null;
    seoDescription?: string | null;
    imageUrl?: string | null;
  }
): Collection {
  return {
    ...params,
    seoTitle: params.seoTitle ?? null,
    seoDescription: params.seoDescription ?? null,
    imageUrl: params.imageUrl ?? null,
  };
}
