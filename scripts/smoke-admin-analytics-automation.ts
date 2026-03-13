import "dotenv/config";

interface RecommendationHistoryItem {
  id: string;
  actionId: string;
  title: string;
  href: string;
  appliedAt: string;
  eventType: string;
}

interface RecommendationHistoryPayload {
  history: RecommendationHistoryItem[];
}

interface RecommendationApplyResponse {
  ok: boolean;
  eventId: string | null;
  eventType: string;
  appliedAt: string;
  href: string;
}

interface AuthCredentials {
  email: string;
  password: string;
}

const APPLIED_EVENT_TYPE = "admin_recommendation_default_applied";

function normalizeBaseUrl(input: string): string {
  return input.endsWith("/") ? input.slice(0, -1) : input;
}

function isEnabled(value: string | undefined): boolean {
  const normalized = (value ?? "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function parseJsonSafe(input: string): unknown {
  if (!input.trim()) return null;
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function buildAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  const cookie = (process.env.SMOKE_COOKIE ?? "").trim();
  const authorization = (process.env.SMOKE_AUTHORIZATION ?? "").trim();
  if (cookie) headers.Cookie = cookie;
  if (authorization) headers.Authorization = authorization;
  return headers;
}

function trimEnv(key: string): string {
  return (process.env[key] ?? "").trim();
}

function resolveLoginCredentials(): AuthCredentials | null {
  const email = trimEnv("SMOKE_ADMIN_EMAIL");
  const password = trimEnv("SMOKE_ADMIN_PASSWORD");
  if (!email || !password) return null;
  return { email, password };
}

function hasAuthHeaders(headers: Record<string, string>): boolean {
  return Boolean(headers.Cookie || headers.Authorization);
}

function getSetCookieHeader(response: Response): string | null {
  const maybeHeaders = response.headers as unknown as { getSetCookie?: () => string[] };
  if (typeof maybeHeaders.getSetCookie === "function") {
    const values = maybeHeaders.getSetCookie();
    return values.length > 0 ? values[0] ?? null : null;
  }
  return response.headers.get("set-cookie");
}

function extractCookiePair(setCookieValue: string | null): string | null {
  if (!setCookieValue) return null;
  const [firstPart] = setCookieValue.split(";");
  const cookie = firstPart?.trim() ?? "";
  return cookie.includes("=") ? cookie : null;
}

function withJsonContentType(headers: Record<string, string>) {
  return {
    ...headers,
    "Content-Type": "application/json",
  };
}

async function requestText(input: {
  baseUrl: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  body?: unknown;
}) {
  const startedAt = Date.now();
  const response = await fetch(`${input.baseUrl}${input.path}`, {
    method: input.method,
    headers: input.body ? withJsonContentType(input.headers) : input.headers,
    body: input.body ? JSON.stringify(input.body) : undefined,
    redirect: "manual",
  });
  return {
    status: response.status,
    body: await response.text(),
    durationMs: Date.now() - startedAt,
  };
}

async function loginAndBuildAuthHeaders(baseUrl: string): Promise<Record<string, string> | null> {
  const credentials = resolveLoginCredentials();
  if (!credentials) return null;

  const startedAt = Date.now();
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: credentials.email,
      password: credentials.password,
      rememberMe: true,
    }),
    redirect: "manual",
  });
  const body = await response.text();
  invariant(response.status === 200, `POST /api/auth/login expected 200, received ${response.status}: ${body.slice(0, 180)}`);

  const cookie = extractCookiePair(getSetCookieHeader(response));
  invariant(cookie, "POST /api/auth/login succeeded but did not provide an auth cookie");
  const durationMs = Date.now() - startedAt;
  console.log(`POST /api/auth/login -> 200 (${durationMs}ms)`);
  return {
    Accept: "application/json",
    Cookie: cookie,
  };
}

function parseHistoryPayload(raw: unknown): RecommendationHistoryPayload {
  invariant(raw !== null && typeof raw === "object", "recommendation history payload must be an object");
  const payload = raw as { history?: unknown };
  invariant(Array.isArray(payload.history), "recommendation history payload must include history array");

  const history = payload.history.map((item) => {
    invariant(item !== null && typeof item === "object", "recommendation history item must be an object");
    const row = item as Record<string, unknown>;
    const id = row.id;
    invariant(typeof id === "string" && id.length > 0, "recommendation history item id is required");
    const actionId = row.actionId;
    invariant(
      typeof actionId === "string" && actionId.length > 0,
      "recommendation history item actionId is required",
    );
    const title = row.title;
    invariant(typeof title === "string" && title.length > 0, "recommendation history item title is required");
    const href = row.href;
    invariant(typeof href === "string" && href.startsWith("/"), "recommendation history item href must be relative");
    const appliedAt = row.appliedAt;
    invariant(
      typeof appliedAt === "string" && appliedAt.length > 0,
      "recommendation history item appliedAt is required",
    );
    const eventType = row.eventType;
    invariant(
      typeof eventType === "string" && eventType.length > 0,
      "recommendation history item eventType is required",
    );
    return {
      id,
      actionId,
      title,
      href,
      appliedAt,
      eventType,
    };
  });

  return { history };
}

function parseApplyPayload(raw: unknown): RecommendationApplyResponse {
  invariant(raw !== null && typeof raw === "object", "recommendation apply payload must be an object");
  const payload = raw as Record<string, unknown>;
  const ok = payload.ok;
  invariant(ok === true, "recommendation apply payload must include ok=true");
  const eventType = payload.eventType;
  invariant(
    typeof eventType === "string" && eventType.length > 0,
    "recommendation apply payload must include eventType",
  );
  const appliedAt = payload.appliedAt;
  invariant(
    typeof appliedAt === "string" && appliedAt.length > 0,
    "recommendation apply payload must include appliedAt",
  );
  const href = payload.href;
  invariant(
    typeof href === "string" && href.startsWith("/"),
    "recommendation apply payload must include relative href",
  );
  const eventId = payload.eventId;
  invariant(
    eventId === null || typeof eventId === "string",
    "recommendation apply payload eventId must be string|null",
  );
  return {
    ok,
    eventId,
    eventType,
    appliedAt,
    href,
  };
}

async function main() {
  const baseUrl = normalizeBaseUrl(process.env.SMOKE_BASE_URL ?? "https://petm8.io");
  const requireAuth = isEnabled(process.env.SMOKE_ADMIN_ANALYTICS_REQUIRE_AUTH);
  let authHeaders = buildAuthHeaders();
  if (!hasAuthHeaders(authHeaders)) {
    const loginAuthHeaders = await loginAndBuildAuthHeaders(baseUrl);
    if (loginAuthHeaders) authHeaders = loginAuthHeaders;
  }

  if (!hasAuthHeaders(authHeaders)) {
    if (requireAuth) {
      throw new Error(
        "Admin analytics automation smoke requires authentication but no auth headers or login credentials were provided.",
      );
    }
    console.log([
      "Admin analytics automation smoke skipped:",
      "provide SMOKE_COOKIE or SMOKE_AUTHORIZATION,",
      "or provide SMOKE_ADMIN_EMAIL and SMOKE_ADMIN_PASSWORD for login bootstrap.",
    ].join(" "));
    return;
  }

  const pageResponse = await requestText({
    baseUrl,
    method: "GET",
    path: "/admin/analytics",
    headers: {
      ...authHeaders,
      Accept: "text/html",
    },
  });
  invariant(pageResponse.status === 200, `GET /admin/analytics expected 200, received ${pageResponse.status}`);
  invariant(
    pageResponse.body.includes("data-recommendation-apply"),
    "admin analytics page is missing recommendation apply controls",
  );
  invariant(
    pageResponse.body.includes("data-analytics-automation-center"),
    "admin analytics page is missing automation center root",
  );
  invariant(
    pageResponse.body.includes("/api/analytics/recommendations/history"),
    "admin analytics page is missing recommendation history wiring",
  );
  console.log(`GET /admin/analytics -> 200 (${pageResponse.durationMs}ms)`);

  const historyBefore = await requestText({
    baseUrl,
    method: "GET",
    path: "/api/analytics/recommendations/history?limit=20",
    headers: authHeaders,
  });
  invariant(
    historyBefore.status === 200,
    `GET /api/analytics/recommendations/history expected 200, received ${historyBefore.status}`,
  );
  const historyBeforePayload = parseHistoryPayload(parseJsonSafe(historyBefore.body));
  console.log(
    `GET /api/analytics/recommendations/history -> 200 (${historyBefore.durationMs}ms, items=${historyBeforePayload.history.length})`,
  );

  const actionId = `smoke-admin-analytics-${Date.now()}`;
  const applyRequest = await requestText({
    baseUrl,
    method: "POST",
    path: "/api/analytics/recommendations/apply",
    headers: authHeaders,
    body: {
      actionId,
      title: "Smoke automation coverage apply",
      detail: "Validates admin analytics default-automation workflow.",
      href: "/admin/analytics",
      payload: {
        source: "smoke-admin-analytics-automation",
        runId: actionId,
      },
      context: {
        dateFrom: "2026-03-01",
        dateTo: "2026-03-05",
      },
    },
  });
  invariant(
    applyRequest.status === 201,
    `POST /api/analytics/recommendations/apply expected 201, received ${applyRequest.status}`,
  );
  const applyPayload = parseApplyPayload(parseJsonSafe(applyRequest.body));
  invariant(
    applyPayload.eventType === APPLIED_EVENT_TYPE,
    `recommendation apply returned unexpected event type: ${applyPayload.eventType}`,
  );
  console.log(`POST /api/analytics/recommendations/apply -> 201 (${applyRequest.durationMs}ms)`);

  const historyAfter = await requestText({
    baseUrl,
    method: "GET",
    path: "/api/analytics/recommendations/history?limit=20",
    headers: authHeaders,
  });
  invariant(
    historyAfter.status === 200,
    `GET /api/analytics/recommendations/history (after apply) expected 200, received ${historyAfter.status}`,
  );
  const historyAfterPayload = parseHistoryPayload(parseJsonSafe(historyAfter.body));
  const found = historyAfterPayload.history.find((item) => item.actionId === actionId);
  invariant(found, `applied recommendation actionId not found in history: ${actionId}`);
  console.log(
    `GET /api/analytics/recommendations/history (after apply) -> 200 (${historyAfter.durationMs}ms, items=${historyAfterPayload.history.length})`,
  );

  console.log("Admin analytics automation smoke passed.");
}

main().catch((error) => {
  console.error(
    `Admin analytics automation smoke failed: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
  process.exitCode = 1;
});
