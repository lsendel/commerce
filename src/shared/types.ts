export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SortParams {
  field: string;
  direction: "asc" | "desc";
}

export type ProductType = "physical" | "digital" | "subscription" | "bookable";
export type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";
export type SubscriptionStatus = "active" | "past_due" | "cancelled" | "trialing" | "paused";
export type AvailabilityStatus = "available" | "full" | "in_progress" | "completed" | "closed" | "canceled";
export type BookingRequestStatus = "cart" | "pending_payment" | "confirmed" | "expired" | "cancelled";
export type BookingStatus = "confirmed" | "checked_in" | "cancelled" | "no_show";
export type PersonType = "adult" | "child" | "pet";
export type GenerationStatus = "queued" | "processing" | "completed" | "failed";
export type AiProvider = "gemini" | "flux";
export type ShipmentStatus = "pending" | "shipped" | "in_transit" | "delivered" | "returned";

// Platform
export type StoreStatus = "trial" | "active" | "suspended" | "deactivated";
export type StoreMemberRole = "owner" | "admin" | "staff";
export type PlatformRole = "super_admin" | "group_admin" | "user";
export type DomainVerificationStatus = "pending" | "verified" | "failed";
export type StoreBillingStatus = "active" | "past_due" | "cancelled" | "trialing";

// Fulfillment
export type FulfillmentProviderType = "printful" | "gooten" | "prodigi" | "shapeways";

// Affiliates
export type AffiliateStatus = "pending" | "approved" | "suspended";
export type ConversionStatus = "pending" | "approved" | "paid" | "rejected";
export type AttributionMethod = "link" | "coupon" | "tier";
export type PayoutStatus = "pending" | "processing" | "completed" | "failed";
