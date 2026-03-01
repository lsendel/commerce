import { initContract } from "@ts-rest/core";
import { z } from "zod";

const c = initContract();

const featureDisabledSchema = z.object({
  error: z.string(),
  code: z.literal("FEATURE_DISABLED"),
});

const runbookSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string(),
  rollbackCommand: z.string(),
});

const triageResultSchema = z.object({
  triageId: z.string(),
  generatedAt: z.string(),
  incidentType: z.enum([
    "checkout_degradation",
    "fulfillment_failure_spike",
    "payment_failure_spike",
    "provider_outage",
    "queue_backlog",
    "p1_incident_stale",
    "unknown",
  ]),
  severity: z.enum(["sev1", "sev2", "sev3"]),
  confidence: z.number(),
  triageSummary: z.string(),
  suspectedRootCause: z.string(),
  responseTeam: z.enum(["growth", "operations", "platform"]),
  runbook: runbookSchema,
  recommendedActions: z.array(
    z.object({
      title: z.string(),
      detail: z.string(),
      priority: z.enum(["immediate", "next", "follow_up"]),
      command: z.string().optional(),
    }),
  ),
  escalation: z.object({
    pageOnCall: z.boolean(),
    reason: z.string(),
  }),
  warnings: z.array(z.string()),
});

const historyEntrySchema = z.object({
  triageId: z.string(),
  createdAt: z.string(),
  incidentType: z.string(),
  severity: z.string(),
  confidence: z.number(),
  responseTeam: z.string(),
  runbookId: z.string(),
  pageOnCall: z.boolean(),
  acknowledged: z.boolean(),
  acknowledgedAt: z.string().nullable(),
  acknowledgedOutcome: z.string().nullable(),
  acknowledgedNotes: z.string().nullable(),
});

export const incidentResponderContract = c.router({
  triage: {
    method: "POST",
    path: "/api/admin/ops/incidents/triage",
    body: z.object({
      summary: z.string().min(10).max(2000),
      signalType: z
        .enum([
          "checkout_conversion_drop",
          "fulfillment_failure_spike",
          "payment_failure_spike",
          "provider_outage",
          "queue_backlog",
          "p1_open_over_60m",
          "unknown",
        ])
        .optional(),
      severity: z.enum(["sev1", "sev2", "sev3"]).optional(),
    }),
    responses: {
      200: z.object({ triage: triageResultSchema }),
      401: z.object({ error: z.string() }),
      403: featureDisabledSchema,
    },
  },
  runbooks: {
    method: "GET",
    path: "/api/admin/ops/incidents/runbooks",
    responses: {
      200: z.object({ runbooks: z.array(runbookSchema) }),
      401: z.object({ error: z.string() }),
      403: featureDisabledSchema,
    },
  },
  history: {
    method: "GET",
    path: "/api/admin/ops/incidents/history",
    query: z.object({
      limit: z.coerce.number().int().min(1).max(100).optional(),
    }),
    responses: {
      200: z.object({ history: z.array(historyEntrySchema) }),
      401: z.object({ error: z.string() }),
      403: featureDisabledSchema,
    },
  },
  acknowledge: {
    method: "POST",
    path: "/api/admin/ops/incidents/acknowledge",
    body: z.object({
      triageId: z.string().min(6).max(120),
      outcome: z.enum(["monitoring", "mitigated", "false_positive", "escalated"]),
      notes: z.string().max(500).optional(),
    }),
    responses: {
      200: z.object({ success: z.boolean() }),
      401: z.object({ error: z.string() }),
      403: featureDisabledSchema,
    },
  },
});
