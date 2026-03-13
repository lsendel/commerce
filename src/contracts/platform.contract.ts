import { initContract } from "@ts-rest/core";
import { z } from "zod";

const c = initContract();
const errorSchema = z.object({ error: z.string() });

export const createStoreSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
  subdomain: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/).optional(),
});

export const updateStoreSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/).optional(),
  subdomain: z.string().min(2).max(50).optional(),
  logo: z.string().url().optional(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export const addMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["admin", "staff"]),
});

export const addDomainSchema = z.object({
  domain: z.string().min(3).max(253),
});

export const subscribePlanSchema = z.object({
  planId: z.string().uuid(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "staff"]),
});

export const acceptInvitationParamsSchema = z.object({
  token: z.string().min(1),
});

export const memberPathParamsSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
});

export const changeMemberRoleSchema = z.object({
  role: z.enum(["admin", "staff"]),
});

export const platformContract = c.router({
  createStore: {
    method: "POST",
    path: "/api/platform/stores",
    body: createStoreSchema,
    responses: {
      201: c.type<{ id: string; slug: string }>(),
      409: errorSchema,
      500: errorSchema,
    },
  },
  listStores: {
    method: "GET",
    path: "/api/platform/stores",
    query: z.object({ page: z.coerce.number().optional(), limit: z.coerce.number().optional() }),
    responses: {
      200: c.type<{ stores: any[] }>(),
      401: errorSchema,
      403: errorSchema,
    },
  },
  getStore: {
    method: "GET",
    path: "/api/platform/stores/:id",
    responses: {
      200: c.type<{ store: any }>(),
      401: errorSchema,
      404: errorSchema,
    },
  },
  updateStore: {
    method: "PATCH",
    path: "/api/platform/stores/:id",
    body: updateStoreSchema,
    responses: {
      200: c.type<{ store: any }>(),
      401: errorSchema,
      404: errorSchema,
    },
  },
  getMembers: {
    method: "GET",
    path: "/api/platform/stores/:id/members",
    responses: {
      200: c.type<{ members: any[] }>(),
      401: errorSchema,
    },
  },
  addMember: {
    method: "POST",
    path: "/api/platform/stores/:id/members",
    body: addMemberSchema,
    responses: {
      201: c.type<{ member: any }>(),
      401: errorSchema,
    },
  },
  removeMember: {
    method: "DELETE",
    path: "/api/platform/stores/:id/members/:userId",
    pathParams: memberPathParamsSchema,
    body: z.object({}).optional(),
    responses: {
      200: z.object({ ok: z.boolean() }),
      401: errorSchema,
    },
  },
  changeMemberRole: {
    method: "PATCH",
    path: "/api/platform/stores/:id/members/:userId/role",
    pathParams: memberPathParamsSchema,
    body: changeMemberRoleSchema,
    responses: {
      200: c.type<{ member: any }>(),
      401: errorSchema,
      403: errorSchema,
      404: errorSchema,
      409: errorSchema,
    },
  },
  inviteMember: {
    method: "POST",
    path: "/api/platform/stores/:id/invite",
    body: inviteMemberSchema,
    responses: {
      201: c.type<{ invitation: any }>(),
      401: errorSchema,
      404: errorSchema,
      409: errorSchema,
    },
  },
  acceptInvitation: {
    method: "POST",
    path: "/api/platform/invitations/:token/accept",
    pathParams: acceptInvitationParamsSchema,
    body: z.object({}).optional(),
    responses: {
      200: c.type<{ member: any; storeId: string }>(),
      401: errorSchema,
      404: errorSchema,
      409: errorSchema,
      410: errorSchema,
    },
  },
  uploadLogo: {
    method: "POST",
    path: "/api/platform/stores/:id/logo",
    body: c.type<FormData>(),
    responses: {
      200: z.object({ logoUrl: z.string() }),
      400: errorSchema,
      401: errorSchema,
      404: errorSchema,
    },
  },
  getDomains: {
    method: "GET",
    path: "/api/platform/stores/:id/domains",
    responses: {
      200: c.type<{ domains: any[] }>(),
      401: errorSchema,
    },
  },
  addDomain: {
    method: "POST",
    path: "/api/platform/stores/:id/domains",
    body: addDomainSchema,
    responses: {
      201: c.type<{ domain: any }>(),
      401: errorSchema,
    },
  },
  verifyDomain: {
    method: "POST",
    path: "/api/platform/stores/:id/domains/:domainId/verify",
    body: z.object({}),
    responses: {
      200: c.type<{ domain: any }>(),
      401: errorSchema,
    },
  },
  getDashboard: {
    method: "GET",
    path: "/api/platform/stores/:id/dashboard",
    responses: {
      200: c.type<{ dashboard: any }>(),
      401: errorSchema,
    },
  },
  subscribePlan: {
    method: "POST",
    path: "/api/platform/stores/:id/billing/subscribe",
    body: subscribePlanSchema,
    responses: {
      200: c.type<{ billing: any }>(),
      401: errorSchema,
      404: errorSchema,
    },
  },
  connectOnboard: {
    method: "POST",
    path: "/api/platform/stores/:id/connect/onboard",
    body: z.object({}),
    responses: {
      200: c.type<{ url: string }>(),
      401: errorSchema,
      404: errorSchema,
    },
  },
  getBilling: {
    method: "GET",
    path: "/api/platform/stores/:id/billing",
    responses: {
      200: c.type<{ billing: any }>(),
      401: errorSchema,
    },
  },
  getPlans: {
    method: "GET",
    path: "/api/platform/plans",
    responses: { 200: c.type<{ plans: any[] }>() },
  },
});
