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

export interface AbandonedCartData {
  userName: string;
  cartId: string;
  itemCount: number;
}

export interface BirthdayOfferData {
  userName: string;
  petName: string;
  offerCode: string;
}

export class EmailAdapter {
  private appName: string;
  private appUrl: string;
  private apiKey: string | undefined;

  constructor(env: Env) {
    this.appName = env.APP_NAME ?? "petm8.io";
    this.appUrl = env.APP_URL ?? "https://petm8.io";
    this.apiKey = env.RESEND_API_KEY;
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.apiKey) {
      console.log(`[email-adapter] No RESEND_API_KEY — skipping email to=${to} subject="${subject}"`);
      return;
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${this.appName} <noreply@${new URL(this.appUrl).hostname}>`,
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`[email-adapter] Resend error: ${response.status} ${err}`);
    }
  }

  async sendBookingReminder(to: string, data: BookingReminderData): Promise<void> {
    await this.send(to,
      `Reminder: Your booking is tomorrow!`,
      `<h2>Hi ${data.userName},</h2>
       <p>This is a reminder that your booking on <strong>${data.slotDate}</strong> at <strong>${data.slotTime}</strong> is coming up tomorrow.</p>
       <p>See you there!</p>`,
    );
  }

  async sendOrderConfirmation(to: string, data: OrderConfirmationData): Promise<void> {
    await this.send(to,
      `Order Confirmed — #${data.orderId.slice(0, 8)}`,
      `<h2>Thanks for your order, ${data.userName}!</h2>
       <p>Your order of ${data.itemCount} item(s) totaling <strong>$${data.total}</strong> has been confirmed.</p>
       <p>Order ID: ${data.orderId}</p>`,
    );
  }

  async sendShipmentUpdate(to: string, data: ShipmentUpdateData): Promise<void> {
    await this.send(to,
      `Shipment Update — ${data.status}`,
      `<h2>Hi ${data.userName},</h2>
       <p>Your order #${data.orderId.slice(0, 8)} has a shipping update:</p>
       <p><strong>Status:</strong> ${data.status}<br>
       <strong>Carrier:</strong> ${data.carrier}<br>
       <strong>Tracking:</strong> <a href="${data.trackingUrl}">${data.trackingNumber}</a></p>`,
    );
  }

  async sendAbandonedCart(to: string, data: AbandonedCartData): Promise<void> {
    await this.send(to,
      `You left something behind!`,
      `<h2>Hi ${data.userName},</h2>
       <p>You have ${data.itemCount} item(s) waiting in your cart.</p>
       <p><a href="${this.appUrl}/cart">Complete your purchase</a></p>`,
    );
  }

  async sendBirthdayOffer(to: string, data: BirthdayOfferData): Promise<void> {
    await this.send(to,
      `Happy Birthday, ${data.petName}!`,
      `<h2>Hi ${data.userName},</h2>
       <p>It's <strong>${data.petName}'s</strong> birthday! To celebrate, here's a special offer:</p>
       <p>Use code <strong>${data.offerCode}</strong> for a discount on your next order.</p>
       <p><a href="${this.appUrl}">Shop now</a></p>`,
    );
  }
}
