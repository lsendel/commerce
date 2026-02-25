import { Hono } from "hono";
import type { Env } from "../../env";
import { requireAuth } from "../../middleware/auth.middleware";
import {
  requireRole,
  requireStoreMember,
} from "../../middleware/role.middleware";
import { createDb } from "../../infrastructure/db/client";
import {
  IntegrationRepository,
  IntegrationSecretRepository,
} from "../../infrastructure/repositories/integration.repository";
import { UpsertIntegrationUseCase } from "../../application/platform/upsert-integration.usecase";
import { DeleteIntegrationUseCase } from "../../application/platform/delete-integration.usecase";
import { ListIntegrationsUseCase } from "../../application/platform/list-integrations.usecase";
import { VerifyIntegrationUseCase } from "../../application/platform/verify-integration.usecase";
import { CheckInfrastructureUseCase } from "../../application/platform/check-infrastructure.usecase";
import type { IntegrationProvider } from "../../domain/platform/integration.entity";

const integrationRoutes = new Hono<{ Bindings: Env }>();

// ─── Platform Admin Endpoints (super_admin) ──────────────────────────────────

integrationRoutes.get(
  "/",
  requireAuth(),
  requireRole("super_admin"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const integrationRepo = new IntegrationRepository(db);
    const secretRepo = new IntegrationSecretRepository(db);
    const listUseCase = new ListIntegrationsUseCase(
      integrationRepo,
      secretRepo,
    );

    const integrations = await listUseCase.listPlatform();
    return c.json({ integrations });
  },
);

integrationRoutes.put(
  "/:provider",
  requireAuth(),
  requireRole("super_admin"),
  async (c) => {
    const provider = c.req.param("provider") as IntegrationProvider;
    const body = await c.req.json<{
      enabled: boolean;
      secrets: Record<string, string>;
      config: Record<string, unknown>;
    }>();

    if (!c.env.ENCRYPTION_KEY) {
      return c.json({ error: "ENCRYPTION_KEY not configured" }, 500);
    }

    const db = createDb(c.env.DATABASE_URL);
    const integrationRepo = new IntegrationRepository(db);
    const secretRepo = new IntegrationSecretRepository(db);

    const upsertUseCase = new UpsertIntegrationUseCase(
      integrationRepo,
      secretRepo,
    );
    const integration = await upsertUseCase.execute(
      {
        provider,
        storeId: null,
        enabled: body.enabled,
        config: body.config ?? {},
        secrets: body.secrets ?? {},
      },
      c.env.ENCRYPTION_KEY,
    );

    // Verify immediately
    const verifyUseCase = new VerifyIntegrationUseCase(
      integrationRepo,
      secretRepo,
    );
    const verifyResult = await verifyUseCase.execute(provider, c.env);

    return c.json({ integration, verification: verifyResult });
  },
);

integrationRoutes.delete(
  "/:provider",
  requireAuth(),
  requireRole("super_admin"),
  async (c) => {
    const provider = c.req.param("provider") as IntegrationProvider;
    const db = createDb(c.env.DATABASE_URL);
    const integrationRepo = new IntegrationRepository(db);
    const deleteUseCase = new DeleteIntegrationUseCase(integrationRepo);
    await deleteUseCase.execute(provider, null);
    return c.json({ ok: true });
  },
);

integrationRoutes.post(
  "/:provider/verify",
  requireAuth(),
  requireRole("super_admin"),
  async (c) => {
    const provider = c.req.param("provider") as IntegrationProvider;
    const db = createDb(c.env.DATABASE_URL);
    const integrationRepo = new IntegrationRepository(db);
    const secretRepo = new IntegrationSecretRepository(db);
    const verifyUseCase = new VerifyIntegrationUseCase(
      integrationRepo,
      secretRepo,
    );
    const result = await verifyUseCase.execute(provider, c.env);
    return c.json(result);
  },
);

integrationRoutes.get(
  "/health",
  requireAuth(),
  requireRole("super_admin"),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const checkUseCase = new CheckInfrastructureUseCase();
    const results = await checkUseCase.execute(c.env, db);
    return c.json({ results });
  },
);

// ─── Per-Store Endpoints (store owner/admin) ─────────────────────────────────

integrationRoutes.get(
  "/store/:storeId",
  requireAuth(),
  requireStoreMember(),
  async (c) => {
    const storeId = c.req.param("storeId");
    const db = createDb(c.env.DATABASE_URL);
    const integrationRepo = new IntegrationRepository(db);
    const secretRepo = new IntegrationSecretRepository(db);
    const listUseCase = new ListIntegrationsUseCase(
      integrationRepo,
      secretRepo,
    );

    const integrations = await listUseCase.listForStore(storeId);
    return c.json({ integrations });
  },
);

integrationRoutes.put(
  "/store/:storeId/:provider",
  requireAuth(),
  requireStoreMember(),
  async (c) => {
    const storeId = c.req.param("storeId");
    const provider = c.req.param("provider") as IntegrationProvider;
    const body = await c.req.json<{
      enabled: boolean;
      secrets: Record<string, string>;
      config: Record<string, unknown>;
    }>();

    if (!c.env.ENCRYPTION_KEY) {
      return c.json({ error: "ENCRYPTION_KEY not configured" }, 500);
    }

    const db = createDb(c.env.DATABASE_URL);
    const integrationRepo = new IntegrationRepository(db);
    const secretRepo = new IntegrationSecretRepository(db);

    const upsertUseCase = new UpsertIntegrationUseCase(
      integrationRepo,
      secretRepo,
    );
    const integration = await upsertUseCase.execute(
      {
        provider,
        storeId,
        enabled: body.enabled,
        config: body.config ?? {},
        secrets: body.secrets ?? {},
      },
      c.env.ENCRYPTION_KEY,
    );

    // Verify immediately
    const verifyUseCase = new VerifyIntegrationUseCase(
      integrationRepo,
      secretRepo,
    );
    const verifyResult = await verifyUseCase.execute(
      provider,
      c.env,
      storeId,
    );

    return c.json({ integration, verification: verifyResult });
  },
);

integrationRoutes.delete(
  "/store/:storeId/:provider",
  requireAuth(),
  requireStoreMember(),
  async (c) => {
    const storeId = c.req.param("storeId");
    const provider = c.req.param("provider") as IntegrationProvider;
    const db = createDb(c.env.DATABASE_URL);
    const integrationRepo = new IntegrationRepository(db);
    const deleteUseCase = new DeleteIntegrationUseCase(integrationRepo);
    await deleteUseCase.execute(provider, storeId);
    return c.json({ ok: true });
  },
);

integrationRoutes.post(
  "/store/:storeId/:provider/verify",
  requireAuth(),
  requireStoreMember(),
  async (c) => {
    const storeId = c.req.param("storeId");
    const provider = c.req.param("provider") as IntegrationProvider;
    const db = createDb(c.env.DATABASE_URL);
    const integrationRepo = new IntegrationRepository(db);
    const secretRepo = new IntegrationSecretRepository(db);
    const verifyUseCase = new VerifyIntegrationUseCase(
      integrationRepo,
      secretRepo,
    );
    const result = await verifyUseCase.execute(provider, c.env, storeId);
    return c.json(result);
  },
);

export { integrationRoutes };
