export type ReplayableWebhookProvider = "stripe" | "printful" | "prodigi";

function toHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function computeWebhookPayloadFingerprint(rawBody: string): Promise<string> {
  const payload = new TextEncoder().encode(rawBody);
  const digest = await crypto.subtle.digest("SHA-256", payload);
  return toHex(digest);
}

export function normalizeWebhookSignature(signature: string | null | undefined): string {
  return String(signature ?? "").trim().toLowerCase().replace(/^sha256=/, "");
}

export function resolveWebhookProvider(provider: string): ReplayableWebhookProvider | null {
  const normalized = provider.trim().toLowerCase();
  if (normalized === "stripe") return "stripe";
  if (normalized === "printful") return "printful";
  if (normalized === "prodigi") return "prodigi";
  return null;
}

export async function resolveWebhookDeliveryId(input: {
  externalEventId?: string | null;
  rawBody: string;
}): Promise<string> {
  const explicitId = String(input.externalEventId ?? "").trim();
  if (explicitId.length > 0) return explicitId.slice(0, 200);
  const fingerprint = await computeWebhookPayloadFingerprint(input.rawBody);
  return `auto:${fingerprint.slice(0, 40)}`;
}

export async function verifyWebhookHmacSha256(input: {
  rawBody: string;
  signature: string | null | undefined;
  secret: string | null | undefined;
}): Promise<boolean> {
  const normalizedSignature = normalizeWebhookSignature(input.signature);
  const secret = String(input.secret ?? "");
  if (!normalizedSignature || !secret) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(input.rawBody));
  const computed = toHex(digest);

  if (computed.length !== normalizedSignature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < computed.length; i += 1) {
    mismatch |= computed.charCodeAt(i) ^ normalizedSignature.charCodeAt(i);
  }
  return mismatch === 0;
}
