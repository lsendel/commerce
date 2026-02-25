import { initContract } from "@ts-rest/core";
import { z } from "zod";

const c = initContract();

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

export const platformContract = c.router({
  createStore: {
    method: "POST",
    path: "/api/platform/stores",
    body: createStoreSchema,
    responses: { 201: c.type<{ id: string; slug: string }>() },
  },
  listStores: {
    method: "GET",
    path: "/api/platform/stores",
    query: z.object({ page: z.coerce.number().optional(), limit: z.coerce.number().optional() }),
    responses: { 200: c.type<{ stores: any[] }>() },
  },
  getStore: {
    method: "GET",
    path: "/api/platform/stores/:id",
    responses: { 200: c.type<{ store: any }>() },
  },
  updateStore: {
    method: "PATCH",
    path: "/api/platform/stores/:id",
    body: updateStoreSchema,
    responses: { 200: c.type<{ store: any }>() },
  },
  getMembers: {
    method: "GET",
    path: "/api/platform/stores/:id/members",
    responses: { 200: c.type<{ members: any[] }>() },
  },
  addMember: {
    method: "POST",
    path: "/api/platform/stores/:id/members",
    body: addMemberSchema,
    responses: { 201: c.type<{ member: any }>() },
  },
  getDomains: {
    method: "GET",
    path: "/api/platform/stores/:id/domains",
    responses: { 200: c.type<{ domains: any[] }>() },
  },
  addDomain: {
    method: "POST",
    path: "/api/platform/stores/:id/domains",
    body: addDomainSchema,
    responses: { 201: c.type<{ domain: any }>() },
  },
  verifyDomain: {
    method: "POST",
    path: "/api/platform/stores/:id/domains/:domainId/verify",
    body: z.object({}),
    responses: { 200: c.type<{ domain: any }>() },
  },
  getDashboard: {
    method: "GET",
    path: "/api/platform/stores/:id/dashboard",
    responses: { 200: c.type<{ dashboard: any }>() },
  },
  subscribePlan: {
    method: "POST",
    path: "/api/platform/stores/:id/billing/subscribe",
    body: subscribePlanSchema,
    responses: { 200: c.type<{ billing: any }>() },
  },
  connectOnboard: {
    method: "POST",
    path: "/api/platform/stores/:id/connect/onboard",
    body: z.object({}),
    responses: { 200: c.type<{ url: string }>() },
  },
  getBilling: {
    method: "GET",
    path: "/api/platform/stores/:id/billing",
    responses: { 200: c.type<{ billing: any }>() },
  },
  getPlans: {
    method: "GET",
    path: "/api/platform/plans",
    responses: { 200: c.type<{ plans: any[] }>() },
  },
});
