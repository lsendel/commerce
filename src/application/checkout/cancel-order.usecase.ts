import type { Database } from "../../infrastructure/db/client";
import type { OrderRepository } from "../../infrastructure/repositories/order.repository";
import { FulfillmentRequestRepository } from "../../infrastructure/repositories/fulfillment-request.repository";
import { createFulfillmentProvider } from "../../infrastructure/fulfillment/provider-factory";
import { ResolveSecretUseCase } from "../platform/resolve-secret.usecase";
import { IntegrationRepository, IntegrationSecretRepository } from "../../infrastructure/repositories/integration.repository";
import { CANCELLABLE_STATUSES } from "../../domain/fulfillment/fulfillment-request.entity";
import type { FulfillmentProviderType } from "../../shared/types";
import type { IntegrationProvider } from "../../domain/platform/integration.entity";
import type { Env } from "../../env";
import { NotFoundError, ValidationError, ForbiddenError } from "../../shared/errors";

interface CancelOrderInput {
  orderId: string;
  userId: string;
  reason?: string;
  env: Env;
}

export class CancelOrderUseCase {
  constructor(
    private orderRepo: OrderRepository,
    private db: Database,
    private storeId: string,
  ) {}

  async execute(input: CancelOrderInput) {
    const { orderId, userId, reason, env } = input;

    // 1. Verify order belongs to user and is cancellable
    const order = await this.orderRepo.findById(orderId, userId);
    if (!order) {
      throw new NotFoundError("Order", orderId);
    }

    if (order.status === "cancelled" || order.status === "refunded") {
      throw new ValidationError("Order is already cancelled or refunded");
    }
    if (order.status === "delivered") {
      throw new ValidationError("Cannot cancel a delivered order");
    }

    const requestRepo = new FulfillmentRequestRepository(this.db, this.storeId);
    const requests = await requestRepo.findByOrderId(orderId);

    const cancelledRequests: string[] = [];
    const failedRequests: { id: string; reason: string }[] = [];
    let refundableAmount = 0;

    // 2. Process each fulfillment request
    for (const request of requests) {
      const status = request.status ?? "pending";

      if (!CANCELLABLE_STATUSES.includes(status as any)) {
        // Already shipped/delivered — can't cancel
        failedRequests.push({
          id: request.id,
          reason: `Cannot cancel request in ${status} status`,
        });
        continue;
      }

      if (status === "pending") {
        // Not yet sent to provider — cancel locally
        await requestRepo.updateStatus(request.id, "cancelled");
        cancelledRequests.push(request.id);
        refundableAmount += Number(request.costEstimatedTotal ?? 0);
        continue;
      }

      // Submitted or processing — need to call provider
      if (request.externalId) {
        try {
          const integrationRepo = new IntegrationRepository(this.db);
          const secretRepo = new IntegrationSecretRepository(this.db);
          const resolveSecret = new ResolveSecretUseCase(integrationRepo, secretRepo);
          const apiKey = await resolveSecret.execute(
            request.provider as IntegrationProvider,
            "api_key",
            env,
            this.storeId,
          );

          if (apiKey) {
            const provider = createFulfillmentProvider(
              request.provider as FulfillmentProviderType,
              { apiKey },
            );
            await provider.cancelOrder(request.externalId);
          }

          await requestRepo.updateStatus(request.id, "cancelled");
          cancelledRequests.push(request.id);
          refundableAmount += Number(request.costActualTotal ?? request.costEstimatedTotal ?? 0);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          await requestRepo.updateStatus(request.id, "cancel_requested", {
            errorMessage: `Cancel attempt failed: ${message}`,
          });
          failedRequests.push({ id: request.id, reason: message });
        }
      } else {
        // No external ID but submitted status — cancel locally
        await requestRepo.updateStatus(request.id, "cancelled");
        cancelledRequests.push(request.id);
      }
    }

    // 3. Update order status
    const allCancelled = failedRequests.length === 0 && requests.length > 0;
    if (allCancelled || requests.length === 0) {
      await this.orderRepo.updateStatus(orderId, "cancelled");
    }

    // 4. Compute message
    let message: string;
    if (cancelledRequests.length === requests.length) {
      message = "Order cancelled successfully";
    } else if (cancelledRequests.length > 0) {
      message = `Partially cancelled: ${cancelledRequests.length}/${requests.length} requests cancelled`;
    } else if (requests.length === 0) {
      message = "Order cancelled (no fulfillment requests)";
    } else {
      message = "Cancellation failed for all fulfillment requests";
    }

    return {
      success: failedRequests.length === 0,
      cancelledRequests,
      failedRequests,
      refundAmount: refundableAmount,
      message,
    };
  }
}
