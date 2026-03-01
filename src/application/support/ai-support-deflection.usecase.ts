type SupportIntent =
  | "order_tracking"
  | "returns_exchange"
  | "subscription_billing"
  | "address_update"
  | "coupon_help"
  | "account_access"
  | "general";

interface SupportAction {
  label: string;
  url: string;
}

export interface SupportDeflectionResult {
  intent: SupportIntent;
  confidence: number;
  deflected: boolean;
  response: string;
  suggestedActions: SupportAction[];
  escalation: {
    recommended: boolean;
    channel: "email";
    reason: string | null;
  };
  warnings: string[];
}

interface IntentMapping {
  intent: SupportIntent;
  confidence: number;
  response: string;
  actions: SupportAction[];
}

interface GeminiCandidate {
  content?: {
    parts?: Array<{ text?: string }>;
  };
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
}

const INTENT_PATTERNS: Array<{ intent: SupportIntent; confidence: number; patterns: RegExp[] }> = [
  {
    intent: "order_tracking",
    confidence: 0.92,
    patterns: [
      /\bwhere\b.*\border\b/i,
      /\btrack(ing)?\b/i,
      /\bshipment\b/i,
      /\bdelivery status\b/i,
    ],
  },
  {
    intent: "returns_exchange",
    confidence: 0.9,
    patterns: [
      /\breturn(s|ing)?\b/i,
      /\brefund\b/i,
      /\bexchange\b/i,
      /\bwrong size\b/i,
    ],
  },
  {
    intent: "subscription_billing",
    confidence: 0.9,
    patterns: [
      /\bsubscription\b/i,
      /\bbilling\b/i,
      /\bcharged?\b/i,
      /\bcancel\b.*\bplan\b/i,
    ],
  },
  {
    intent: "address_update",
    confidence: 0.88,
    patterns: [
      /\bchange\b.*\baddress\b/i,
      /\bupdate\b.*\baddress\b/i,
      /\bshipping address\b/i,
    ],
  },
  {
    intent: "coupon_help",
    confidence: 0.86,
    patterns: [
      /\bcoupon\b/i,
      /\bpromo\b/i,
      /\bdiscount code\b/i,
      /\bvoucher\b/i,
    ],
  },
  {
    intent: "account_access",
    confidence: 0.85,
    patterns: [
      /\blog ?in\b/i,
      /\bsign ?in\b/i,
      /\bpassword\b/i,
      /\breset\b.*\baccount\b/i,
    ],
  },
];

const INTENT_RESPONSES: Record<SupportIntent, IntentMapping> = {
  order_tracking: {
    intent: "order_tracking",
    confidence: 0.92,
    response: "You can check current order and shipment status in your Orders page. Open the latest order to view fulfillment progress and tracking links.",
    actions: [
      { label: "Open Orders", url: "/account/orders" },
    ],
  },
  returns_exchange: {
    intent: "returns_exchange",
    confidence: 0.9,
    response: "You can start a return or instant exchange from your order details. Select the order line item and choose return or exchange options.",
    actions: [
      { label: "Start Return / Exchange", url: "/account/orders" },
    ],
  },
  subscription_billing: {
    intent: "subscription_billing",
    confidence: 0.9,
    response: "Subscription billing updates, pause/cancel actions, and payment method changes are available in your Subscriptions page.",
    actions: [
      { label: "Manage Subscription", url: "/account/subscriptions" },
    ],
  },
  address_update: {
    intent: "address_update",
    confidence: 0.88,
    response: "Shipping addresses can be updated in your account. Changes apply to future orders and subscriptions after saving.",
    actions: [
      { label: "Manage Addresses", url: "/account/addresses" },
    ],
  },
  coupon_help: {
    intent: "coupon_help",
    confidence: 0.86,
    response: "Coupon codes are applied in cart before checkout. Confirm the code is active and eligible for your current items.",
    actions: [
      { label: "Open Cart", url: "/cart" },
    ],
  },
  account_access: {
    intent: "account_access",
    confidence: 0.85,
    response: "For account access issues, you can reset your password and then sign in again with the updated credentials.",
    actions: [
      { label: "Reset Password", url: "/auth/forgot-password" },
      { label: "Login", url: "/auth/login" },
    ],
  },
  general: {
    intent: "general",
    confidence: 0.45,
    response: "I can route common account, order, returns, and billing questions. For anything else, contact support and include your order number if relevant.",
    actions: [],
  },
};

export class AiSupportDeflectionUseCase {
  private readonly endpoint =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

  constructor(private readonly apiKey: string) {}

  async execute(input: { message: string }): Promise<SupportDeflectionResult> {
    const warnings: string[] = [];
    const message = input.message.trim();
    const mapping = this.detectIntent(message);

    let response = mapping.response;
    if (!this.apiKey.trim()) {
      warnings.push("GEMINI_API_KEY is not configured; deterministic response used.");
    } else {
      const aiResponse = await this.generateResponseWithGemini(message, mapping).catch(() => null);
      if (aiResponse) {
        response = aiResponse;
      } else {
        warnings.push("AI response unavailable; deterministic response used.");
      }
    }

    const deflected = mapping.intent !== "general" && mapping.confidence >= 0.7;
    return {
      intent: mapping.intent,
      confidence: mapping.confidence,
      deflected,
      response,
      suggestedActions: mapping.actions,
      escalation: {
        recommended: !deflected,
        channel: "email",
        reason: deflected ? null : "Intent confidence is low for automatic deflection.",
      },
      warnings,
    };
  }

  private detectIntent(message: string): IntentMapping {
    for (const item of INTENT_PATTERNS) {
      if (item.patterns.some((pattern) => pattern.test(message))) {
        return INTENT_RESPONSES[item.intent];
      }
    }
    return INTENT_RESPONSES.general;
  }

  private async generateResponseWithGemini(
    message: string,
    mapping: IntentMapping,
  ): Promise<string | null> {
    const prompt = [
      "You are a customer support deflection assistant.",
      "Rewrite the response so it is concise, clear, and practical.",
      "Do not invent policies.",
      "",
      `Customer message: ${message}`,
      `Detected intent: ${mapping.intent}`,
      `Default response: ${mapping.response}`,
      `Actions: ${mapping.actions.map((action) => `${action.label} (${action.url})`).join("; ") || "none"}`,
      "",
      "Output plain text only, maximum 80 words.",
    ].join("\n");

    const response = await fetch(`${this.endpoint}?key=${this.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 220,
        },
      }),
    });
    if (!response.ok) {
      throw new Error(`Gemini API error ${response.status}`);
    }

    const data = (await response.json()) as GeminiResponse;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) return null;
    return text.slice(0, 700);
  }
}
