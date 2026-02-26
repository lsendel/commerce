import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { setCookie, deleteCookie } from "hono/cookie";
import type { Env } from "../../env";
import { createDb } from "../../infrastructure/db/client";
import { UserRepository } from "../../infrastructure/repositories/user.repository";
import { RegisterUseCase } from "../../application/identity/register.usecase";
import { LoginUseCase } from "../../application/identity/login.usecase";
import { GetProfileUseCase } from "../../application/identity/get-profile.usecase";
import { ManageAddressesUseCase } from "../../application/identity/manage-addresses.usecase";
import { RequestPasswordResetUseCase } from "../../application/identity/request-password-reset.usecase";
import { ResetPasswordUseCase } from "../../application/identity/reset-password.usecase";
import { VerifyEmailUseCase } from "../../application/identity/verify-email.usecase";
import { UpdateProfileUseCase } from "../../application/identity/update-profile.usecase";
import { ChangePasswordUseCase } from "../../application/identity/change-password.usecase";
import { signJwt } from "../../infrastructure/security/jwt";
import {
  registerSchema, loginSchema, addressSchema,
  forgotPasswordSchema, resetPasswordSchema, verifyEmailSchema,
  updateProfileSchema, changePasswordSchema,
} from "../../shared/validators";
import { AUTH_COOKIE_NAME, AUTH_COOKIE_MAX_AGE } from "../../shared/constants";
import { requireAuth } from "../../middleware/auth.middleware";
import { rateLimit } from "../../middleware/rate-limit.middleware";

const auth = new Hono<{ Bindings: Env }>();

// Rate limit auth endpoints
auth.use("/register", rateLimit({ windowMs: 60_000, max: 5 }));
auth.use("/login", rateLimit({ windowMs: 60_000, max: 10 }));
auth.use("/forgot-password", rateLimit({ windowMs: 60_000, max: 3 }));

auth.post("/register", zValidator("json", registerSchema), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const useCase = new RegisterUseCase(new UserRepository(db));
  const user = await useCase.execute(c.req.valid("json"));

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
