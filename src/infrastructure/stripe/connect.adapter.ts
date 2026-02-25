export class StripeConnectAdapter {
  private baseUrl = "https://api.stripe.com/v1";

  constructor(private secretKey: string) {}

  private async request<T>(
    method: string,
    path: string,
    body?: Record<string, string>,
  ): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Basic ${btoa(this.secretKey + ":")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body
        ? new URLSearchParams(body).toString()
        : undefined,
    });
    if (!res.ok) {
      const err = (await res.json()) as { error?: { message?: string } };
      throw new Error(
        `Stripe Connect error ${res.status}: ${err.error?.message ?? "Unknown"}`,
      );
    }
    return (await res.json()) as T;
  }

  async createConnectAccount(email: string): Promise<{ id: string }> {
    return this.request("POST", "/accounts", {
      type: "express",
      email,
      capabilities: JSON.stringify({
        card_payments: { requested: true },
        transfers: { requested: true },
      }),
    });
  }

  async createAccountLink(
    accountId: string,
    returnUrl: string,
    refreshUrl: string,
  ): Promise<{ url: string }> {
    return this.request("POST", "/account_links", {
      account: accountId,
      return_url: returnUrl,
      refresh_url: refreshUrl,
      type: "account_onboarding",
    });
  }

  async getAccount(accountId: string): Promise<{
    id: string;
    charges_enabled: boolean;
    payouts_enabled: boolean;
    details_submitted: boolean;
  }> {
    return this.request("GET", `/accounts/${accountId}`);
  }

  async createCheckoutWithFee(params: {
    connectedAccountId: string;
    lineItems: Array<{ price: string; quantity: number }>;
    applicationFeeAmount: number;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
  }): Promise<{ id: string; url: string }> {
    const body: Record<string, string> = {
      mode: "payment",
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      "payment_intent_data[application_fee_amount]": String(
        params.applicationFeeAmount,
      ),
      "payment_intent_data[transfer_data][destination]":
        params.connectedAccountId,
    };

    params.lineItems.forEach((item, i) => {
      body[`line_items[${i}][price]`] = item.price;
      body[`line_items[${i}][quantity]`] = String(item.quantity);
    });

    if (params.metadata) {
      Object.entries(params.metadata).forEach(([k, v]) => {
        body[`metadata[${k}]`] = v;
      });
    }

    return this.request("POST", "/checkout/sessions", body);
  }

  async createTransfer(params: {
    amount: number;
    currency: string;
    destination: string;
    transferGroup?: string;
  }): Promise<{ id: string }> {
    const body: Record<string, string> = {
      amount: String(params.amount),
      currency: params.currency,
      destination: params.destination,
    };
    if (params.transferGroup) {
      body.transfer_group = params.transferGroup;
    }
    return this.request("POST", "/transfers", body);
  }

  async createSubscription(params: {
    customerId: string;
    priceId: string;
  }): Promise<{ id: string; status: string }> {
    return this.request("POST", "/subscriptions", {
      customer: params.customerId,
      "items[0][price]": params.priceId,
    });
  }
}
