import type { Env } from "../env";
import { createDb } from "../infrastructure/db/client";
import { GeminiClient } from "../infrastructure/ai/gemini.client";
import { WorkersAiClient } from "../infrastructure/ai/workers-ai.client";
import { R2StorageAdapter } from "../infrastructure/storage/r2.adapter";
import { GenerationPipeline } from "../infrastructure/ai/generation.pipeline";

interface AiGenerationMessage {
  jobId: string;
  inputImageUrl: string | null;
  stylePrompt: string;
  petName: string;
}

export async function handleAiGenerationMessage(
  message: Message<AiGenerationMessage>,
  env: Env,
): Promise<void> {
  const { jobId, inputImageUrl, stylePrompt, petName } = message.body;

  const db = createDb(env.DATABASE_URL);
  const gemini = new GeminiClient(env.GEMINI_API_KEY);
  const workersAi = new WorkersAiClient(env.AI);
  const storage = new R2StorageAdapter(env.IMAGES);

  const pipeline = new GenerationPipeline(gemini, workersAi, storage, db);

  try {
    await pipeline.process({
      id: jobId,
      inputImageUrl: inputImageUrl ?? "",
      stylePrompt,
      petName,
      provider: "gemini",
    });

    // Ack the message on success
    message.ack();
  } catch (error) {
    console.error(`AI generation failed for job ${jobId}:`, error);
    // The pipeline already marked the job as 'failed' in the DB.
    // Ack to prevent infinite retries — the error state is persisted.
    message.ack();
  }
}
