import { initContract } from "@ts-rest/core";
import { z } from "zod";

const c = initContract();

export const registerAffiliateSchema = z.object({
  customSlug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/).optional(),
  parentCode: z.string().optional(),
});

export const createLinkSchema = z.object({
  targetUrl: z.string().url(),
});

export const affiliatesContract = c.router({
  register: {
    method: "POST",
    path: "/api/affiliates/register",
    body: registerAffiliateSchema,
    responses: { 201: c.type<{ affiliate: any }>() },
  },
  getDashboard: {
    method: "GET",
    path: "/api/affiliates/dashboard",
    responses: {
      200: c.type<{
        affiliate: any;
        recentConversions: any[];
        recentClicks: number;
      }>(),
    },
  },
  createLink: {
    method: "POST",
    path: "/api/affiliates/links",
    body: createLinkSchema,
    responses: { 201: c.type<{ link: any }>() },
  },
  getLinks: {
    method: "GET",
    path: "/api/affiliates/links",
    responses: { 200: c.type<{ links: any[] }>() },
  },
  getConversions: {
    method: "GET",
    path: "/api/affiliates/conversions",
    query: z.object({ page: z.coerce.number().optional() }),
    responses: { 200: c.type<{ conversions: any[] }>() },
  },
  getPayouts: {
    method: "GET",
    path: "/api/affiliates/payouts",
    responses: { 200: c.type<{ payouts: any[] }>() },
  },
  // Admin endpoints
  listPending: {
    method: "GET",
    path: "/api/affiliates/admin/pending",
    responses: { 200: c.type<{ affiliates: any[] }>() },
  },
  approve: {
    method: "PATCH",
    path: "/api/affiliates/admin/:id/approve",
    body: z.object({}),
    responses: { 200: c.type<{ affiliate: any }>() },
  },
  processPayouts: {
    method: "POST",
    path: "/api/affiliates/admin/payouts",
    body: z.object({}),
    responses: { 200: c.type<{ processed: number }>() },
  },
});
