type PromotionType = "coupon" | "automatic" | "flash_sale";
type StrategyType =
  | "percentage_off"
  | "fixed_amount"
  | "free_shipping"
  | "bogo"
  | "buy_x_get_y"
  | "tiered"
  | "bundle";

interface ExistingPromotionContext {
  name?: string | null;
  description?: string | null;
  type?: PromotionType | null;
  strategyType?: string | null;
  strategyParams?: Record<string, unknown> | null;
  conditions?: Record<string, unknown> | null;
}

interface PromotionCopilotInput {
  mode: "draft" | "enrich";
  brief: string;
  promotionType: PromotionType;
  objective?: "aov" | "conversion" | "acquisition" | "clearance" | "retention";
  audience?: string;
  existing?: ExistingPromotionContext;
}

export interface PromotionCopilotResult {
  name: string;
  description: string;
  type: PromotionType;
  strategyType: StrategyType;
  strategyParams: Record<string, unknown>;
  conditions: Record<string, unknown>;
  priority: number;
  stackable: boolean;
  usageLimit: number | null;
  couponCodeSuggestion: string | null;
  confidence: "low" | "medium" | "high";
  warnings: string[];
}

interface GeminiCandidate {
  content?: {
    parts?: Array<{ text?: string }>;
  };
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
}

interface CandidatePayload {
  name?: string;
  description?: string;
  type?: PromotionType;
  strategyType?: StrategyType;
  strategyParams?: Record<string, unknown>;
  conditions?: Record<string, unknown>;
  priority?: number;
  stackable?: boolean;
  usageLimit?: number | null;
  couponCodeSuggestion?: string | null;
  confidence?: "low" | "medium" | "high";
}

const STRATEGY_TYPES: StrategyType[] = [
  "percentage_off",
  "fixed_amount",
  "free_shipping",
  "bogo",
  "buy_x_get_y",
  "tiered",
  "bundle",
];

export class AiPromotionCopilotUseCase {
  private readonly endpoint =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

  constructor(private readonly apiKey: string) {}

  async execute(input: PromotionCopilotInput): Promise<PromotionCopilotResult> {
    const warnings: string[] = [];
    let aiPayload: CandidatePayload | null = null;
    if (!this.apiKey.trim()) {
      warnings.push("GEMINI_API_KEY is not configured; deterministic fallback promotion was used.");
    } else {
      aiPayload = await this.generateWithGemini(input).catch(() => null);
    }
    if (!aiPayload) {
      warnings.push("AI response unavailable, deterministic fallback promotion was used.");
    }

    const fallback = this.buildFallback(input);
    const merged: CandidatePayload = {
      ...fallback,
      ...(aiPayload ?? {}),
    };

    return this.applyGuardrails(merged, warnings, input.promotionType);
  }

  private async generateWithGemini(input: PromotionCopilotInput): Promise<CandidatePayload | null> {
    const prompt = this.buildPrompt(input);
    const response = await fetch(`${this.endpoint}?key=${this.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.35,
          maxOutputTokens: 1200,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error ${response.status}`);
    }

    const data = (await response.json()) as GeminiResponse;
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return null;

    const parsed = this.parseJsonPayload(rawText);
    if (!parsed) return null;
    return parsed;
  }

  private parseJsonPayload(raw: string): CandidatePayload | null {
    const cleaned = raw.trim();
    const codeBlock = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = (codeBlock?.[1] ?? cleaned).trim();

    try {
      const parsed = JSON.parse(candidate) as CandidatePayload;
      if (!parsed || typeof parsed !== "object") return null;
      return parsed;
    } catch {
      return null;
    }
  }

  private buildPrompt(input: PromotionCopilotInput): string {
    const existing = input.existing ?? {};

    return [
      "You are a promotion strategy copilot for an ecommerce admin team.",
      "Generate a practical promotion setup in strict JSON.",
      "",
      `Mode: ${input.mode}`,
      `Promotion type requested: ${input.promotionType}`,
      `Objective: ${input.objective ?? "conversion"}`,
      `Audience: ${input.audience ?? "all customers"}`,
      `Brief: ${input.brief.trim()}`,
      "",
      "Existing promotion context:",
      `- Name: ${existing.name ?? "n/a"}`,
      `- Description: ${existing.description ?? "n/a"}`,
      `- Type: ${existing.type ?? "n/a"}`,
      `- Strategy type: ${existing.strategyType ?? "n/a"}`,
      "",
      "Rules:",
      "- Keep promotions realistic and safe.",
      "- Do not exceed 80% percentage discounts.",
      "- Keep fixed amount discount <= 200.",
      "- Keep name <= 120 chars and description <= 280 chars.",
      "- Return pure JSON only.",
      "",
      "Return JSON with keys:",
      "{",
      '  "name": string,',
      '  "description": string,',
      '  "type": "coupon" | "automatic" | "flash_sale",',
      '  "strategyType": "percentage_off" | "fixed_amount" | "free_shipping" | "bogo" | "buy_x_get_y" | "tiered" | "bundle",',
      '  "strategyParams": object,',
      '  "conditions": object,',
      '  "priority": number,',
      '  "stackable": boolean,',
      '  "usageLimit": number | null,',
      '  "couponCodeSuggestion": string | null,',
      '  "confidence": "low" | "medium" | "high"',
      "}",
    ].join("\n");
  }

  private buildFallback(input: PromotionCopilotInput): CandidatePayload {
    const objectiveLabel = (input.objective ?? "conversion").replace(/_/g, " ");
    const name = `${this.toTitleCase(objectiveLabel)} Boost Offer`;
    const description = this.truncate(
      `Auto-generated promotion focused on ${objectiveLabel}. ${input.brief.trim()}`,
      280,
    );

    return {
      name: this.truncate(name, 120),
      description,
      type: input.promotionType,
      strategyType: "percentage_off",
      strategyParams: { percentOff: 10 },
      conditions: {},
      priority: 0,
      stackable: false,
      usageLimit: input.promotionType === "coupon" ? 500 : null,
      couponCodeSuggestion: input.promotionType === "coupon" ? "SAVE10" : null,
      confidence: "low",
    };
  }

  private applyGuardrails(
    payload: CandidatePayload,
    warnings: string[],
    requestedType: PromotionType,
  ): PromotionCopilotResult {
    const normalizedType: PromotionType =
      payload.type === "automatic" || payload.type === "flash_sale" || payload.type === "coupon"
        ? payload.type
        : requestedType;

    let strategyType: StrategyType = STRATEGY_TYPES.includes(
      payload.strategyType as StrategyType,
    )
      ? (payload.strategyType as StrategyType)
      : "percentage_off";

    const strategyParams = { ...(payload.strategyParams ?? {}) };
    const conditions = { ...(payload.conditions ?? {}) };

    if (strategyType === "percentage_off") {
      const raw = Number(strategyParams.percentOff ?? strategyParams.value ?? 10);
      const clamped = Math.min(80, Math.max(1, Number.isFinite(raw) ? raw : 10));
      if (raw !== clamped) warnings.push("Percentage discount was clamped to safe bounds (1-80).");
      strategyParams.percentOff = clamped;
    }

    if (strategyType === "fixed_amount") {
      const raw = Number(strategyParams.amountOff ?? strategyParams.value ?? 5);
      const clamped = Math.min(200, Math.max(1, Number.isFinite(raw) ? raw : 5));
      if (raw !== clamped) warnings.push("Fixed amount discount was clamped to safe bounds (1-200).");
      strategyParams.amountOff = clamped;
    }

    if (strategyType === "bogo" || strategyType === "buy_x_get_y") {
      strategyType = "buy_x_get_y";
      const buyQuantity = Math.max(1, Number(strategyParams.buyQuantity ?? 1) || 1);
      const getQuantity = Math.max(1, Number(strategyParams.getQuantity ?? 1) || 1);
      strategyParams.buyQuantity = buyQuantity;
      strategyParams.getQuantity = getQuantity;
    }

    if (strategyType === "tiered") {
      const tiers = Array.isArray(strategyParams.tiers) ? strategyParams.tiers : [];
      if (tiers.length === 0) {
        strategyParams.tiers = [
          { minSubtotal: 50, percentOff: 10 },
          { minSubtotal: 100, percentOff: 15 },
        ];
        warnings.push("Tiered strategy had no tiers; defaults were applied.");
      }
    }

    if (strategyType === "bundle") {
      const hasBundleTargets = Array.isArray(strategyParams.bundleVariantIds)
        && strategyParams.bundleVariantIds.length > 0;
      if (!hasBundleTargets) {
        strategyType = "percentage_off";
        strategyParams.percentOff = Number(strategyParams.percentOff ?? 10) || 10;
        warnings.push("Bundle strategy needs explicit bundle targets; switched to percentage_off.");
      }
    }

    if (conditions.minSubtotal !== undefined) {
      const minSubtotal = Number(conditions.minSubtotal);
      conditions.minSubtotal = Number.isFinite(minSubtotal) && minSubtotal > 0
        ? minSubtotal
        : 0;
    }

    const usageLimitRaw = payload.usageLimit;
    let usageLimit: number | null = null;
    if (usageLimitRaw !== null && usageLimitRaw !== undefined) {
      const normalized = Math.round(Number(usageLimitRaw));
      usageLimit = Number.isFinite(normalized) && normalized > 0 ? normalized : null;
    } else if (normalizedType === "coupon") {
      usageLimit = 500;
    }

    const couponCodeSuggestion = normalizedType === "coupon"
      ? this.normalizeCouponCode(payload.couponCodeSuggestion)
      : null;

    return {
      name: this.truncate(this.cleanText(payload.name ?? "Promotion"), 120),
      description: this.truncate(
        this.cleanText(payload.description ?? "Generated promotion"),
        280,
      ),
      type: normalizedType,
      strategyType,
      strategyParams,
      conditions,
      priority: Number.isFinite(Number(payload.priority))
        ? Math.max(0, Math.min(100, Math.round(Number(payload.priority))))
        : 0,
      stackable: Boolean(payload.stackable),
      usageLimit,
      couponCodeSuggestion,
      confidence:
        payload.confidence === "high" || payload.confidence === "medium"
          ? payload.confidence
          : "low",
      warnings,
    };
  }

  private normalizeCouponCode(value: unknown): string {
    const raw = this.cleanText(String(value ?? "SAVE10")).toUpperCase();
    const compact = raw.replace(/[^A-Z0-9_-]/g, "");
    return compact.slice(0, 24) || "SAVE10";
  }

  private cleanText(value: string): string {
    return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }

  private truncate(value: string, maxLength: number): string {
    if (value.length <= maxLength) return value;
    return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
  }

  private toTitleCase(value: string): string {
    return value
      .split(" ")
      .map((part) => part ? part.charAt(0).toUpperCase() + part.slice(1) : part)
      .join(" ");
  }
}
