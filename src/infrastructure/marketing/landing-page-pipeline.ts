export interface LandingPageBrandGuardrails {
  brandName: string;
  voicePillars: string[];
  requiredPhrases: string[];
  bannedPhrases: string[];
}

export interface LandingPageInput {
  slug: string;
  campaignName: string;
  audience: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  ctaLabel: string;
  ctaUrl: string;
  heroImageUrl: string;
  highlights: string[];
  proofPoints: string[];
  faq: Array<{ question: string; answer: string }>;
  brand: LandingPageBrandGuardrails;
}

export interface LandingPageSection {
  id: "hero" | "value-props" | "proof" | "faq" | "cta";
  heading: string;
  body: string;
  bullets?: string[];
}

export interface GeneratedLandingPage {
  slug: string;
  campaignName: string;
  urlPath: string;
  seoTitle: string;
  seoDescription: string;
  heroTitle: string;
  heroSubtitle: string;
  ctaLabel: string;
  ctaUrl: string;
  heroImageUrl: string;
  sections: LandingPageSection[];
  faq: Array<{ question: string; answer: string }>;
}

export interface LandingPageQualityCheck {
  id: string;
  ok: boolean;
  note: string;
}

export interface LandingPageQualityResult {
  status: "passed" | "failed";
  checks: LandingPageQualityCheck[];
}

function clampSeoTitle(title: string) {
  if (title.length <= 65) return title;
  return `${title.slice(0, 62).trim()}...`;
}

function clampSeoDescription(description: string) {
  if (description.length <= 160) return description;
  return `${description.slice(0, 157).trim()}...`;
}

function normalizeText(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function averageSentenceLength(text: string) {
  const sentences = text
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
  if (sentences.length === 0) return 0;
  const totalWords = sentences.reduce((sum, sentence) => sum + sentence.split(/\s+/).filter(Boolean).length, 0);
  return totalWords / sentences.length;
}

function sectionBodyText(page: GeneratedLandingPage) {
  return page.sections
    .map((section) => `${section.heading} ${section.body} ${(section.bullets ?? []).join(" ")}`)
    .join(" ");
}

export function generateLandingPage(input: LandingPageInput): GeneratedLandingPage {
  const pathSlug = input.slug.replace(/^\/+/, "").trim();
  const urlPath = `/lp/${pathSlug}`;
  const secondaryKeywordLine = input.secondaryKeywords.length > 0
    ? `Built for ${input.secondaryKeywords.join(", ")} outcomes.`
    : "Built for measurable marketing outcomes.";
  const requiredPhraseLine = input.brand.requiredPhrases.length > 0
    ? `This campaign aligns around ${input.brand.requiredPhrases.join(", ")}.`
    : "";

  const heroTitle = `${input.primaryKeyword} That Converts for ${input.audience}`;
  const heroSubtitle =
    `${input.brand.brandName} helps ${input.audience} launch faster with consistent creative, clear offers, and a conversion-first structure. ${secondaryKeywordLine} ${requiredPhraseLine}`.trim();

  const seoTitle = clampSeoTitle(`${input.campaignName} | ${input.primaryKeyword} Landing Page | ${input.brand.brandName}`);
  const seoDescription = clampSeoDescription(
    `${input.campaignName} by ${input.brand.brandName}: a focused ${input.primaryKeyword.toLowerCase()} landing page for ${input.audience} with proven messaging, trust signals, and a clear CTA.`,
  );

  const sections: LandingPageSection[] = [
    {
      id: "hero",
      heading: "Why This Campaign Wins",
      body:
        `This page was generated to target ${input.primaryKeyword.toLowerCase()} intent and guide ${input.audience} to one clear next step with minimal friction.`,
    },
    {
      id: "value-props",
      heading: "What You Get",
      body: `Every module aligns to ${input.brand.voicePillars.join(", ")} and emphasizes action over noise.`,
      bullets: input.highlights,
    },
    {
      id: "proof",
      heading: "Proof and Confidence Signals",
      body: "Decision-makers need certainty before they click. These proof points reduce hesitation.",
      bullets: input.proofPoints,
    },
    {
      id: "faq",
      heading: "Questions Marketers Ask Before Launch",
      body: "These answers handle common objections and keep conversion intent high.",
      bullets: input.faq.map((entry) => `${entry.question} — ${entry.answer}`),
    },
    {
      id: "cta",
      heading: "Ready to Launch",
      body: `Use this page as a publish-ready foundation, then adapt campaign details without breaking brand voice.`,
    },
  ];

  return {
    slug: pathSlug,
    campaignName: input.campaignName,
    urlPath,
    seoTitle,
    seoDescription,
    heroTitle,
    heroSubtitle,
    ctaLabel: input.ctaLabel,
    ctaUrl: input.ctaUrl,
    heroImageUrl: input.heroImageUrl,
    sections,
    faq: input.faq,
  };
}

export function evaluateLandingPageQuality(page: GeneratedLandingPage, input: LandingPageInput): LandingPageQualityResult {
  const checks: LandingPageQualityCheck[] = [];
  const fullText = `${page.heroTitle} ${page.heroSubtitle} ${sectionBodyText(page)} ${page.seoTitle} ${page.seoDescription}`;
  const normalizedFullText = normalizeText(fullText);
  const normalizedPrimaryKeyword = normalizeText(input.primaryKeyword);

  checks.push({
    id: "seo-title-length",
    ok: page.seoTitle.length >= 40 && page.seoTitle.length <= 65,
    note: `length=${page.seoTitle.length}`,
  });
  checks.push({
    id: "seo-description-length",
    ok: page.seoDescription.length >= 120 && page.seoDescription.length <= 160,
    note: `length=${page.seoDescription.length}`,
  });
  checks.push({
    id: "keyword-in-hero",
    ok: normalizeText(page.heroTitle).includes(normalizedPrimaryKeyword),
    note: `heroTitle="${page.heroTitle}"`,
  });
  checks.push({
    id: "keyword-in-body",
    ok: normalizedFullText.includes(normalizedPrimaryKeyword),
    note: `primaryKeyword="${input.primaryKeyword}"`,
  });
  checks.push({
    id: "required-sections",
    ok: ["hero", "value-props", "proof", "faq", "cta"].every((id) => page.sections.some((section) => section.id === id)),
    note: `sections=${page.sections.map((section) => section.id).join(",")}`,
  });
  checks.push({
    id: "faq-min-count",
    ok: page.faq.length >= 3,
    note: `faqCount=${page.faq.length}`,
  });
  checks.push({
    id: "cta-shape",
    ok: page.ctaLabel.trim().length >= 3 && page.ctaUrl.startsWith("/"),
    note: `ctaLabel="${page.ctaLabel}" ctaUrl="${page.ctaUrl}"`,
  });
  checks.push({
    id: "readability-average-sentence-length",
    ok: averageSentenceLength(fullText) <= 24,
    note: `avgSentenceLength=${averageSentenceLength(fullText).toFixed(2)}`,
  });

  for (const requiredPhrase of input.brand.requiredPhrases) {
    checks.push({
      id: `required-phrase-${requiredPhrase.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      ok: normalizedFullText.includes(normalizeText(requiredPhrase)),
      note: `requiredPhrase="${requiredPhrase}"`,
    });
  }

  for (const bannedPhrase of input.brand.bannedPhrases) {
    checks.push({
      id: `banned-phrase-${bannedPhrase.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      ok: !normalizedFullText.includes(normalizeText(bannedPhrase)),
      note: `bannedPhrase="${bannedPhrase}"`,
    });
  }

  for (const voicePillar of input.brand.voicePillars) {
    checks.push({
      id: `voice-pillar-${voicePillar.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      ok: normalizedFullText.includes(normalizeText(voicePillar)),
      note: `voicePillar="${voicePillar}"`,
    });
  }

  return {
    status: checks.every((check) => check.ok) ? "passed" : "failed",
    checks,
  };
}

export function renderLandingPageMarkdown(page: GeneratedLandingPage) {
  const lines: string[] = [
    `# ${page.heroTitle}`,
    "",
    page.heroSubtitle,
    "",
    `![Hero Image](${page.heroImageUrl})`,
    "",
    `**CTA:** [${page.ctaLabel}](${page.ctaUrl})`,
    "",
    "## SEO",
    "",
    `- Title: ${page.seoTitle}`,
    `- Description: ${page.seoDescription}`,
    `- URL Path: ${page.urlPath}`,
    "",
  ];

  for (const section of page.sections) {
    lines.push(`## ${section.heading}`);
    lines.push("");
    lines.push(section.body);
    lines.push("");
    if (section.bullets && section.bullets.length > 0) {
      section.bullets.forEach((bullet) => {
        lines.push(`- ${bullet}`);
      });
      lines.push("");
    }
  }

  lines.push("## FAQ");
  lines.push("");
  page.faq.forEach((item) => {
    lines.push(`### ${item.question}`);
    lines.push("");
    lines.push(item.answer);
    lines.push("");
  });

  return `${lines.join("\n")}\n`;
}

export function buildDefaultLandingPageInputs(): LandingPageInput[] {
  const brand: LandingPageBrandGuardrails = {
    brandName: "petm8",
    voicePillars: ["trust", "clarity", "actionability"],
    requiredPhrases: ["pet families", "premium pet products", "local events"],
    bannedPhrases: ["cheap", "guaranteed #1 overnight", "hacky"],
  };

  return [
    {
      slug: "pet-new-year-growth-playbook",
      campaignName: "New Year Growth Playbook",
      audience: "pet commerce teams",
      primaryKeyword: "pet ecommerce marketing strategy",
      secondaryKeywords: ["retention campaigns", "seasonal offers", "conversion optimization"],
      ctaLabel: "Launch This Campaign",
      ctaUrl: "/platform/create-store",
      heroImageUrl: "https://petm8.io/og-image.jpg",
      highlights: [
        "Campaign-ready hero, proof, FAQ, and CTA blocks",
        "Built-in messaging for catalog, events, and venue offers",
        "Copy that aligns with storefront and SEO intent",
      ],
      proofPoints: [
        "Uses the same structured-data and discoverability foundations as the core storefront",
        "Supports marketer-first edits without breaking brand voice",
        "Designed for fast launch cycles with repeatable QA checks",
      ],
      faq: [
        {
          question: "How quickly can we launch this landing page?",
          answer: "Teams can publish the generated draft immediately, then adjust campaign specifics in minutes.",
        },
        {
          question: "Does this match our storefront voice?",
          answer: "Yes. Brand guardrails enforce tone words, required phrases, and banned language.",
        },
        {
          question: "Can we reuse this for other campaigns?",
          answer: "Yes. Inputs are template-driven so you can generate additional campaign pages consistently.",
        },
      ],
      brand,
    },
    {
      slug: "local-pet-events-demand-capture",
      campaignName: "Local Events Demand Capture",
      audience: "growth marketers and community managers",
      primaryKeyword: "pet events landing page",
      secondaryKeywords: ["event booking", "local venue discovery", "community growth"],
      ctaLabel: "Start Event Campaign",
      ctaUrl: "/events",
      heroImageUrl: "https://petm8.io/og-image.jpg",
      highlights: [
        "Event-focused messaging with booking-first CTA path",
        "Venue and schedule proof blocks to reduce friction",
        "FAQ coverage for common booking concerns",
      ],
      proofPoints: [
        "Aligns with event schema and discovery surfaces already in platform",
        "Built to support paid traffic and organic search landing intent",
        "Reinforces trust with practical conversion guidance",
      ],
      faq: [
        {
          question: "Can this page support multiple event types?",
          answer: "Yes. The template supports workshops, sessions, and seasonal campaign variants.",
        },
        {
          question: "How do we keep messaging on-brand?",
          answer: "Quality gates validate required language and block off-brand phrasing.",
        },
        {
          question: "Will this help with local discoverability?",
          answer: "Yes. The content structure is designed for local intent and clear venue/event relevance.",
        },
      ],
      brand,
    },
  ];
}
