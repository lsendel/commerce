export type GenerationStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export type AiProvider = "replicate" | "stability" | "openai" | "midjourney";

export interface GenerationJob {
  id: string;
  userId: string;
  petProfileId: string;
  templateId: string;
  provider: AiProvider;
  status: GenerationStatus;
  prompt: string;
  negativePrompt: string | null;
  resultImageUrl: string | null;
  errorMessage: string | null;
  providerJobId: string | null;
  durationMs: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export function createGenerationJob(
  params: Omit<
    GenerationJob,
    | "createdAt"
    | "updatedAt"
    | "status"
    | "negativePrompt"
    | "resultImageUrl"
    | "errorMessage"
    | "providerJobId"
    | "durationMs"
  > & {
    status?: GenerationStatus;
    negativePrompt?: string | null;
    resultImageUrl?: string | null;
    errorMessage?: string | null;
    providerJobId?: string | null;
    durationMs?: number | null;
  }
): GenerationJob {
  const now = new Date();
  return {
    ...params,
    status: params.status ?? "pending",
    negativePrompt: params.negativePrompt ?? null,
    resultImageUrl: params.resultImageUrl ?? null,
    errorMessage: params.errorMessage ?? null,
    providerJobId: params.providerJobId ?? null,
    durationMs: params.durationMs ?? null,
    createdAt: now,
    updatedAt: now,
  };
}
