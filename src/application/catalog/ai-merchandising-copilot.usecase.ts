import { createSlug } from "../../domain/catalog/slug.vo";

type ProductType = "physical" | "digital" | "subscription" | "bookable";

interface ExistingProductContext {
  name?: string | null;
  description?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  type?: ProductType | null;
}

interface MerchandisingCopilotInput {
  mode: "draft" | "enrich";
  productType: ProductType;
  brief: string;
  audience?: string;
  tone?: "playful" | "premium" | "clinical" | "minimal" | "warm";
  keyFeatures?: string[];
  existing?: ExistingProductContext;
}

export interface MerchandisingCopilotResult {
  name: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  slugSuggestion: string;
  highlights: string[];
  warnings: string[];
  confidence: "low" | "medium" | "high";
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
  seoTitle?: string;
  seoDescription?: string;
  highlights?: string[];
  confidence?: "low" | "medium" | "high";
}

const MEDICAL_CLAIM_PATTERNS = [
  /\bcure\b/gi,
  /\btreat\b/gi,
  /\bheal\b/gi,
  /\bguaranteed\b/gi,
  /\bclinically proven\b/gi,
  /\bprevent(s|ed|ion)?\b/gi,
  /\bdiagnose\b/gi,
];

const MAX_NAME = 200;
const MAX_SEO_TITLE = 70;
const MAX_SEO_DESCRIPTION = 160;

export class AiMerchandisingCopilotUseCase {
  private readonly endpoint =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

  constructor(private readonly apiKey: string) {}

  async execute(input: MerchandisingCopilotInput): Promise<MerchandisingCopilotResult> {
    const warnings: string[] = [];
    let aiPayload: CandidatePayload | null = null;
    if (!this.apiKey.trim()) {
      warnings.push("GEMINI_API_KEY is not configured; deterministic fallback copy was used.");
    } else {
      aiPayload = await this.generateWithGemini(input).catch(() => null);
    }
    if (!aiPayload) {
      warnings.push("AI response unavailable, used deterministic fallback copy.");
    }

    const fallback = this.buildFallback(input);
    const merged: CandidatePayload = {
      name: aiPayload?.name ?? fallback.name,
      description: aiPayload?.description ?? fallback.description,
      seoTitle: aiPayload?.seoTitle ?? fallback.seoTitle,
      seoDescription: aiPayload?.seoDescription ?? fallback.seoDescription,
      highlights: aiPayload?.highlights?.length ? aiPayload.highlights : fallback.highlights,
      confidence: aiPayload?.confidence ?? (aiPayload ? "medium" : "low"),
    };

    const guarded = this.applyGuardrails(merged, warnings);

    return {
      ...guarded,
      slugSuggestion: createSlug(guarded.name),
      warnings,
    };
  }

  private async generateWithGemini(
    input: MerchandisingCopilotInput,
  ): Promise<CandidatePayload | null> {
    const prompt = this.buildPrompt(input);

    const response = await fetch(`${this.endpoint}?key=${this.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.4,
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

  private buildPrompt(input: MerchandisingCopilotInput): string {
    const safeBrief = input.brief.trim();
    const features = (input.keyFeatures ?? []).filter(Boolean).slice(0, 10);
    const existing = input.existing ?? {};

    return [
      "You are an e-commerce merchandising copilot.",
      "Generate concise product copy and SEO copy in strict JSON.",
      "",
      `Mode: ${input.mode}`,
      `Product type: ${input.productType}`,
      `Audience: ${input.audience ?? "general pet owners"}`,
      `Tone: ${input.tone ?? "warm"}`,
      `Brief: ${safeBrief}`,
      features.length > 0 ? `Key features: ${features.join("; ")}` : "Key features: none provided",
      "",
      "Existing product context:",
      `- Name: ${existing.name ?? "n/a"}`,
      `- Description: ${existing.description ?? "n/a"}`,
      `- SEO title: ${existing.seoTitle ?? "n/a"}`,
      `- SEO description: ${existing.seoDescription ?? "n/a"}`,
      "",
      "Rules:",
      "- Never make medical, legal, or guaranteed-result claims.",
      "- Avoid words like cure, treat, heal, guaranteed, clinically proven.",
      "- Keep SEO title <= 70 chars.",
      "- Keep SEO description <= 160 chars.",
      "- Output pure JSON only.",
      "",
      "Return JSON with keys:",
      "{",
      '  "name": string,',
      '  "description": string,',
      '  "seoTitle": string,',
      '  "seoDescription": string,',
      '  "highlights": string[],',
      '  "confidence": "low" | "medium" | "high"',
      "}",
    ].join("\n");
  }

  private buildFallback(input: MerchandisingCopilotInput): Required<CandidatePayload> {
    const trimmedBrief = input.brief.trim().replace(/\s+/g, " ");
    const baseName = this.truncate(
      (input.existing?.name?.trim() || this.firstSentence(trimmedBrief) || "New Product"),
      MAX_NAME,
    );
    const description = this.truncate(
      input.mode === "enrich" && input.existing?.description
        ? `${input.existing.description}\n\n${trimmedBrief}`
        : trimmedBrief,
      1400,
    );
    const seoTitle = this.truncate(baseName, MAX_SEO_TITLE);
    const seoDescription = this.truncate(
      this.firstSentence(description) || description,
      MAX_SEO_DESCRIPTION,
    );

    const highlights = (input.keyFeatures ?? [])
      .map((feature) => feature.trim())
      .filter(Boolean)
      .slice(0, 4);

    if (highlights.length === 0) {
      highlights.push(
        input.productType === "digital"
          ? "Instantly accessible digital delivery."
          : "Designed for everyday durability and comfort.",
      );
    }

    return {
      name: baseName,
      description,
      seoTitle,
      seoDescription,
      highlights,
      confidence: "low",
    };
  }

  private applyGuardrails(
    payload: CandidatePayload,
    warnings: string[],
  ): Omit<MerchandisingCopilotResult, "slugSuggestion" | "warnings"> {
    const name = this.cleanText(payload.name ?? "");
    const description = this.cleanText(payload.description ?? "");
    const seoTitle = this.cleanText(payload.seoTitle ?? name);
    const seoDescription = this.cleanText(payload.seoDescription ?? description);

    const guardedName = this.truncate(this.removeClaimTerms(name), MAX_NAME);
    const guardedDescription = this.removeClaimTerms(description);
    const guardedSeoTitle = this.truncate(this.removeClaimTerms(seoTitle), MAX_SEO_TITLE);
    const guardedSeoDescription = this.truncate(
      this.removeClaimTerms(seoDescription),
      MAX_SEO_DESCRIPTION,
    );

    const hadClaims =
      guardedName !== name
      || guardedDescription !== description
      || guardedSeoTitle !== seoTitle
      || guardedSeoDescription !== seoDescription;
    if (hadClaims) {
      warnings.push("Potential risky claims were removed by copy guardrails.");
    }

    const highlights = (payload.highlights ?? [])
      .map((highlight) => this.cleanText(String(highlight)))
      .map((highlight) => this.removeClaimTerms(highlight))
      .filter(Boolean)
      .slice(0, 6);

    const confidence = payload.confidence === "high" || payload.confidence === "medium"
      ? payload.confidence
      : "low";

    return {
      name: guardedName || "New Product",
      description: guardedDescription || "Product description pending.",
      seoTitle: guardedSeoTitle || guardedName || "New Product",
      seoDescription:
        guardedSeoDescription
        || this.truncate(guardedDescription || "Product description pending.", MAX_SEO_DESCRIPTION),
      highlights,
      confidence,
    };
  }

  private cleanText(value: string): string {
    return value
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  private removeClaimTerms(value: string): string {
    let next = value;
    for (const pattern of MEDICAL_CLAIM_PATTERNS) {
      next = next.replace(pattern, "");
    }
    return next.replace(/\s+/g, " ").trim();
  }

  private truncate(value: string, maxLength: number): string {
    if (value.length <= maxLength) return value;
    return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
  }

  private firstSentence(value: string): string {
    const normalized = value.replace(/\s+/g, " ").trim();
    if (!normalized) return "";
    const sentence = normalized.match(/^(.{1,220}?[.!?])\s/);
    if (sentence?.[1]) return sentence[1].trim();
    return normalized.slice(0, 220).trim();
  }
}
