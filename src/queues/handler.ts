import type { Env } from "../env";
import { handleAiGenerationMessage } from "./ai-generation.consumer";
import {
  compensateOrderFulfillmentFailure,
  handleOrderFulfillmentMessage,
} from "./order-fulfillment.consumer";
import {
  compensateNotificationFailure,
  handleNotificationMessage,
} from "./notification.consumer";
import {
  QUEUE_WORKFLOW_POLICIES,
  computeRetryBackoffMs,
  isManagedQueueName,
  isRetryableWorkflowError,
  resolveQueueMessageAttempt,
} from "./orchestration-policy";
import { processDeadLetterCandidate } from "./dlq-remediation";

export async function handleQueue(
  batch: MessageBatch,
  env: Env,
  ctx: ExecutionContext,
) {
  void ctx;

  for (const message of batch.messages) {
    if (!isManagedQueueName(batch.queue)) {
      console.warn(`[queue-handler] Unknown queue: ${batch.queue}`);
      message.ack();
      continue;
    }

    const policy = QUEUE_WORKFLOW_POLICIES[batch.queue];
    const attempt = resolveQueueMessageAttempt(message);

    try {
      switch (batch.queue) {
        case "ai-generation":
          await handleAiGenerationMessage(
            message as Message<any>,
            env,
          );
          break;
        case "order-fulfillment":
          await handleOrderFulfillmentMessage(message, env);
          break;
        case "notifications":
          await handleNotificationMessage(message, env);
          break;
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      const retryable = isRetryableWorkflowError(error);

      if (retryable && attempt < policy.maxAttempts) {
        const recommendedBackoffMs = computeRetryBackoffMs(policy, attempt);
        console.error(
          `[queue-handler] ${batch.queue} retriable failure (attempt ${attempt}/${policy.maxAttempts}, backoff~${recommendedBackoffMs}ms): ${reason}`,
        );
        message.retry();
        continue;
      }

      console.error(
        `[queue-handler] ${batch.queue} terminal failure (attempt ${attempt}/${policy.maxAttempts}): ${reason}`,
      );

      const remediation = await processDeadLetterCandidate({
        env,
        queue: batch.queue,
        payload: message.body,
        retryable,
        reason,
      });
      if (remediation.executed) {
        console.log(
          `[queue-handler] ${batch.queue} dead-letter auto-remediation executed: ${remediation.executionReason}`,
        );
        message.ack();
        continue;
      }

      if (batch.queue === "notifications") {
        await compensateNotificationFailure({
          env,
          message,
          reason,
          attempt,
        });
      } else if (batch.queue === "order-fulfillment") {
        const body = (message.body ?? {}) as {
          storeId?: string;
          fulfillmentRequestId?: string;
        };
        await compensateOrderFulfillmentFailure({
          env,
          storeId: body.storeId,
          fulfillmentRequestId: body.fulfillmentRequestId,
          reason: `queue_handler_terminal_failure: ${reason}`,
        });
      }

      message.ack();
    }
  }
}
