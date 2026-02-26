export type RefundStatus = "pending" | "processing" | "succeeded" | "failed";

export interface RefundRequest {
  id: string;
  storeId: string;
  orderId: string;
  fulfillmentRequestId: string | null;
  stripeRefundId: string | null;
  amount: number;
  currency: string;
  reason: string | null;
  status: RefundStatus;
  lineItems: RefundLineItem[] | null;
  createdAt: Date;
  processedAt: Date | null;
}

export interface RefundLineItem {
  orderItemId: string;
  quantity: number;
  amount: number;
}

export function createRefundRequest(
  params: Omit<RefundRequest, "id" | "status" | "stripeRefundId" | "createdAt" | "processedAt"> & {
    id?: string;
    status?: RefundStatus;
    stripeRefundId?: string | null;
  },
): RefundRequest {
  return {
    ...params,
    id: params.id ?? crypto.randomUUID(),
    status: params.status ?? "pending",
    stripeRefundId: params.stripeRefundId ?? null,
    createdAt: new Date(),
    processedAt: null,
  };
}
