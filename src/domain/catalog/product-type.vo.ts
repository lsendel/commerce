import type { ProductType } from "./product.entity";

export function isPhysical(type: ProductType): boolean {
  return type === "physical";
}

export function isDigital(type: ProductType): boolean {
  return type === "digital";
}

export function isBookable(type: ProductType): boolean {
  return type === "bookable";
}

export function isSubscription(type: ProductType): boolean {
  return type === "subscription";
}

export function requiresFulfillment(type: ProductType): boolean {
  return type === "physical";
}

export function requiresShipping(type: ProductType): boolean {
  return type === "physical";
}
