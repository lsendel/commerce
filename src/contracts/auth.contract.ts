import { initContract } from "@ts-rest/core";
import { z } from "zod";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  updateProfileSchema,
  changePasswordSchema,
  addressSchema,
  idParamSchema,
} from "../shared/validators";

const c = initContract();
const errorSchema = z.object({ error: z.string() });
const successSchema = z.object({ success: z.literal(true) });
const profileSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  phone: z.string().nullable(),
  stripeCustomerId: z.string().nullable(),
});
const addressEntitySchema = z.object({
  id: z.string(),
  userId: z.string(),
  label: z.string().nullable(),
  street: z.string(),
  city: z.string(),
  state: z.string().nullable(),
  zip: z.string(),
  country: z.string(),
  isDefault: z.boolean(),
  createdAt: z.coerce.date().nullable(),
  updatedAt: z.coerce.date().nullable(),
});

export const authContract = c.router({
  register: {
    method: "POST",
    path: "/api/auth/register",
    body: registerSchema,
    responses: {
      201: z.object({ id: z.string(), email: z.string(), name: z.string() }),
      409: errorSchema,
    },
  },
  login: {
    method: "POST",
    path: "/api/auth/login",
    body: loginSchema,
    responses: {
      200: z.object({ id: z.string(), email: z.string(), name: z.string() }),
      401: errorSchema,
      400: errorSchema,
    },
  },
  logout: {
    method: "POST",
    path: "/api/auth/logout",
    body: z.object({}).optional(),
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
      401: errorSchema,
    },
  },
  profile: {
    method: "GET",
    path: "/api/auth/profile",
    responses: {
      200: profileSchema,
      401: errorSchema,
      404: errorSchema,
    },
  },
  updateProfile: {
    method: "PATCH",
    path: "/api/auth/profile",
    body: updateProfileSchema,
    responses: {
      200: successSchema,
      401: errorSchema,
      404: errorSchema,
    },
  },
  deleteProfile: {
    method: "DELETE",
    path: "/api/auth/profile",
    body: z.object({}).optional(),
    responses: {
      200: z.object({ success: z.boolean() }),
      401: errorSchema,
      404: errorSchema,
    },
  },
  forgotPassword: {
    method: "POST",
    path: "/api/auth/forgot-password",
    body: forgotPasswordSchema,
    responses: {
      200: successSchema,
      400: errorSchema,
    },
  },
  resetPassword: {
    method: "POST",
    path: "/api/auth/reset-password",
    body: resetPasswordSchema,
    responses: {
      200: successSchema,
      400: errorSchema,
      410: errorSchema,
    },
  },
  verifyEmail: {
    method: "POST",
    path: "/api/auth/verify-email",
    body: verifyEmailSchema,
    responses: {
      200: successSchema,
      400: errorSchema,
      410: errorSchema,
    },
  },
  requestVerification: {
    method: "POST",
    path: "/api/auth/request-verification",
    body: z.object({}).optional(),
    responses: {
      200: z.object({
        success: z.boolean(),
        message: z.string().optional(),
      }),
      401: errorSchema,
      404: errorSchema,
    },
  },
  changePassword: {
    method: "POST",
    path: "/api/auth/change-password",
    body: changePasswordSchema,
    responses: {
      200: successSchema,
      401: errorSchema,
      404: errorSchema,
    },
  },
  listAddresses: {
    method: "GET",
    path: "/api/auth/addresses",
    responses: {
      200: z.array(addressEntitySchema),
      401: errorSchema,
    },
  },
  createAddress: {
    method: "POST",
    path: "/api/auth/addresses",
    body: addressSchema,
    responses: {
      201: addressEntitySchema,
      401: errorSchema,
      400: errorSchema,
    },
  },
  updateAddress: {
    method: "PATCH",
    path: "/api/auth/addresses/:id",
    pathParams: idParamSchema,
    body: addressSchema.partial(),
    responses: {
      200: addressEntitySchema,
      401: errorSchema,
      404: errorSchema,
      400: errorSchema,
    },
  },
  deleteAddress: {
    method: "DELETE",
    path: "/api/auth/addresses/:id",
    pathParams: idParamSchema,
    body: z.object({}).optional(),
    responses: {
      200: z.object({ success: z.boolean() }),
      401: errorSchema,
      404: errorSchema,
    },
  },
});
