import type { Env } from "../env";
import { handleAiGenerationMessage } from "./ai-generation.consumer";
import { handleOrderFulfillmentMessage } from "./order-fulfillment.consumer";
import { handleNotificationMessage } from "./notification.consumer";

export async function handleQueue(
  batch: MessageBatch,
  env: Env,
  ctx: ExecutionContext,
) {
  for (const message of batch.messages) {
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
        default:
          console.warn(`[queue-handler] Unknown queue: ${batch.queue}`);
          message.ack();
      }
    } catch (error) {
      console.error(`Queue ${batch.queue} error:`, error);
      message.retry();
    }
  }
}
