import type { Env } from "../../env";

export interface BookingReminderData {
  userName: string;
  bookingId: string;
  productId: string;
  slotDate: string;
  slotTime: string;
}

export interface OrderConfirmationData {
  userName: string;
  orderId: string;
  total: string;
  itemCount: number;
}

export interface ShipmentUpdateData {
  userName: string;
  orderId: string;
  carrier: string;
  trackingNumber: string;
  trackingUrl: string;
  status: string;
}

/**
 * Email adapter stub.
 *
 * In production (Phase 15 polish) this would integrate with a transactional
 * email provider such as Resend, Postmark, or Mailchannels via Cloudflare.
 * For now it logs the intent so the rest of the pipeline can be tested end-to-end.
 */
export class EmailAdapter {
  private appName: string;
  private appUrl: string;

  constructor(env: Env) {
    this.appName = env.APP_NAME ?? "petm8.io";
    this.appUrl = env.APP_URL ?? "https://petm8.io";
  }

  async sendBookingReminder(
    to: string,
    data: BookingReminderData,
  ): Promise<void> {
    console.log(
      `[email-adapter] STUB sendBookingReminder to=${to} ` +
        `booking=${data.bookingId} slot=${data.slotDate} ${data.slotTime} ` +
        `user=${data.userName}`,
    );

    // TODO (Phase 15): Replace with actual email send
    // Example with Resend:
    //
    // await resend.emails.send({
    //   from: `${this.appName} <noreply@${this.appUrl}>`,
    //   to,
    //   subject: `Reminder: Your booking is tomorrow!`,
    //   html: renderBookingReminderEmail(data),
    // });
  }

  async sendOrderConfirmation(
    to: string,
    data: OrderConfirmationData,
  ): Promise<void> {
    console.log(
      `[email-adapter] STUB sendOrderConfirmation to=${to} ` +
        `order=${data.orderId} total=${data.total} items=${data.itemCount} ` +
        `user=${data.userName}`,
    );

    // TODO (Phase 15): Replace with actual email send
  }

  async sendShipmentUpdate(
    to: string,
    data: ShipmentUpdateData,
  ): Promise<void> {
    console.log(
      `[email-adapter] STUB sendShipmentUpdate to=${to} ` +
        `order=${data.orderId} carrier=${data.carrier} ` +
        `tracking=${data.trackingNumber} status=${data.status} ` +
        `user=${data.userName}`,
    );

    // TODO (Phase 15): Replace with actual email send
  }
}
