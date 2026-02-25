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
