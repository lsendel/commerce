import type { FulfillmentRequestRepository } from "../../infrastructure/repositories/fulfillment-request.repository";

interface RetryFilters {
  provider?: string;
}

interface RetryResult {
  retriedCount: number;
  requestIds: string[];
}

export class RetryFulfillmentBatchUseCase {
  constructor(
    private fulfillmentRepo: FulfillmentRequestRepository,
    private queue: { send(message: { body: unknown }): Promise<void> } | null,
  ) {}

  async execute(filters: RetryFilters = {}): Promise<RetryResult> {
    const failedRequests = await this.fulfillmentRepo.findFailed(filters.provider);

    const retriedIds: string[] = [];

    for (const request of failedRequests) {
      await this.fulfillmentRepo.updateStatus(request.id, "pending", {
        errorMessage: "",
      });

      if (this.queue) {
        await this.queue.send({
          body: {
            type: "retry_fulfillment",
            fulfillmentRequestId: request.id,
            orderId: request.orderId,
            provider: request.provider,
          },
        });
      }

      retriedIds.push(request.id);
    }

    return {
      retriedCount: retriedIds.length,
      requestIds: retriedIds,
    };
  }
}
