import type { Env } from "../../env";

export interface CheckoutRecoveryMessageData {
  stage: "recovery_1h" | "recovery_24h" | "recovery_72h";
  userName: string;
  itemCount: number;
  idleHours: number;
  recoveryUrl: string;
  incentiveCode?: string | null;
}

function normalizePhoneNumber(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (value.startsWith("+") && /^\+\d{8,15}$/.test(value)) {
    return value;
  }

  const digits = value.replace(/\D+/g, "");
  if (!digits) return null;
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }
  if (digits.length >= 8 && digits.length <= 15) {
    return `+${digits}`;
  }
  return null;
}

function buildRecoveryText(data: CheckoutRecoveryMessageData): string {
  const incentive = data.incentiveCode ? ` Use code ${data.incentiveCode} at checkout.` : "";
  switch (data.stage) {
    case "recovery_1h":
      return `Hi ${data.userName}, you still have ${data.itemCount} item(s) in your cart.${incentive} Return now: ${data.recoveryUrl}`;
    case "recovery_24h":
      return `Hi ${data.userName}, your cart is still saved with ${data.itemCount} item(s).${incentive} Complete checkout: ${data.recoveryUrl}`;
    case "recovery_72h":
      return `Final reminder, ${data.userName}: your cart still has ${data.itemCount} item(s).${incentive} Finish order: ${data.recoveryUrl}`;
    default:
      return `Hi ${data.userName}, your cart is ready. ${data.recoveryUrl}`;
  }
}

export class MessageAdapter {
  private accountSid?: string;
  private authToken?: string;
  private messagingServiceSid?: string;
  private smsFrom?: string;
  private whatsappFrom?: string;

  constructor(env: Env) {
    this.accountSid = env.TWILIO_ACCOUNT_SID;
    this.authToken = env.TWILIO_AUTH_TOKEN;
    this.messagingServiceSid = env.TWILIO_MESSAGING_SERVICE_SID;
    this.smsFrom = env.TWILIO_SMS_FROM;
    this.whatsappFrom = env.TWILIO_WHATSAPP_FROM;
  }

  private hasTwilioCredentials() {
    return Boolean(this.accountSid && this.authToken);
  }

  private async sendTwilioMessage(params: {
    to: string;
    body: string;
    from?: string;
    messagingServiceSid?: string;
  }): Promise<boolean> {
    if (!this.hasTwilioCredentials()) {
      console.log("[message-adapter] Missing Twilio credentials; skipping outbound message");
      return false;
    }

    const { to, body, from, messagingServiceSid } = params;
    const form = new URLSearchParams();
    form.set("To", to);
    form.set("Body", body);
    if (messagingServiceSid) {
      form.set("MessagingServiceSid", messagingServiceSid);
    } else if (from) {
      form.set("From", from);
    } else {
      console.log("[message-adapter] Missing Twilio sender configuration; skipping outbound message");
      return false;
    }

    const auth = btoa(`${this.accountSid}:${this.authToken}`);
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
      },
    );

    if (!response.ok) {
      const details = await response.text();
      console.error(`[message-adapter] Twilio send failed: ${response.status} ${details}`);
      return false;
    }

    return true;
  }

  async sendCheckoutRecoverySms(toPhone: string, data: CheckoutRecoveryMessageData): Promise<boolean> {
    const normalizedTo = normalizePhoneNumber(toPhone);
    if (!normalizedTo) {
      return false;
    }
    const body = buildRecoveryText(data);
    return this.sendTwilioMessage({
      to: normalizedTo,
      body,
      messagingServiceSid: this.messagingServiceSid,
      from: this.smsFrom,
    });
  }

  async sendCheckoutRecoveryWhatsApp(toPhone: string, data: CheckoutRecoveryMessageData): Promise<boolean> {
    const normalizedTo = normalizePhoneNumber(toPhone);
    if (!normalizedTo) {
      return false;
    }
    const from = this.whatsappFrom;
    if (!from) {
      console.log("[message-adapter] Missing TWILIO_WHATSAPP_FROM; skipping WhatsApp message");
      return false;
    }
    const body = buildRecoveryText(data);
    return this.sendTwilioMessage({
      to: normalizedTo.startsWith("whatsapp:") ? normalizedTo : `whatsapp:${normalizedTo}`,
      body,
      from,
    });
  }
}
