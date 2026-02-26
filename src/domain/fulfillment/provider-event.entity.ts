export interface ProviderEvent {
  id: string;
  storeId: string;
  provider: string;
  externalEventId: string | null;
  externalOrderId: string | null;
  eventType: string;
  payload: unknown;
  receivedAt: Date;
  processedAt: Date | null;
  errorMessage: string | null;
}
