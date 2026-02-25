import { initContract } from "@ts-rest/core";
import { z } from "zod";
import { createCheckoutSchema } from "../shared/validators";

const c = initContract();

export const checkoutContract = c.router({
  create: {
    method: "POST",
    path: "/api/checkout",
    body: createCheckoutSchema,
    responses: {
      200: z.object({ url: z.string() }),
      400: z.object({ error: z.string() }),
      401: z.object({ error: z.string() }),
    },
  },
  success: {
    method: "GET",
    path: "/api/checkout/success",
    query: z.object({
      session_id: z.string(),
    }),
    responses: {
      200: z.object({
        orderId: z.string(),
        status: z.string(),
        total: z.number(),
      }),
      400: z.object({ error: z.string() }),
      404: z.object({ error: z.string() }),
    },
  },
});
