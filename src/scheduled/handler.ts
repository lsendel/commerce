import type { Env } from "../env";
import { runBookingReminders } from "./booking-reminders.job";
import { runCatalogSync } from "./catalog-sync.job";
import { runExpireBookingRequests } from "./expire-booking-requests.job";
import { runStockCheck } from "./stock-check.job";
import { runAbandonedCartDetection } from "./abandoned-cart.job";
import { runBirthdayEmails } from "./birthday-emails.job";
import { runMockupPolling } from "./mockup-polling.job";
import { runAffiliatePayouts } from "./affiliate-payouts.job";
import { runIntegrationHealthChecks } from "./integration-health.job";
import { runGootenPolling } from "./gooten-polling.job";
import { runExpireInventoryReservations } from "./expire-inventory-reservations.job";
import { runRefreshCustomerSegments } from "./refresh-customer-segments.job";
import { runExpirePromotions } from "./expire-promotions.job";
import { runRollupAnalytics } from "./rollup-analytics.job";
import { runPushAnalyticsExternal } from "./push-analytics-external.job";
import { runSyncExchangeRates } from "./sync-exchange-rates.job";
import { resolveFeatureFlags } from "../shared/feature-flags";

export async function handleScheduled(
  ctrl: ScheduledController,
  env: Env,
  ctx: ExecutionContext,
) {
  const featureFlags = resolveFeatureFlags(env.FEATURE_FLAGS);

  switch (ctrl.cron) {
    case "0 0 * * *": // Daily at midnight UTC
      ctx.waitUntil(runBookingReminders(env));
      ctx.waitUntil(runBirthdayEmails(env));
      break;
    case "0 0 1 * *": // 1st of month at midnight — affiliate payouts
      ctx.waitUntil(runAffiliatePayouts(env));
      break;
    case "0 * * * *": // Every 1 hour
      if (featureFlags.checkout_recovery) {
        ctx.waitUntil(runAbandonedCartDetection(env));
      }
      ctx.waitUntil(runExpirePromotions(env));
      break;
    case "0 2 * * *": // Daily at 2am UTC — analytics rollup
      ctx.waitUntil(runRollupAnalytics(env));
      break;
    case "0 6 * * *": // Daily at 6am UTC — exchange rate sync
      ctx.waitUntil(runSyncExchangeRates(env));
      break;
    case "0 */6 * * *": // Every 6 hours — refresh customer segments
      ctx.waitUntil(runRefreshCustomerSegments(env));
      break;
    case "0 */4 * * *": // Every 4 hours
      ctx.waitUntil(runCatalogSync(env));
      break;
    case "*/5 * * * *": // Every 5 minutes
      ctx.waitUntil(runExpireBookingRequests(env));
      ctx.waitUntil(runGootenPolling(env));
      ctx.waitUntil(runExpireInventoryReservations(env));
      break;
    case "*/10 * * * *": // Every 10 minutes
      ctx.waitUntil(runMockupPolling(env));
      break;
    case "*/15 * * * *": // Every 15 minutes
      ctx.waitUntil(runStockCheck(env));
      ctx.waitUntil(runIntegrationHealthChecks(env));
      ctx.waitUntil(runPushAnalyticsExternal(env));
      break;
  }
}
