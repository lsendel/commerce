import type { Env } from "../env";
import { EmailAdapter } from "../infrastructure/notifications/email.adapter";
import { MessageAdapter } from "../infrastructure/notifications/message.adapter";
import { createDb } from "../infrastructure/db/client";
import { analyticsEvents, users } from "../infrastructure/db/schema";
import { and, eq, isNotNull } from "drizzle-orm";
import {
  QUEUE_WORKFLOW_POLICIES,
  withWorkflowTimeout,
} from "./orchestration-policy";

interface BookingReminderNotification {
  type: "booking_reminder";
  data: {
    bookingId: string;
    userId: string;
    userEmail: string;
    userName: string;
    slotDate: string;
    slotTime: string;
    productId: string;
  };
}

interface OrderConfirmationNotification {
  type: "order_confirmation";
  data: {
    orderId: string;
    userEmail: string;
    userName: string;
    total: string;
    itemCount: number;
  };
}

interface ShipmentUpdateNotification {
  type: "shipment_update";
  data: {
    orderId: string;
    userEmail: string;
    userName: string;
    carrier: string;
    trackingNumber: string;
    trackingUrl: string;
    status: string;
  };
}

interface AbandonedCartNotification {
  type: "abandoned_cart";
  data: {
    cartId: string;
    userId: string;
    userEmail: string;
    userName: string;
    itemCount: number;
  };
}

interface CheckoutRecoveryNotification {
  type: "checkout_recovery";
  data: {
    stage: "recovery_1h" | "recovery_24h" | "recovery_72h";
    channel: "email" | "sms" | "whatsapp";
    cartId: string;
    storeId: string;
    userId: string;
    userEmail: string;
    userPhone?: string | null;
    userName: string;
    itemCount: number;
    idleHours: number;
    recoveryUrl: string;
    incentiveCode?: string | null;
  };
}

interface BirthdayOfferNotification {
  type: "birthday_offer";
  data: {
    userId: string;
    userEmail: string;
    userName: string;
    petName: string;
    offerCode: string;
  };
}

interface EmailVerificationNotification {
  type: "email_verification";
  userId: string;
  email: string;
  token: string;
}

type NotificationMessage =
  | BookingReminderNotification
  | OrderConfirmationNotification
  | ShipmentUpdateNotification
  | AbandonedCartNotification
  | CheckoutRecoveryNotification
  | BirthdayOfferNotification
  | EmailVerificationNotification;

function resolveWorkflowSettings(env: Env) {
  const base = QUEUE_WORKFLOW_POLICIES.notifications;
  const timeoutOverride = Number(env.NOTIFICATION_WORKFLOW_TIMEOUT_MS ?? "");
  const timeoutMs =
    Number.isFinite(timeoutOverride) && timeoutOverride > 0
      ? Math.floor(timeoutOverride)
      : base.timeoutMs;

  return {
    ...base,
    timeoutMs,
  };
}

export async function compensateNotificationFailure(input: {
  env: Env;
  message: Message;
  reason: string;
  attempt?: number;
}) {
  const payload = input.message.body as Partial<CheckoutRecoveryNotification> & {
    type?: string;
    data?: Record<string, unknown>;
  };

  // The checkout-recovery path has store/user context, so we can persist a
  // terminal compensation event for observability and follow-up actions.
  if (payload.type === "checkout_recovery" && payload.data) {
    const storeId = String(payload.data.storeId ?? "");
    const userId = String(payload.data.userId ?? "");

    if (storeId && userId) {
      try {
        const db = createDb(input.env.DATABASE_URL);
        await db.insert(analyticsEvents).values({
          storeId,
          userId,
          eventType: "checkout_recovery_delivery_failed",
          properties: {
            reason: input.reason,
            attempt: input.attempt ?? null,
            stage: payload.data.stage ?? null,
            channel: payload.data.channel ?? null,
            cartId: payload.data.cartId ?? null,
            recoveryUrl: payload.data.recoveryUrl ?? null,
          },
        });
      } catch (error) {
        console.error(
          "[notifications] Failed to write compensation analytics event:",
          error,
        );
      }
    }
  }

  console.error(
    `[notifications] Terminal failure for type=${payload.type ?? "unknown"} reason=${input.reason}`,
  );
}

async function canSendMarketingMessage(env: Env, userId: string): Promise<boolean> {
  if (!userId) return false;
  const db = createDb(env.DATABASE_URL);
  const row = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.id, userId),
        eq(users.marketingOptIn, true),
        isNotNull(users.emailVerifiedAt),
      ),
    )
    .limit(1);
  return row.length > 0;
}

export async function handleNotificationMessage(
  message: Message,
  env: Env,
): Promise<void> {
  const workflowSettings = resolveWorkflowSettings(env);
  const payload = message.body as NotificationMessage;
  const emailAdapter = new EmailAdapter(env);
  const messageAdapter = new MessageAdapter(env);

  switch (payload.type) {
    case "booking_reminder": {
      const { userEmail, userName, slotDate, slotTime, bookingId, productId } =
        payload.data;

      await withWorkflowTimeout(
        emailAdapter.sendBookingReminder(userEmail, {
          userName,
          bookingId,
          productId,
          slotDate,
          slotTime,
        }),
        workflowSettings.timeoutMs,
        "notifications.booking_reminder",
      );

      console.log(
        `[notifications] Booking reminder sent to ${userEmail} for ${slotDate} ${slotTime}`,
      );
      break;
    }

    case "order_confirmation": {
      const { userEmail, userName, orderId, total, itemCount } = payload.data;

      await withWorkflowTimeout(
        emailAdapter.sendOrderConfirmation(userEmail, {
          userName,
          orderId,
          total,
          itemCount,
        }),
        workflowSettings.timeoutMs,
        "notifications.order_confirmation",
      );

      console.log(
        `[notifications] Order confirmation sent to ${userEmail} for order ${orderId}`,
      );
      break;
    }

    case "shipment_update": {
      const {
        userEmail,
        userName,
        orderId,
        carrier,
        trackingNumber,
        trackingUrl,
        status,
      } = payload.data;

      await withWorkflowTimeout(
        emailAdapter.sendShipmentUpdate(userEmail, {
          userName,
          orderId,
          carrier,
          trackingNumber,
          trackingUrl,
          status,
        }),
        workflowSettings.timeoutMs,
        "notifications.shipment_update",
      );

      console.log(
        `[notifications] Shipment update sent to ${userEmail} for order ${orderId} (${status})`,
      );
      break;
    }

    case "abandoned_cart": {
      const { userId, userEmail, userName, cartId, itemCount } = payload.data;
      const allowed = await canSendMarketingMessage(env, userId);
      if (!allowed) {
        console.log(
          `[notifications] Skipped abandoned cart email for ${userEmail} (marketing suppression)`,
        );
        break;
      }

      await withWorkflowTimeout(
        emailAdapter.sendAbandonedCart(userEmail, {
          userName,
          cartId,
          itemCount,
        }),
        workflowSettings.timeoutMs,
        "notifications.abandoned_cart",
      );

      console.log(
        `[notifications] Abandoned cart email sent to ${userEmail} for cart ${cartId}`,
      );
      break;
    }

    case "checkout_recovery": {
      const {
        stage,
        channel,
        cartId,
        storeId,
        userId,
        userEmail,
        userPhone,
        userName,
        itemCount,
        idleHours,
        recoveryUrl,
        incentiveCode,
      } = payload.data;
      const allowed = await canSendMarketingMessage(env, userId);
      if (!allowed) {
        console.log(
          `[notifications] Skipped checkout recovery for ${userEmail} (marketing suppression)`,
        );
        break;
      }

      const db = createDb(env.DATABASE_URL);
      let sent = false;
      let skipReason: string | null = null;

      if (channel === "email") {
        await withWorkflowTimeout(
          emailAdapter.sendCheckoutRecovery(userEmail, {
            stage,
            userName,
            cartId,
            itemCount,
            idleHours,
            recoveryUrl,
            incentiveCode: incentiveCode ?? null,
          }),
          workflowSettings.timeoutMs,
          "notifications.checkout_recovery.email",
        );
        sent = true;
      } else if (!userPhone) {
        skipReason = "missing_phone";
      } else if (channel === "sms") {
        sent = await withWorkflowTimeout(
          messageAdapter.sendCheckoutRecoverySms(userPhone, {
            stage,
            userName,
            itemCount,
            idleHours,
            recoveryUrl,
            incentiveCode: incentiveCode ?? null,
          }),
          workflowSettings.timeoutMs,
          "notifications.checkout_recovery.sms",
        );
        if (!sent) skipReason = "sms_not_configured_or_failed";
      } else if (channel === "whatsapp") {
        sent = await withWorkflowTimeout(
          messageAdapter.sendCheckoutRecoveryWhatsApp(userPhone, {
            stage,
            userName,
            itemCount,
            idleHours,
            recoveryUrl,
            incentiveCode: incentiveCode ?? null,
          }),
          workflowSettings.timeoutMs,
          "notifications.checkout_recovery.whatsapp",
        );
        if (!sent) skipReason = "whatsapp_not_configured_or_failed";
      }

      await db.insert(analyticsEvents).values({
        storeId,
        userId,
        eventType: sent ? "checkout_recovery_sent" : "checkout_recovery_skipped",
        properties: {
          stage,
          channel,
          cartId,
          itemCount,
          idleHours,
          incentiveCode: incentiveCode ?? null,
          recoveryUrl,
          reason: skipReason,
        },
      });

      if (sent) {
        console.log(
          `[notifications] Checkout recovery (${stage}/${channel}) sent to ${userEmail} for cart ${cartId}`,
        );
      } else {
        console.log(
          `[notifications] Checkout recovery (${stage}/${channel}) skipped for ${userEmail} (reason=${skipReason ?? "unknown"})`,
        );
      }
      break;
    }

    case "birthday_offer": {
      const { userId, userEmail, userName, petName, offerCode } = payload.data;
      const allowed = await canSendMarketingMessage(env, userId);
      if (!allowed) {
        console.log(
          `[notifications] Skipped birthday offer for ${userEmail} (marketing suppression)`,
        );
        break;
      }

      await withWorkflowTimeout(
        emailAdapter.sendBirthdayOffer(userEmail, {
          userName,
          petName,
          offerCode,
        }),
        workflowSettings.timeoutMs,
        "notifications.birthday_offer",
      );

      console.log(
        `[notifications] Birthday offer sent to ${userEmail} for pet ${petName}`,
      );
      break;
    }

    case "email_verification": {
      const verificationUrl = `${(env.APP_URL ?? "https://petm8.io").replace(/\/$/, "")}/auth/verify-email?token=${encodeURIComponent(payload.token)}`;
      const userName = payload.email.split("@")[0] || "there";
      await withWorkflowTimeout(
        emailAdapter.sendEmailVerification(payload.email, {
          userName,
          verificationUrl,
        }),
        workflowSettings.timeoutMs,
        "notifications.email_verification",
      );

      console.log(
        `[notifications] Email verification sent to ${payload.email}`,
      );
      break;
    }

    default:
      console.warn(
        `[notifications] Unknown notification type: ${(payload as { type: string }).type}`,
      );
  }

  message.ack();
}
