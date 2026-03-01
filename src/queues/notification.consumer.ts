import type { Env } from "../env";
import { EmailAdapter } from "../infrastructure/notifications/email.adapter";
import { MessageAdapter } from "../infrastructure/notifications/message.adapter";
import { createDb } from "../infrastructure/db/client";
import { analyticsEvents, users } from "../infrastructure/db/schema";
import { and, eq, isNotNull } from "drizzle-orm";

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
  const payload = message.body as NotificationMessage;
  const emailAdapter = new EmailAdapter(env);
  const messageAdapter = new MessageAdapter(env);

  switch (payload.type) {
    case "booking_reminder": {
      const { userEmail, userName, slotDate, slotTime, bookingId, productId } =
        payload.data;

      await emailAdapter.sendBookingReminder(userEmail, {
        userName,
        bookingId,
        productId,
        slotDate,
        slotTime,
      });

      console.log(
        `[notifications] Booking reminder sent to ${userEmail} for ${slotDate} ${slotTime}`,
      );
      break;
    }

    case "order_confirmation": {
      const { userEmail, userName, orderId, total, itemCount } = payload.data;

      await emailAdapter.sendOrderConfirmation(userEmail, {
        userName,
        orderId,
        total,
        itemCount,
      });

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

      await emailAdapter.sendShipmentUpdate(userEmail, {
        userName,
        orderId,
        carrier,
        trackingNumber,
        trackingUrl,
        status,
      });

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

      await emailAdapter.sendAbandonedCart(userEmail, {
        userName,
        cartId,
        itemCount,
      });

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
        await emailAdapter.sendCheckoutRecovery(userEmail, {
          stage,
          userName,
          cartId,
          itemCount,
          idleHours,
          recoveryUrl,
          incentiveCode: incentiveCode ?? null,
        });
        sent = true;
      } else if (!userPhone) {
        skipReason = "missing_phone";
      } else if (channel === "sms") {
        sent = await messageAdapter.sendCheckoutRecoverySms(userPhone, {
          stage,
          userName,
          itemCount,
          idleHours,
          recoveryUrl,
          incentiveCode: incentiveCode ?? null,
        });
        if (!sent) skipReason = "sms_not_configured_or_failed";
      } else if (channel === "whatsapp") {
        sent = await messageAdapter.sendCheckoutRecoveryWhatsApp(userPhone, {
          stage,
          userName,
          itemCount,
          idleHours,
          recoveryUrl,
          incentiveCode: incentiveCode ?? null,
        });
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

      await emailAdapter.sendBirthdayOffer(userEmail, {
        userName,
        petName,
        offerCode,
      });

      console.log(
        `[notifications] Birthday offer sent to ${userEmail} for pet ${petName}`,
      );
      break;
    }

    case "email_verification": {
      const verificationUrl = `${(env.APP_URL ?? "https://petm8.io").replace(/\/$/, "")}/auth/verify-email?token=${encodeURIComponent(payload.token)}`;
      const userName = payload.email.split("@")[0] || "there";
      await emailAdapter.sendEmailVerification(payload.email, {
        userName,
        verificationUrl,
      });

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
