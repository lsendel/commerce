import { AUTH_COOKIE_MAX_AGE } from "../../shared/constants";

interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  iat: number;
  exp: number;
}

function base64UrlEncode(data: string): string {
  return btoa(data).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(data: string): string {
  const padded = data + "=".repeat((4 - (data.length % 4)) % 4);
  return atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
}

async function getSigningKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signJwt(
  payload: { sub: string; email: string; name: string },
  secret: string
): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);

  const fullPayload: JwtPayload = {
    ...payload,
    iat: now,
    exp: now + AUTH_COOKIE_MAX_AGE,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const key = await getSigningKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signingInput));
  const encodedSignature = base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));

  return `${signingInput}.${encodedSignature}`;
}

export async function verifyJwt(
  token: string,
  secret: string
): Promise<JwtPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const key = await getSigningKey(secret);

  const signatureData = base64UrlDecode(encodedSignature);
  const signatureBytes = new Uint8Array(signatureData.length);
  for (let i = 0; i < signatureData.length; i++) {
    signatureBytes[i] = signatureData.charCodeAt(i);
  }

  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes,
    new TextEncoder().encode(signingInput)
  );

  if (!valid) return null;

  const payload: JwtPayload = JSON.parse(base64UrlDecode(encodedPayload));

  if (payload.exp < Math.floor(Date.now() / 1000)) return null;

  return payload;
}

export type { JwtPayload };
