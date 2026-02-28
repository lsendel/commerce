import { Hono } from "hono";
import type { Context } from "hono";
import { zValidator } from "@hono/zod-validator";
import { setCookie, deleteCookie, getCookie } from "hono/cookie";
import type { Env } from "../../env";
import { createDb } from "../../infrastructure/db/client";
import { UserRepository } from "../../infrastructure/repositories/user.repository";
import { AnalyticsRepository } from "../../infrastructure/repositories/analytics.repository";
import { RegisterUseCase } from "../../application/identity/register.usecase";
import { LoginUseCase } from "../../application/identity/login.usecase";
import { TrackEventUseCase } from "../../application/analytics/track-event.usecase";
import { GetProfileUseCase } from "../../application/identity/get-profile.usecase";
import { ManageAddressesUseCase } from "../../application/identity/manage-addresses.usecase";
import { RequestPasswordResetUseCase } from "../../application/identity/request-password-reset.usecase";
import { ResetPasswordUseCase } from "../../application/identity/reset-password.usecase";
import { VerifyEmailUseCase } from "../../application/identity/verify-email.usecase";
import { UpdateProfileUseCase } from "../../application/identity/update-profile.usecase";
import { ChangePasswordUseCase } from "../../application/identity/change-password.usecase";
import { signJwt } from "../../infrastructure/security/jwt";
import { hashPassword } from "../../infrastructure/security/crypto";
import {
  registerSchema, loginSchema, addressSchema,
  forgotPasswordSchema, resetPasswordSchema, verifyEmailSchema,
  updateProfileSchema, changePasswordSchema,
} from "../../shared/validators";
import { AUTH_COOKIE_NAME, AUTH_COOKIE_MAX_AGE } from "../../shared/constants";
import { requireAuth } from "../../middleware/auth.middleware";
import { rateLimit } from "../../middleware/rate-limit.middleware";
import { AuthError } from "../../shared/errors";
import {
  buildProviderAuthorizationUrl,
  createOAuthState,
  exchangeCodeForIdToken,
  exchangeCodeForMetaAccessToken,
  fetchMetaProfile,
  getOAuthStateCookieMaxAge,
  getOAuthStateCookieName,
  parseAppleUserPayload,
  parseOAuthStateCookie,
  safeRedirectPath,
  verifyProviderIdToken,
  type OAuthProvider,
} from "../../infrastructure/security/oauth";

const auth = new Hono<{ Bindings: Env }>();

// Rate limit auth endpoints
auth.use("/register", rateLimit({ windowMs: 60_000, max: 5 }));
auth.use("/login", rateLimit({ windowMs: 60_000, max: 10 }));
auth.use("/forgot-password", rateLimit({ windowMs: 60_000, max: 3 }));

function getProvider(providerParam: string): OAuthProvider {
  if (providerParam === "google" || providerParam === "apple" || providerParam === "meta") {
    return providerParam;
  }
  throw new AuthError("Unsupported OAuth provider");
}

function oauthErrorRedirect(message: string, sourcePath: "/auth/login" | "/auth/register" = "/auth/login") {
  const params = new URLSearchParams({ error: message });
  return `${sourcePath}?${params.toString()}`;
}

function oauthCookieOptions() {
  return {
    httpOnly: true as const,
    secure: true as const,
    sameSite: "Lax" as const,
    maxAge: getOAuthStateCookieMaxAge(),
    path: "/api/auth/oauth",
  };
}

async function resolveOrCreateOAuthUser(args: {
  provider: OAuthProvider;
  providerSub: string;
  email?: string;
  name?: string;
  userRepo: UserRepository;
}) {
  const { provider, providerSub, userRepo } = args;
  const normalizedEmail = args.email?.toLowerCase().trim();
  const normalizedName = args.name?.trim();

  let user =
    provider === "google"
      ? await userRepo.findByGoogleSub(providerSub)
      : provider === "apple"
        ? await userRepo.findByAppleSub(providerSub)
        : await userRepo.findByMetaSub(providerSub);

  let isNew = false;

  if (!user && normalizedEmail) {
    user = await userRepo.findByEmail(normalizedEmail);
  }

  if (!user) {
    const createEmail = normalizedEmail ?? (provider === "meta" ? `meta-${providerSub}@users.petm8.local` : undefined);
    if (!createEmail) {
      throw new AuthError("Unable to determine email from OAuth provider");
    }

    const fallbackName = normalizedName || createEmail.split("@")[0] || "New User";
    const randomPasswordHash = await hashPassword(`${crypto.randomUUID()}${crypto.randomUUID()}`);
    user = await userRepo.create({
      email: createEmail,
      passwordHash: randomPasswordHash,
      name: fallbackName.slice(0, 100),
      emailVerifiedAt: new Date(),
    });
    isNew = true;
  }

  if (!user) {
    throw new AuthError("Failed to create social account");
  }

  if (!user.emailVerifiedAt) {
    await userRepo.setEmailVerified(user.id);
    user = await userRepo.findById(user.id);
  }

  if (!user) {
    throw new AuthError("Failed to load social account");
  }

  if (provider === "google") {
    if (user.googleSub && user.googleSub !== providerSub) {
      throw new AuthError("This account is already linked to another Google profile");
    }
    if (!user.googleSub) {
      await userRepo.linkGoogleSub(user.id, providerSub);
      user = await userRepo.findById(user.id);
    }
  } else if (provider === "apple") {
    if (user.appleSub && user.appleSub !== providerSub) {
      throw new AuthError("This account is already linked to another Apple profile");
    }
    if (!user.appleSub) {
      await userRepo.linkAppleSub(user.id, providerSub);
      user = await userRepo.findById(user.id);
    }
  } else {
    if (user.metaSub && user.metaSub !== providerSub) {
      throw new AuthError("This account is already linked to another Meta profile");
    }
    if (!user.metaSub) {
      await userRepo.linkMetaSub(user.id, providerSub);
      user = await userRepo.findById(user.id);
    }
  }

  if (!user) {
    throw new AuthError("Failed to complete social sign-in");
  }

  if (normalizedName && user.name !== normalizedName) {
    await userRepo.updateProfile(user.id, { name: normalizedName.slice(0, 100) });
    user = await userRepo.findById(user.id);
  }

  if (!user) {
    throw new AuthError("Failed to load social sign-in profile");
  }

  await userRepo.updateLastLogin(user.id);

  return { user, isNew };
}

function getBodyStringField(
  body: Record<string, string | File | (string | File)[]>,
  key: string,
): string | undefined {
  const value = body[key];
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
}

auth.get("/oauth/:provider/start", async (c) => {
  const statePayload = createOAuthState(
    c.req.param("provider"),
    c.req.query("redirect") ?? null,
    c.req.query("source") ?? null,
  );

  setCookie(c, getOAuthStateCookieName(), JSON.stringify(statePayload), oauthCookieOptions());
  const authorizationUrl = buildProviderAuthorizationUrl(statePayload.provider, c.env, statePayload);
  return c.redirect(authorizationUrl);
});

async function handleOAuthCallback(c: Context<{ Bindings: Env }>) {
  const provider = getProvider(c.req.param("provider"));
  const stateCookie = parseOAuthStateCookie(getCookie(c, getOAuthStateCookieName()));
  deleteCookie(c, getOAuthStateCookieName(), { path: "/api/auth/oauth" });

  const queryError = c.req.query("error");
  const queryErrorDescription = c.req.query("error_description");
  if (queryError) {
    const sourcePath = stateCookie?.sourcePath ?? "/auth/login";
    return c.redirect(
      oauthErrorRedirect(
        queryErrorDescription || `OAuth failed (${queryError})`,
        sourcePath,
      ),
    );
  }

  let code = c.req.query("code");
  let state = c.req.query("state");
  let rawAppleUser = c.req.query("user");

  if (c.req.method === "POST") {
    const body = await c.req.parseBody();
    const bodyCode = getBodyStringField(body, "code");
    const bodyState = getBodyStringField(body, "state");
    const bodyUser = getBodyStringField(body, "user");
    if (bodyCode) code = bodyCode;
    if (bodyState) state = bodyState;
    if (bodyUser) rawAppleUser = bodyUser;
  }

  const sourcePath = stateCookie?.sourcePath ?? "/auth/login";
  if (!stateCookie || stateCookie.provider !== provider || !state || state !== stateCookie.state) {
    return c.redirect(oauthErrorRedirect("Invalid OAuth state. Please try again.", sourcePath));
  }

  if (!code) {
    return c.redirect(oauthErrorRedirect("Missing OAuth authorization code.", sourcePath));
  }

  try {
    const db = createDb(c.env.DATABASE_URL);
    const userRepo = new UserRepository(db);
    const storeId = c.get("storeId") as string;

    let providerSub = "";
    let providerEmail: string | undefined;
    let providerName: string | undefined;

    if (provider === "meta") {
      const accessToken = await exchangeCodeForMetaAccessToken(code, c.env);
      const profile = await fetchMetaProfile(accessToken);
      providerSub = profile.id;
      providerEmail = profile.email;
      providerName = profile.name;
    } else {
      const tokenResult = await exchangeCodeForIdToken(provider, code, c.env);
      const claims = await verifyProviderIdToken({
        provider,
        idToken: tokenResult.idToken,
        expectedNonce: stateCookie.nonce,
        env: c.env,
      });
      const applePayload = provider === "apple" ? parseAppleUserPayload(rawAppleUser) : {};
      providerSub = claims.sub;
      providerEmail = claims.email?.toLowerCase().trim() ?? applePayload.email;
      providerName =
        claims.name
        || [claims.given_name, claims.family_name].filter(Boolean).join(" ").trim()
        || applePayload.name;
    }

    const { user, isNew } = await resolveOrCreateOAuthUser({
      provider,
      providerSub,
      email: providerEmail,
      name: providerName,
      userRepo,
    });

    try {
      const analyticsRepo = new AnalyticsRepository(db, storeId);
      const trackEventUseCase = new TrackEventUseCase(analyticsRepo);
      await trackEventUseCase.execute({
        eventType: isNew ? "signup" : "login",
        userId: user.id,
        sessionId: null,
        properties: { method: provider },
        referrer: c.req.header("referer") ?? null,
        pageUrl: null,
        userAgent: c.req.header("user-agent") ?? null,
        ip: c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for"),
      });
    } catch {
      // Analytics failures should not block social auth
    }

    const token = await signJwt(
      { sub: user.id, email: user.email, name: user.name },
      c.env.JWT_SECRET,
    );
    setCookie(c, AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
      maxAge: AUTH_COOKIE_MAX_AGE,
      path: "/",
    });

    return c.redirect(safeRedirectPath(stateCookie.redirect));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Social sign-in failed";
    return c.redirect(oauthErrorRedirect(message, sourcePath));
  }
}

auth.get("/oauth/:provider/callback", async (c) => handleOAuthCallback(c));
auth.post("/oauth/:provider/callback", async (c) => handleOAuthCallback(c));

auth.post("/register", zValidator("json", registerSchema), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const useCase = new RegisterUseCase(new UserRepository(db), c.env.NOTIFICATION_QUEUE);
  const user = await useCase.execute(c.req.valid("json"));

  try {
    const storeId = c.get("storeId") as string;
    const analyticsRepo = new AnalyticsRepository(db, storeId);
    const trackEventUseCase = new TrackEventUseCase(analyticsRepo);
    await trackEventUseCase.execute({
      eventType: "signup",
      userId: user.id,
      sessionId: c.req.header("x-session-id") ?? null,
      properties: { method: "password" },
      referrer: c.req.header("referer") ?? null,
      pageUrl: null,
      userAgent: c.req.header("user-agent") ?? null,
      ip: c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for"),
    });
  } catch {
    // Analytics failures should not block account creation
  }

  const token = await signJwt({ sub: user.id, email: user.email, name: user.name }, c.env.JWT_SECRET);
  setCookie(c, AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    maxAge: AUTH_COOKIE_MAX_AGE,
    path: "/",
  });

  return c.json(user, 201);
});

auth.post("/login", zValidator("json", loginSchema), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const useCase = new LoginUseCase(new UserRepository(db));
  const body = c.req.valid("json");
  const user = await useCase.execute(body);

  try {
    const storeId = c.get("storeId") as string;
    const analyticsRepo = new AnalyticsRepository(db, storeId);
    const trackEventUseCase = new TrackEventUseCase(analyticsRepo);
    await trackEventUseCase.execute({
      eventType: "login",
      userId: user.id,
      sessionId: c.req.header("x-session-id") ?? null,
      properties: {
        method: "password",
        rememberMe: Boolean(body.rememberMe),
      },
      referrer: c.req.header("referer") ?? null,
      pageUrl: null,
      userAgent: c.req.header("user-agent") ?? null,
      ip: c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for"),
    });
  } catch {
    // Analytics failures should not block authentication
  }

  const maxAge = user.expiresInHours * 60 * 60;
  const token = await signJwt({ sub: user.id, email: user.email, name: user.name }, c.env.JWT_SECRET);
  setCookie(c, AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    maxAge,
    path: "/",
  });

  return c.json({ id: user.id, email: user.email, name: user.name }, 200);
});

auth.post("/logout", (c) => {
  deleteCookie(c, AUTH_COOKIE_NAME, { path: "/" });
  return c.json({ success: true });
});

auth.get("/me", requireAuth(), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const useCase = new GetProfileUseCase(new UserRepository(db));
  const profile = await useCase.execute(c.get("userId"));
  return c.json(profile);
});

// Password reset
auth.post("/forgot-password", zValidator("json", forgotPasswordSchema), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const useCase = new RequestPasswordResetUseCase(new UserRepository(db));
  const result = await useCase.execute(c.req.valid("json"));
  return c.json(result);
});

auth.post("/reset-password", zValidator("json", resetPasswordSchema), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const useCase = new ResetPasswordUseCase(new UserRepository(db));
  const result = await useCase.execute(c.req.valid("json"));
  return c.json(result);
});

// Email verification
auth.post("/verify-email", zValidator("json", verifyEmailSchema), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const useCase = new VerifyEmailUseCase(new UserRepository(db));
  const result = await useCase.execute(c.req.valid("json"));
  return c.json(result);
});

// Profile management (requires auth)
auth.patch("/profile", requireAuth(), zValidator("json", updateProfileSchema), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const useCase = new UpdateProfileUseCase(new UserRepository(db));
  const result = await useCase.execute(c.get("userId"), c.req.valid("json"));
  return c.json(result);
});

auth.post("/change-password", requireAuth(), zValidator("json", changePasswordSchema), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const useCase = new ChangePasswordUseCase(new UserRepository(db));
  const result = await useCase.execute({
    userId: c.get("userId"),
    ...c.req.valid("json"),
  });
  return c.json(result);
});

// Address management (all require auth)
auth.get("/addresses", requireAuth(), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const useCase = new ManageAddressesUseCase(new UserRepository(db));
  const addresses = await useCase.list(c.get("userId"));
  return c.json(addresses);
});

auth.post("/addresses", requireAuth(), zValidator("json", addressSchema), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const useCase = new ManageAddressesUseCase(new UserRepository(db));
  const address = await useCase.create(c.get("userId"), c.req.valid("json"));
  return c.json(address, 201);
});

auth.patch("/addresses/:id", requireAuth(), zValidator("json", addressSchema.partial()), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const useCase = new ManageAddressesUseCase(new UserRepository(db));
  const address = await useCase.update(c.get("userId"), c.req.param("id"), c.req.valid("json"));
  return c.json(address);
});

auth.delete("/addresses/:id", requireAuth(), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const useCase = new ManageAddressesUseCase(new UserRepository(db));
  await useCase.remove(c.get("userId"), c.req.param("id"));
  return c.json({ success: true });
});

export { auth as authRoutes };
