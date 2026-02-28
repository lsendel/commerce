import type { Env } from "../../env";
import { AuthError, ValidationError } from "../../shared/errors";

export type OAuthProvider = "google" | "apple" | "meta";

interface OAuthStatePayload {
  provider: OAuthProvider;
  state: string;
  nonce: string;
  redirect: string;
  sourcePath: "/auth/login" | "/auth/register";
}

interface JwtHeader {
  alg: string;
  kid?: string;
}

interface OAuthIdTokenClaims {
  iss: string;
  aud: string | string[];
  exp: number;
  iat: number;
  sub: string;
  email?: string;
  email_verified?: boolean | "true" | "false";
  nonce?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
}

interface JwksResponse {
  keys: JsonWebKey[];
}

interface CachedJwks {
  expiresAt: number;
  keys: JsonWebKey[];
}

const OAUTH_STATE_COOKIE_NAME = "petm8_oauth_state";
const OAUTH_STATE_COOKIE_MAX_AGE = 60 * 10; // 10 minutes
const DEFAULT_POST_AUTH_REDIRECT = "/account";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const GOOGLE_ISSUERS = new Set(["https://accounts.google.com", "accounts.google.com"]);

const APPLE_AUTH_URL = "https://appleid.apple.com/auth/authorize";
const APPLE_TOKEN_URL = "https://appleid.apple.com/auth/token";
const APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys";
const APPLE_ISSUERS = new Set(["https://appleid.apple.com"]);

const META_AUTH_URL = "https://www.facebook.com/v19.0/dialog/oauth";
const META_TOKEN_URL = "https://graph.facebook.com/v19.0/oauth/access_token";
const META_GRAPH_ME_URL = "https://graph.facebook.com/me";

const jwksCache = new Map<string, CachedJwks>();

function base64UrlDecode(input: string): string {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  return atob(padded);
}

function base64UrlToBytes(input: string): Uint8Array {
  const raw = base64UrlDecode(input);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    const code = raw.charCodeAt(i);
    bytes[i] = code;
  }
  return bytes;
}

function parseJwt(token: string): { header: JwtHeader; payload: OAuthIdTokenClaims; signingInput: string; signature: Uint8Array } {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new AuthError("Invalid identity token");
  }

  const encodedHeader = parts[0];
  const encodedPayload = parts[1];
  const encodedSignature = parts[2];
  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    throw new AuthError("Invalid identity token");
  }

  const header = JSON.parse(base64UrlDecode(encodedHeader)) as JwtHeader;
  const payload = JSON.parse(base64UrlDecode(encodedPayload)) as OAuthIdTokenClaims;
  const signature = base64UrlToBytes(encodedSignature);

  return {
    header,
    payload,
    signingInput: `${encodedHeader}.${encodedPayload}`,
    signature,
  };
}

async function getJwks(jwksUrl: string): Promise<JsonWebKey[]> {
  const cached = jwksCache.get(jwksUrl);
  const nowMs = Date.now();
  if (cached && cached.expiresAt > nowMs) {
    return cached.keys;
  }

  const response = await fetch(jwksUrl);
  if (!response.ok) {
    throw new AuthError("Failed to validate identity token");
  }

  const data = await response.json() as JwksResponse;
  if (!Array.isArray(data.keys)) {
    throw new AuthError("Invalid identity provider key set");
  }

  const cacheControl = response.headers.get("cache-control") ?? "";
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  const maxAge = maxAgeMatch ? Number.parseInt(maxAgeMatch[1] ?? "", 10) : 3600;
  const ttlMs = Number.isFinite(maxAge) && maxAge > 0 ? maxAge * 1000 : 3600 * 1000;

  jwksCache.set(jwksUrl, {
    expiresAt: nowMs + ttlMs,
    keys: data.keys,
  });

  return data.keys;
}

async function verifyJwtSignature(token: string, jwksUrl: string): Promise<OAuthIdTokenClaims> {
  const parsed = parseJwt(token);
  if (parsed.header.alg !== "RS256") {
    throw new AuthError("Unsupported identity token algorithm");
  }
  if (!parsed.header.kid) {
    throw new AuthError("Identity token missing key id");
  }

  const keys = await getJwks(jwksUrl);
  const key = keys.find((entry) => {
    const typed = entry as JsonWebKey & { kid?: string; kty?: string };
    return typed.kid === parsed.header.kid && typed.kty === "RSA";
  });
  if (!key) {
    throw new AuthError("Unable to verify identity token key");
  }

  const cryptoKey = await crypto.subtle.importKey(
    "jwk",
    key,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["verify"],
  );

  const signatureValid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    parsed.signature as unknown as BufferSource,
    new TextEncoder().encode(parsed.signingInput),
  );
  if (!signatureValid) {
    throw new AuthError("Identity token signature is invalid");
  }

  return parsed.payload;
}

function claimHasAudience(aud: string | string[], expected: string): boolean {
  if (typeof aud === "string") {
    return aud === expected;
  }
  return aud.includes(expected);
}

function validateCommonClaims(
  claims: OAuthIdTokenClaims,
  expectedAudience: string,
  issuers: Set<string>,
  expectedNonce: string,
): OAuthIdTokenClaims {
  const now = Math.floor(Date.now() / 1000);

  if (!issuers.has(claims.iss)) {
    throw new AuthError("Identity token issuer mismatch");
  }
  if (!claimHasAudience(claims.aud, expectedAudience)) {
    throw new AuthError("Identity token audience mismatch");
  }
  if (!Number.isFinite(claims.exp) || claims.exp <= now - 30) {
    throw new AuthError("Identity token is expired");
  }
  if (claims.iat && claims.iat > now + 300) {
    throw new AuthError("Identity token issued-at time is invalid");
  }
  if (!claims.sub) {
    throw new AuthError("Identity token subject missing");
  }
  if (!claims.nonce || claims.nonce !== expectedNonce) {
    throw new AuthError("Identity token nonce mismatch");
  }

  return claims;
}

function resolveSourcePath(source: string | null): "/auth/login" | "/auth/register" {
  return source === "register" ? "/auth/register" : "/auth/login";
}

function ensureProvider(provider: string): OAuthProvider {
  if (provider === "google" || provider === "apple" || provider === "meta") {
    return provider;
  }
  throw new ValidationError("Unsupported OAuth provider");
}

export function safeRedirectPath(value: string | null | undefined): string {
  if (!value) {
    return DEFAULT_POST_AUTH_REDIRECT;
  }
  if (!value.startsWith("/") || value.startsWith("//")) {
    return DEFAULT_POST_AUTH_REDIRECT;
  }
  return value;
}

export function getOAuthStateCookieName() {
  return OAUTH_STATE_COOKIE_NAME;
}

export function getOAuthStateCookieMaxAge() {
  return OAUTH_STATE_COOKIE_MAX_AGE;
}

export function parseOAuthStateCookie(rawValue: string | undefined): OAuthStatePayload | null {
  if (!rawValue) return null;
  try {
    const parsed = JSON.parse(rawValue) as Partial<OAuthStatePayload>;
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.provider !== "google" && parsed.provider !== "apple" && parsed.provider !== "meta") return null;
    if (!parsed.state || !parsed.nonce) return null;
    const sourcePath = parsed.sourcePath === "/auth/register" ? "/auth/register" : "/auth/login";
    return {
      provider: parsed.provider,
      state: parsed.state,
      nonce: parsed.nonce,
      redirect: safeRedirectPath(parsed.redirect),
      sourcePath,
    };
  } catch {
    return null;
  }
}

export function createOAuthState(
  providerParam: string,
  redirectParam: string | null,
  sourceParam: string | null,
): OAuthStatePayload {
  const provider = ensureProvider(providerParam);
  return {
    provider,
    state: crypto.randomUUID(),
    nonce: crypto.randomUUID(),
    redirect: safeRedirectPath(redirectParam),
    sourcePath: resolveSourcePath(sourceParam),
  };
}

function oauthRedirectUri(appUrl: string, provider: OAuthProvider): string {
  return `${appUrl.replace(/\/$/, "")}/api/auth/oauth/${provider}/callback`;
}

export function buildProviderAuthorizationUrl(provider: OAuthProvider, env: Env, state: OAuthStatePayload): string {
  const redirectUri = oauthRedirectUri(env.APP_URL, provider);

  if (provider === "google") {
    if (!env.GOOGLE_CLIENT_ID) {
      throw new ValidationError("Missing Google OAuth client configuration");
    }
    const url = new URL(GOOGLE_AUTH_URL);
    url.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("state", state.state);
    url.searchParams.set("nonce", state.nonce);
    url.searchParams.set("prompt", "select_account");
    return url.toString();
  }

  if (provider === "apple") {
    if (!env.APPLE_CLIENT_ID) {
      throw new ValidationError("Missing Apple OAuth client configuration");
    }
    const url = new URL(APPLE_AUTH_URL);
    url.searchParams.set("client_id", env.APPLE_CLIENT_ID);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("response_mode", "query");
    url.searchParams.set("scope", "name email");
    url.searchParams.set("state", state.state);
    url.searchParams.set("nonce", state.nonce);
    return url.toString();
  }

  if (!env.META_CLIENT_ID) {
    throw new ValidationError("Missing Meta OAuth client configuration");
  }
  const url = new URL(META_AUTH_URL);
  url.searchParams.set("client_id", env.META_CLIENT_ID);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "email,public_profile");
  url.searchParams.set("state", state.state);
  return url.toString();
}

interface TokenExchangeResult {
  idToken: string;
}

async function exchangeAuthCode(
  tokenEndpoint: string,
  params: Record<string, string>,
): Promise<TokenExchangeResult> {
  const body = new URLSearchParams(params);
  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const data = await response.json().catch(() => ({} as Record<string, unknown>));
  if (!response.ok) {
    throw new AuthError("OAuth code exchange failed");
  }

  const tokenData = data as { id_token?: unknown };
  const idToken = typeof tokenData.id_token === "string" ? tokenData.id_token : "";
  if (!idToken) {
    throw new AuthError("Identity token not returned by provider");
  }

  return { idToken };
}

export async function exchangeCodeForIdToken(
  provider: OAuthProvider,
  code: string,
  env: Env,
): Promise<TokenExchangeResult> {
  if (provider === "meta") {
    throw new ValidationError("Meta OAuth does not return id_token");
  }
  const redirectUri = oauthRedirectUri(env.APP_URL, provider);

  if (provider === "google") {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      throw new ValidationError("Missing Google OAuth credentials");
    }
    return exchangeAuthCode(GOOGLE_TOKEN_URL, {
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    });
  }

  if (!env.APPLE_CLIENT_ID || !env.APPLE_CLIENT_SECRET) {
    throw new ValidationError("Missing Apple OAuth credentials");
  }
  return exchangeAuthCode(APPLE_TOKEN_URL, {
    client_id: env.APPLE_CLIENT_ID,
    client_secret: env.APPLE_CLIENT_SECRET,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });
}

export async function exchangeCodeForMetaAccessToken(
  code: string,
  env: Env,
): Promise<string> {
  if (!env.META_CLIENT_ID || !env.META_CLIENT_SECRET) {
    throw new ValidationError("Missing Meta OAuth credentials");
  }
  const redirectUri = oauthRedirectUri(env.APP_URL, "meta");
  const url = new URL(META_TOKEN_URL);
  url.searchParams.set("client_id", env.META_CLIENT_ID);
  url.searchParams.set("client_secret", env.META_CLIENT_SECRET);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("code", code);

  const response = await fetch(url.toString(), { method: "GET" });
  const data = await response.json().catch(() => ({} as Record<string, unknown>));
  if (!response.ok) {
    throw new AuthError("Meta OAuth code exchange failed");
  }

  const tokenData = data as { access_token?: unknown };
  const accessToken = typeof tokenData.access_token === "string" ? tokenData.access_token : "";
  if (!accessToken) {
    throw new AuthError("Meta access token not returned");
  }
  return accessToken;
}

interface MetaProfile {
  id: string;
  email?: string;
  name?: string;
}

export async function fetchMetaProfile(accessToken: string): Promise<MetaProfile> {
  const url = new URL(META_GRAPH_ME_URL);
  url.searchParams.set("fields", "id,name,email");
  url.searchParams.set("access_token", accessToken);
  const response = await fetch(url.toString());
  const data = await response.json().catch(() => ({} as Record<string, unknown>));
  if (!response.ok) {
    throw new AuthError("Failed to fetch Meta profile");
  }

  const profile = data as { id?: unknown; email?: unknown; name?: unknown };
  const id = typeof profile.id === "string" ? profile.id : "";
  if (!id) {
    throw new AuthError("Meta profile id missing");
  }

  const email = typeof profile.email === "string" ? profile.email.toLowerCase().trim() : undefined;
  const name = typeof profile.name === "string" ? profile.name.trim() : undefined;

  return { id, email, name };
}

interface VerifyIdTokenOptions {
  provider: OAuthProvider;
  idToken: string;
  expectedNonce: string;
  env: Env;
}

export async function verifyProviderIdToken(options: VerifyIdTokenOptions): Promise<OAuthIdTokenClaims> {
  const { provider, idToken, expectedNonce, env } = options;

  if (provider === "google") {
    if (!env.GOOGLE_CLIENT_ID) {
      throw new ValidationError("Missing Google OAuth client id");
    }
    const claims = await verifyJwtSignature(idToken, GOOGLE_JWKS_URL);
    const validated = validateCommonClaims(claims, env.GOOGLE_CLIENT_ID, GOOGLE_ISSUERS, expectedNonce);
    if (validated.email && (validated.email_verified === false || validated.email_verified === "false")) {
      throw new AuthError("Google account email is not verified");
    }
    return validated;
  }

  if (provider === "apple") {
    if (!env.APPLE_CLIENT_ID) {
      throw new ValidationError("Missing Apple OAuth client id");
    }
    const claims = await verifyJwtSignature(idToken, APPLE_JWKS_URL);
    return validateCommonClaims(claims, env.APPLE_CLIENT_ID, APPLE_ISSUERS, expectedNonce);
  }

  throw new ValidationError("Meta OAuth does not use ID token validation");
}

interface AppleUserPayload {
  name?: {
    firstName?: string;
    lastName?: string;
  };
  email?: string;
}

export function parseAppleUserPayload(raw: string | undefined): { name?: string; email?: string } {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as AppleUserPayload;
    const first = parsed.name?.firstName?.trim() ?? "";
    const last = parsed.name?.lastName?.trim() ?? "";
    const fullName = `${first} ${last}`.trim();
    const email = parsed.email?.toLowerCase().trim();
    return {
      name: fullName || undefined,
      email: email || undefined,
    };
  } catch {
    return {};
  }
}
