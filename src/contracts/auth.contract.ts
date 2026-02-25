import { initContract } from "@ts-rest/core";
import { z } from "zod";
import { registerSchema, loginSchema } from "../shared/validators";

const c = initContract();

export const authContract = c.router({
  register: {
    method: "POST",
    path: "/api/auth/register",
    body: registerSchema,
    responses: {
      201: z.object({ id: z.string(), email: z.string(), name: z.string() }),
      409: z.object({ error: z.string() }),
    },
  },
  login: {
    method: "POST",
    path: "/api/auth/login",
    body: loginSchema,
    responses: {
      200: z.object({ id: z.string(), email: z.string(), name: z.string() }),
      401: z.object({ error: z.string() }),
    },
  },
  logout: {
    method: "POST",
    path: "/api/auth/logout",
    body: z.object({}),
    responses: {
      200: z.object({ success: z.boolean() }),
    },
  },
  me: {
    method: "GET",
    path: "/api/auth/me",
    responses: {
      200: z.object({
        id: z.string(),
        email: z.string(),
        name: z.string(),
        stripeCustomerId: z.string().nullable(),
      }),
      401: z.object({ error: z.string() }),
    },
  },
});
