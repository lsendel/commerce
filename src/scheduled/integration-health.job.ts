import type { Env } from "../env";
import { createDb } from "../infrastructure/db/client";
import {
  IntegrationRepository,
  IntegrationSecretRepository,
} from "../infrastructure/repositories/integration.repository";
import { VerifyIntegrationUseCase } from "../application/platform/verify-integration.usecase";

export async function runIntegrationHealthChecks(env: Env): Promise<void> {
  const db = createDb(env.DATABASE_URL);
  const integrationRepo = new IntegrationRepository(db);
  const secretRepo = new IntegrationSecretRepository(db);
  const verifier = new VerifyIntegrationUseCase(integrationRepo, secretRepo);

  const integrations = await integrationRepo.findAllEnabled();

  for (const integration of integrations) {
    try {
      await verifier.execute(
        integration.provider,
        env,
        integration.storeId ?? undefined,
      );
    } catch (err) {
      console.error(
        `[integration-health] Failed to verify ${integration.provider}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }
}
