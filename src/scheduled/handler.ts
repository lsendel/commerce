import type { Env } from "../env";
import { runBookingReminders } from "./booking-reminders.job";
import { runCatalogSync } from "./catalog-sync.job";
import { runExpireBookingRequests } from "./expire-booking-requests.job";
import { runStockCheck } from "./stock-check.job";

export async function handleScheduled(
  ctrl: ScheduledController,
  env: Env,
  ctx: ExecutionContext,
) {
  switch (ctrl.cron) {
    case "0 0 * * *": // Daily at midnight UTC
      ctx.waitUntil(runBookingReminders(env));
      break;
    case "0 */4 * * *": // Every 4 hours
      ctx.waitUntil(runCatalogSync(env));
      break;
    case "*/5 * * * *": // Every 5 minutes
      ctx.waitUntil(runExpireBookingRequests(env));
      break;
    case "*/15 * * * *": // Every 15 minutes
      ctx.waitUntil(runStockCheck(env));
      break;
  }
}
