import type { Env } from "../env";
import { EmailAdapter } from "../infrastructure/notifications/email.adapter";

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

type NotificationMessage =
  | BookingReminderNotification
  | OrderConfirmationNotification
  | ShipmentUpdateNotification;

export async function handleNotificationMessage(
  message: Message,
  env: Env,
): Promise<void> {
  const payload = message.body as NotificationMessage;
  const emailAdapter = new EmailAdapter(env);

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

    default:
      console.warn(
        `[notifications] Unknown notification type: ${(payload as { type: string }).type}`,
      );
  }

  message.ack();
}
