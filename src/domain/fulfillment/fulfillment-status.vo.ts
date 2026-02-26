import type { FulfillmentRequestStatus } from "./fulfillment-request.entity";

/**
 * Valid transitions for fulfillment request statuses.
 * Each key maps to the statuses it can transition to.
 */
const TRANSITIONS: Record<FulfillmentRequestStatus, FulfillmentRequestStatus[]> = {
  pending: ["submitted", "failed", "cancelled"],
  submitted: ["processing", "failed", "cancel_requested", "cancelled"],
  processing: ["shipped", "failed", "cancel_requested"],
  shipped: ["delivered"],
  delivered: [],
  cancel_requested: ["cancelled", "processing"],
  cancelled: [],
  failed: ["pending"],
};

export function canTransition(
  from: FulfillmentRequestStatus,
  to: FulfillmentRequestStatus,
): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function isTerminal(status: FulfillmentRequestStatus): boolean {
  return status === "delivered" || status === "cancelled";
}

export function canRetry(status: FulfillmentRequestStatus): boolean {
  return status === "failed";
}

export function canCancel(status: FulfillmentRequestStatus): boolean {
  return status === "pending" || status === "submitted" || status === "processing";
}
