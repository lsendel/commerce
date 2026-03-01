import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Env } from "../../env";
import { createDb } from "../../infrastructure/db/client";
import { AnalyticsRepository } from "../../infrastructure/repositories/analytics.repository";
import { TrackEventUseCase } from "../../application/analytics/track-event.usecase";
import {
  AiIncidentResponderUseCase,
  listIncidentRunbooks,
} from "../../application/ops/ai-incident-responder.usecase";
import { requireAuth } from "../../middleware/auth.middleware";
import { rateLimit } from "../../middleware/rate-limit.middleware";
import { resolveFeatureFlags } from "../../shared/feature-flags";

const incidentResponderRoutes = new Hono<{ Bindings: Env }>();

const triageSchema = z.object({
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
});

const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const acknowledgeSchema = z.object({
  triageId: z.string().min(6).max(120),
  outcome: z.enum(["monitoring", "mitigated", "false_positive", "escalated"]),
  notes: z.string().max(500).optional(),
});

function checkIncidentResponderFeature(c: any) {
  const flags = resolveFeatureFlags(c.env.FEATURE_FLAGS);
  if (!flags.ai_incident_responder) {
    return c.json(
      {
        error: "AI incident responder is currently disabled",
        code: "FEATURE_DISABLED",
      },
      403,
    );
  }
  return null;
}

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object") return {};
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function toIsoTimestamp(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return new Date().toISOString();
}

function createTriageId(): string {
  return `triage-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

incidentResponderRoutes.use("/ops/incidents/*", requireAuth());
incidentResponderRoutes.use(
  "/ops/incidents/triage",
  rateLimit({ windowMs: 60_000, max: 20 }),
);
incidentResponderRoutes.use(
  "/ops/incidents/history",
  rateLimit({ windowMs: 60_000, max: 60 }),
);
incidentResponderRoutes.use(
  "/ops/incidents/acknowledge",
  rateLimit({ windowMs: 60_000, max: 40 }),
);

incidentResponderRoutes.post(
  "/ops/incidents/triage",
  zValidator("json", triageSchema),
  async (c) => {
    const featureError = checkIncidentResponderFeature(c);
    if (featureError) return featureError;

    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;
    const userId = c.get("userId") as string;
    const body = c.req.valid("json");

    const analyticsRepo = new AnalyticsRepository(db, storeId);
    const today = new Date().toISOString().slice(0, 10);
    const eventTypes = [
      "incident_p1_open_over_60m",
      "checkout_started",
      "purchase",
      "order_completed",
      "fulfillment_job_failed",
      "fulfillment_failed",
      "payment_failed",
      "queue_backlog_detected",
      "provider_outage_detected",
    ];
    const recentCounts = await analyticsRepo.countEventsByType(today, today, eventTypes);
    const recentSignals = Array.from(recentCounts.entries()).map(([eventType, count]) => ({
      eventType,
      count,
    }));

    const useCase = new AiIncidentResponderUseCase(c.env.GEMINI_API_KEY);
    const triage = await useCase.execute({
      summary: body.summary,
      signalType: body.signalType,
      severity: body.severity,
      recentSignals,
    });

    const triageId = createTriageId();
    const generatedAt = new Date().toISOString();
    const trackEvent = new TrackEventUseCase(analyticsRepo);

    await trackEvent.execute({
      eventType: "incident_responder_triage_requested",
      userId,
      properties: {
        triageId,
        signalType: body.signalType ?? "unknown",
        severity: body.severity ?? null,
        summaryLength: body.summary.length,
      },
      pageUrl: c.req.url,
      userAgent: c.req.header("user-agent") ?? null,
      ip: c.req.header("cf-connecting-ip") ?? undefined,
    });

    await trackEvent.execute({
      eventType: "incident_responder_triage_generated",
      userId,
      properties: {
        triageId,
        generatedAt,
        incidentType: triage.incidentType,
        confidence: triage.confidence,
        severity: triage.severity,
        responseTeam: triage.responseTeam,
        runbookId: triage.runbook.id,
        pageOnCall: triage.escalation.pageOnCall,
      },
      pageUrl: c.req.url,
      userAgent: c.req.header("user-agent") ?? null,
      ip: c.req.header("cf-connecting-ip") ?? undefined,
    });

    return c.json({ triage: { ...triage, triageId, generatedAt } }, 200);
  },
);

incidentResponderRoutes.get(
  "/ops/incidents/history",
  zValidator("query", historyQuerySchema),
  async (c) => {
    const featureError = checkIncidentResponderFeature(c);
    if (featureError) return featureError;

    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;
    const { limit } = c.req.valid("query");

    const analyticsRepo = new AnalyticsRepository(db, storeId);
    const fetchLimit = Math.max(20, (limit ?? 20) * 5);
    const events = await analyticsRepo.listRecentEventsByTypes(
      [
        "incident_responder_triage_generated",
        "incident_responder_triage_acknowledged",
      ],
      fetchLimit,
    );

    const acknowledgements = new Map<
      string,
      {
        acknowledgedAt: string;
        acknowledgedOutcome: "monitoring" | "mitigated" | "false_positive" | "escalated" | null;
        acknowledgedNotes: string | null;
      }
    >();

    for (const event of events) {
      if (event.eventType !== "incident_responder_triage_acknowledged") continue;
      const properties = toRecord(event.properties);
      const triageId = asString(properties.triageId);
      if (!triageId || acknowledgements.has(triageId)) continue;

      acknowledgements.set(triageId, {
        acknowledgedAt: toIsoTimestamp(event.createdAt),
        acknowledgedOutcome: (asString(properties.outcome) as
          | "monitoring"
          | "mitigated"
          | "false_positive"
          | "escalated"
          | null),
        acknowledgedNotes: asString(properties.notes),
      });
    }

    const history = [] as Array<{
      triageId: string;
      createdAt: string;
      incidentType: string;
      severity: string;
      confidence: number;
      responseTeam: string;
      runbookId: string;
      pageOnCall: boolean;
      acknowledged: boolean;
      acknowledgedAt: string | null;
      acknowledgedOutcome: string | null;
      acknowledgedNotes: string | null;
    }>;

    for (const event of events) {
      if (event.eventType !== "incident_responder_triage_generated") continue;
      const properties = toRecord(event.properties);
      const triageId = asString(properties.triageId);
      if (!triageId) continue;
      if (history.some((item) => item.triageId === triageId)) continue;

      const ack = acknowledgements.get(triageId);

      history.push({
        triageId,
        createdAt: toIsoTimestamp(event.createdAt),
        incidentType: asString(properties.incidentType) ?? "unknown",
        severity: asString(properties.severity) ?? "sev2",
        confidence: asNumber(properties.confidence) ?? 0,
        responseTeam: asString(properties.responseTeam) ?? "platform",
        runbookId: asString(properties.runbookId) ?? "runbook-generic-triage",
        pageOnCall: asBoolean(properties.pageOnCall) ?? false,
        acknowledged: Boolean(ack),
        acknowledgedAt: ack?.acknowledgedAt ?? null,
        acknowledgedOutcome: ack?.acknowledgedOutcome ?? null,
        acknowledgedNotes: ack?.acknowledgedNotes ?? null,
      });

      if (history.length >= (limit ?? 20)) {
        break;
      }
    }

    return c.json({ history }, 200);
  },
);

incidentResponderRoutes.post(
  "/ops/incidents/acknowledge",
  zValidator("json", acknowledgeSchema),
  async (c) => {
    const featureError = checkIncidentResponderFeature(c);
    if (featureError) return featureError;

    const db = createDb(c.env.DATABASE_URL);
    const storeId = c.get("storeId") as string;
    const userId = c.get("userId") as string;
    const body = c.req.valid("json");

    const analyticsRepo = new AnalyticsRepository(db, storeId);
    const trackEvent = new TrackEventUseCase(analyticsRepo);

    await trackEvent.execute({
      eventType: "incident_responder_triage_acknowledged",
      userId,
      properties: {
        triageId: body.triageId,
        outcome: body.outcome,
        notes: body.notes ?? null,
      },
      pageUrl: c.req.url,
      userAgent: c.req.header("user-agent") ?? null,
      ip: c.req.header("cf-connecting-ip") ?? undefined,
    });

    return c.json({ success: true }, 200);
  },
);

incidentResponderRoutes.get("/ops/incidents/runbooks", async (c) => {
  const featureError = checkIncidentResponderFeature(c);
  if (featureError) return featureError;

  return c.json({ runbooks: listIncidentRunbooks() }, 200);
});

export { incidentResponderRoutes };
