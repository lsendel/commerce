export type FulfillmentRequestStatus =
  | "pending"
  | "submitted"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancel_requested"
  | "cancelled"
  | "failed";

export const CANCELLABLE_STATUSES: FulfillmentRequestStatus[] = [
  "pending",
  "submitted",
  "processing",
];

export const SUBMITTED_STATUSES: FulfillmentRequestStatus[] = [
  "submitted",
  "processing",
  "shipped",
];

export interface FulfillmentRequestItem {
  id: string;
  fulfillmentRequestId: string;
  orderItemId: string | null;
  providerLineId: string | null;
  quantity: number;
  status: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FulfillmentRequest {
  id: string;
  storeId: string;
  orderId: string;
  provider: string;
  providerId: string | null;
  externalId: string | null;
  status: FulfillmentRequestStatus;
  itemsSnapshot: unknown;
  costEstimatedTotal: string | null;
  costActualTotal: string | null;
  costShipping: string | null;
  costTax: string | null;
  currency: string;
  refundStripeId: string | null;
  refundAmount: string | null;
  refundStatus: string | null;
  errorMessage: string | null;
  submittedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  items?: FulfillmentRequestItem[];
}
