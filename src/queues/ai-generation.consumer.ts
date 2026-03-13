import type { Env } from "../env";
import { createDb } from "../infrastructure/db/client";
import { GeminiClient } from "../infrastructure/ai/gemini.client";
import { WorkersAiClient } from "../infrastructure/ai/workers-ai.client";
import { R2StorageAdapter } from "../infrastructure/storage/r2.adapter";
import { GenerationPipeline } from "../infrastructure/ai/generation.pipeline";
import {
  QUEUE_WORKFLOW_POLICIES,
  computeRetryBackoffMs,
  isRetryableWorkflowError,
  withWorkflowTimeout,
} from "./orchestration-policy";

interface AiGenerationMessage {
  jobId: string;
  inputImageUrl: string | null;
  stylePrompt: string;
  petName: string;
}

function resolveWorkflowSettings(env: Env) {
  const base = QUEUE_WORKFLOW_POLICIES["ai-generation"];

  const timeoutOverride = Number(env.AI_GENERATION_WORKFLOW_TIMEOUT_MS ?? "");
  const timeoutMs =
    Number.isFinite(timeoutOverride) && timeoutOverride > 0
      ? Math.floor(timeoutOverride)
      : base.timeoutMs;

  const maxAttemptsOverride = Number(env.AI_GENERATION_WORKFLOW_MAX_ATTEMPTS ?? "");
  const maxAttempts =
    Number.isFinite(maxAttemptsOverride) && maxAttemptsOverride > 0
      ? Math.floor(maxAttemptsOverride)
      : base.maxAttempts;

  return {
    ...base,
    timeoutMs,
    maxAttempts,
  };
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function handleAiGenerationMessage(
  message: Message<AiGenerationMessage>,
  env: Env,
): Promise<void> {
  const { jobId, inputImageUrl, stylePrompt, petName } = message.body;
  const workflowSettings = resolveWorkflowSettings(env);

  const db = createDb(env.DATABASE_URL);
  const gemini = new GeminiClient(env.GEMINI_API_KEY);
  const workersAi = new WorkersAiClient(env.AI);
  const storage = new R2StorageAdapter(env.IMAGES);

  const pipeline = new GenerationPipeline(gemini, workersAi, storage, db);

  let lastError: unknown;

  for (let attempt = 1; attempt <= workflowSettings.maxAttempts; attempt++) {
    try {
      await withWorkflowTimeout(
        pipeline.process({
          id: jobId,
          inputImageUrl: inputImageUrl ?? "",
          stylePrompt,
          petName,
          provider: "gemini",
        }),
        workflowSettings.timeoutMs,
        "ai-generation.process",
      );

      // Ack the message on success
      message.ack();
      return;
    } catch (error) {
      lastError = error;
      const retryable = isRetryableWorkflowError(error);
      if (!retryable || attempt >= workflowSettings.maxAttempts) {
        break;
      }

      const backoffMs = computeRetryBackoffMs(workflowSettings, attempt);
      console.error(
        `AI generation retriable failure for job ${jobId} (attempt ${attempt}/${workflowSettings.maxAttempts}, backoff~${backoffMs}ms):`,
        error,
      );
      await wait(backoffMs);
    }
  }

  console.error(`AI generation failed for job ${jobId}:`, lastError);
  // The pipeline already marks the job as failed in the DB. Ack to avoid
  // unbounded queue retries after local retry budget is exhausted.
  message.ack();
}
