export type OrderNoteType = "customer" | "internal" | "system";

export interface OrderNote {
  id: string;
  orderId: string;
  userId: string | null;
  type: OrderNoteType;
  content: string;
  createdAt: Date;
}

export function createOrderNote(
  params: Omit<OrderNote, "id" | "createdAt"> & { id?: string },
): OrderNote {
  return {
    ...params,
    id: params.id ?? crypto.randomUUID(),
    createdAt: new Date(),
  };
}
