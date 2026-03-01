import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Env } from "../../env";
import { createDb } from "../../infrastructure/db/client";
import { WorkflowRepository } from "../../infrastructure/repositories/workflow.repository";
import { AnalyticsRepository } from "../../infrastructure/repositories/analytics.repository";
import { NoCodeWorkflowBuilderUseCase } from "../../application/ops/no-code-workflow-builder.usecase";
import { TrackEventUseCase } from "../../application/analytics/track-event.usecase";
import { requireAuth } from "../../middleware/auth.middleware";
import { rateLimit } from "../../middleware/rate-limit.middleware";
import { resolveFeatureFlags } from "../../shared/feature-flags";

const workflowRoutes = new Hono<{ Bindings: Env }>();

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

const workflowCreateSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  triggerType: z.literal("abandoned_checkout"),
  triggerConfig: z
    .object({
      idleMinutes: z.number().int().min(15).max(60 * 24 * 7).optional(),
      lookbackMinutes: z.number().int().min(15).max(60 * 24 * 30).optional(),
      maxCandidates: z.number().int().min(10).max(500).optional(),
    })
    .optional(),
  actionType: z.literal("checkout_recovery_message"),
  actionConfig: z
    .object({
      channel: z.enum(["email", "sms", "whatsapp"]).optional(),
      stage: z.enum(["recovery_1h", "recovery_24h", "recovery_72h"]).optional(),
      incentiveCode: z.string().max(60).optional(),
      maxPerRun: z.number().int().min(1).max(200).optional(),
    })
    .optional(),
  isActive: z.boolean().optional(),
});

const workflowUpdateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(500).nullable().optional(),
  triggerType: z.literal("abandoned_checkout").optional(),
  triggerConfig: z
    .object({
      idleMinutes: z.number().int().min(15).max(60 * 24 * 7).optional(),
      lookbackMinutes: z.number().int().min(15).max(60 * 24 * 30).optional(),
      maxCandidates: z.number().int().min(10).max(500).optional(),
    })
    .optional(),
  actionType: z.literal("checkout_recovery_message").optional(),
  actionConfig: z
    .object({
      channel: z.enum(["email", "sms", "whatsapp"]).optional(),
      stage: z.enum(["recovery_1h", "recovery_24h", "recovery_72h"]).optional(),
      incentiveCode: z.string().max(60).nullable().optional(),
      maxPerRun: z.number().int().min(1).max(200).optional(),
    })
    .optional(),
  isActive: z.boolean().optional(),
});

const toggleSchema = z.object({
  isActive: z.boolean(),
});

const runSchema = z.object({
  dryRun: z.boolean().optional(),
  maxPerRun: z.number().int().min(1).max(200).optional(),
});

function checkWorkflowBuilderFeature(c: any) {
  const flags = resolveFeatureFlags(c.env.FEATURE_FLAGS);
  if (!flags.no_code_workflow_builder) {
    return c.json(
      {
        error: "No-code workflow builder is currently disabled",
        code: "FEATURE_DISABLED",
      },
      403,
    );
  }
  return null;
}

function createDependencies(c: any) {
  const db = createDb(c.env.DATABASE_URL);
  const storeId = c.get("storeId") as string;
  const workflowRepo = new WorkflowRepository(db, storeId);
  const analyticsRepo = new AnalyticsRepository(db, storeId);
  const useCase = new NoCodeWorkflowBuilderUseCase(db, storeId, workflowRepo);
  const trackEvent = new TrackEventUseCase(analyticsRepo);

  return { db, storeId, workflowRepo, analyticsRepo, useCase, trackEvent };
}

workflowRoutes.use("/workflows/*", requireAuth());
workflowRoutes.use("/workflows", rateLimit({ windowMs: 60_000, max: 90 }));
workflowRoutes.use("/workflows/:id/run", rateLimit({ windowMs: 60_000, max: 20 }));
workflowRoutes.use("/workflows/:id/preview", rateLimit({ windowMs: 60_000, max: 40 }));

workflowRoutes.get(
  "/workflows",
  zValidator("query", listQuerySchema),
  async (c) => {
    const featureError = checkWorkflowBuilderFeature(c);
    if (featureError) return featureError;

    const { useCase } = createDependencies(c);
    const { limit } = c.req.valid("query");
    const workflows = await useCase.listWorkflows(limit ?? 50);

    return c.json({ workflows }, 200);
  },
);

workflowRoutes.post(
  "/workflows",
  zValidator("json", workflowCreateSchema),
  async (c) => {
    const featureError = checkWorkflowBuilderFeature(c);
    if (featureError) return featureError;

    const { useCase, trackEvent } = createDependencies(c);
    const body = c.req.valid("json");
    const userId = c.get("userId") as string;

    const workflow = await useCase.createWorkflow({
      ...body,
      userId,
    });

    await trackEvent.execute({
      eventType: "workflow_builder_workflow_created",
      userId,
      properties: {
        workflowId: workflow.id,
        triggerType: workflow.triggerType,
        actionType: workflow.actionType,
        isActive: workflow.isActive,
      },
      pageUrl: c.req.url,
      userAgent: c.req.header("user-agent") ?? null,
      ip: c.req.header("cf-connecting-ip") ?? undefined,
    });

    return c.json({ workflow }, 201);
  },
);

workflowRoutes.patch(
  "/workflows/:id",
  zValidator("json", workflowUpdateSchema),
  async (c) => {
    const featureError = checkWorkflowBuilderFeature(c);
    if (featureError) return featureError;

    const { useCase, trackEvent } = createDependencies(c);
    const userId = c.get("userId") as string;
    const workflowId = c.req.param("id");
    const body = c.req.valid("json");

    const workflow = await useCase.updateWorkflow(workflowId, {
      ...body,
      userId,
    });

    await trackEvent.execute({
      eventType: "workflow_builder_workflow_updated",
      userId,
      properties: {
        workflowId: workflow.id,
        isActive: workflow.isActive,
      },
      pageUrl: c.req.url,
      userAgent: c.req.header("user-agent") ?? null,
      ip: c.req.header("cf-connecting-ip") ?? undefined,
    });

    return c.json({ workflow }, 200);
  },
);

workflowRoutes.post(
  "/workflows/:id/toggle",
  zValidator("json", toggleSchema),
  async (c) => {
    const featureError = checkWorkflowBuilderFeature(c);
    if (featureError) return featureError;

    const { useCase, trackEvent } = createDependencies(c);
    const userId = c.get("userId") as string;
    const workflowId = c.req.param("id");
    const body = c.req.valid("json");

    const workflow = await useCase.setWorkflowActive(workflowId, body.isActive, userId);

    await trackEvent.execute({
      eventType: "workflow_builder_workflow_toggled",
      userId,
      properties: {
        workflowId: workflow.id,
        isActive: workflow.isActive,
      },
      pageUrl: c.req.url,
      userAgent: c.req.header("user-agent") ?? null,
      ip: c.req.header("cf-connecting-ip") ?? undefined,
    });

    return c.json({ workflow }, 200);
  },
);

workflowRoutes.post(
  "/workflows/:id/preview",
  async (c) => {
    const featureError = checkWorkflowBuilderFeature(c);
    if (featureError) return featureError;

    const { useCase, trackEvent } = createDependencies(c);
    const userId = c.get("userId") as string;
    const workflowId = c.req.param("id");

    const preview = await useCase.previewWorkflow(workflowId);

    await trackEvent.execute({
      eventType: "workflow_builder_preview_requested",
      userId,
      properties: {
        workflowId,
        matchedCount: preview.matchedCount,
      },
      pageUrl: c.req.url,
      userAgent: c.req.header("user-agent") ?? null,
      ip: c.req.header("cf-connecting-ip") ?? undefined,
    });

    return c.json({ preview }, 200);
  },
);

workflowRoutes.post(
  "/workflows/:id/run",
  zValidator("json", runSchema),
  async (c) => {
    const featureError = checkWorkflowBuilderFeature(c);
    if (featureError) return featureError;

    const { useCase, analyticsRepo, trackEvent } = createDependencies(c);
    const userId = c.get("userId") as string;
    const workflowId = c.req.param("id");
    const body = c.req.valid("json");

    const dryRun = body.dryRun ?? false;
    const runPlan = await useCase.prepareRun(workflowId, {
      appUrl: c.env.APP_URL,
      maxPerRun: body.maxPerRun,
    });

    let enqueuedCount = 0;

    if (!dryRun) {
      for (const notification of runPlan.notifications) {
        await c.env.NOTIFICATION_QUEUE.send({
          type: "checkout_recovery",
          data: {
            stage: notification.stage,
            channel: notification.channel,
            cartId: notification.cartId,
            storeId: c.get("storeId") as string,
            userId: notification.userId,
            userEmail: notification.userEmail,
            userPhone: notification.userPhone,
            userName: notification.userName,
            itemCount: notification.itemCount,
            idleHours: notification.idleHours,
            recoveryUrl: notification.recoveryUrl,
            incentiveCode: notification.incentiveCode,
          },
        });

        await analyticsRepo.trackEvent({
          userId: notification.userId,
          eventType: "checkout_recovery_enqueued",
          properties: {
            stage: notification.stage,
            channel: notification.channel,
            cartId: notification.cartId,
            itemCount: notification.itemCount,
            idleHours: notification.idleHours,
            incentiveCode: notification.incentiveCode,
            recoveryUrl: notification.recoveryUrl,
            source: "workflow_builder",
            workflowId,
          },
          pageUrl: c.req.url,
          userAgent: c.req.header("user-agent") ?? null,
        });

        enqueuedCount++;
      }

      if (enqueuedCount > 0) {
        await useCase.markWorkflowRun(workflowId, userId);
      }
    }

    await trackEvent.execute({
      eventType: "workflow_builder_run_executed",
      userId,
      properties: {
        workflowId,
        dryRun,
        matchedCount: runPlan.matchedCount,
        preparedCount: runPlan.preparedCount,
        enqueuedCount,
        skippedRecovered: runPlan.skippedRecovered,
        skippedRecentlyEnqueued: runPlan.skippedRecentlyEnqueued,
        skippedMissingChannelAddress: runPlan.skippedMissingChannelAddress,
      },
      pageUrl: c.req.url,
      userAgent: c.req.header("user-agent") ?? null,
      ip: c.req.header("cf-connecting-ip") ?? undefined,
    });

    return c.json(
      {
        run: {
          workflowId,
          dryRun,
          matchedCount: runPlan.matchedCount,
          preparedCount: runPlan.preparedCount,
          enqueuedCount,
          skippedRecovered: runPlan.skippedRecovered,
          skippedRecentlyEnqueued: runPlan.skippedRecentlyEnqueued,
          skippedMissingChannelAddress: runPlan.skippedMissingChannelAddress,
          warnings: runPlan.warnings,
          sample: runPlan.notifications.slice(0, 10).map((notification) => ({
            cartId: notification.cartId,
            userEmail: notification.userEmail,
            channel: notification.channel,
            stage: notification.stage,
            itemCount: notification.itemCount,
            recoveryUrl: notification.recoveryUrl,
          })),
        },
      },
      200,
    );
  },
);

workflowRoutes.delete(
  "/workflows/:id",
  async (c) => {
    const featureError = checkWorkflowBuilderFeature(c);
    if (featureError) return featureError;

    const { useCase, trackEvent } = createDependencies(c);
    const userId = c.get("userId") as string;
    const workflowId = c.req.param("id");

    await useCase.deleteWorkflow(workflowId);

    await trackEvent.execute({
      eventType: "workflow_builder_workflow_deleted",
      userId,
      properties: {
        workflowId,
      },
      pageUrl: c.req.url,
      userAgent: c.req.header("user-agent") ?? null,
      ip: c.req.header("cf-connecting-ip") ?? undefined,
    });

    return c.json({ success: true }, 200);
  },
);

export { workflowRoutes };
