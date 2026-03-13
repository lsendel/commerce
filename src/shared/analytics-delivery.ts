const DELIVERY_DIMENSION_KEYS = [
  "orderId",
  "checkoutId",
  "cartId",
  "productId",
  "variantId",
  "workflowId",
  "experimentId",
  "provider",
  "stage",
  "channel",
] as const;

function normalizePageUrl(pageUrl: string | null | undefined): string {
  if (!pageUrl) return "";
  try {
    const url = new URL(pageUrl);
    return `${url.origin}${url.pathname}`;
  } catch {
    return pageUrl.trim();
  }
}

function extractDeliveryDimensions(properties: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const key of DELIVERY_DIMENSION_KEYS) {
    const value = properties[key];
    if (value === undefined || value === null) continue;
    const normalizedValue = String(value).trim();
    if (!normalizedValue) continue;
    parts.push(`${key}:${normalizedValue}`);
  }
  return parts.join("|");
}

export function buildAnalyticsDeliveryKey(input: {
  eventType: string;
  sessionId?: string | null;
  pageUrl?: string | null;
  dedupeKey?: string | null;
  eventId?: string | null;
  properties?: Record<string, unknown>;
}): string {
  const explicitKey = input.dedupeKey?.trim();
  if (explicitKey) {
    return explicitKey.slice(0, 220);
  }

  const properties = input.properties ?? {};
  const dimensions = extractDeliveryDimensions(properties);
  const normalizedSessionId = (input.sessionId ?? "").trim();
  const normalizedPageUrl = normalizePageUrl(input.pageUrl);
  const normalizedEventId = (input.eventId ?? "").trim();

  const key = [
    input.eventType.trim().toLowerCase(),
    normalizedSessionId,
    normalizedPageUrl,
    dimensions,
    normalizedEventId,
  ]
    .filter((part) => part.length > 0)
    .join("|");

  return key.slice(0, 220);
}

export async function delayMs(ms: number): Promise<void> {
  if (ms <= 0) return;
  await new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}
