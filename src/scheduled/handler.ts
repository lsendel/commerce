import type { Env } from "../env";
import { runBookingReminders } from "./booking-reminders.job";
import { runCatalogSync } from "./catalog-sync.job";
import { runExpireBookingRequests } from "./expire-booking-requests.job";
import { runStockCheck } from "./stock-check.job";
import { runAbandonedCartDetection } from "./abandoned-cart.job";
import { runBirthdayEmails } from "./birthday-emails.job";
import { runMockupPolling } from "./mockup-polling.job";
import { runAffiliatePayouts } from "./affiliate-payouts.job";

export async function handleScheduled(
  ctrl: ScheduledController,
  env: Env,
  ctx: ExecutionContext,
) {
  switch (ctrl.cron) {
    case "0 0 * * *": // Daily at midnight UTC
      ctx.waitUntil(runBookingReminders(env));
      ctx.waitUntil(runBirthdayEmails(env));
      break;
    case "0 0 1 * *": // 1st of month at midnight — affiliate payouts
      ctx.waitUntil(runAffiliatePayouts(env));
      break;
    case "0 * * * *": // Every 1 hour
      ctx.waitUntil(runAbandonedCartDetection(env));
      break;
    case "0 */4 * * *": // Every 4 hours
      ctx.waitUntil(runCatalogSync(env));
      break;
    case "*/5 * * * *": // Every 5 minutes
      ctx.waitUntil(runExpireBookingRequests(env));
      break;
    case "*/10 * * * *": // Every 10 minutes
      ctx.waitUntil(runMockupPolling(env));
      break;
    case "*/15 * * * *": // Every 15 minutes
      ctx.waitUntil(runStockCheck(env));
      break;
  }
}
