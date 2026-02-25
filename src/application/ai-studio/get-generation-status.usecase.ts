import type { AiJobRepository } from "../../infrastructure/repositories/ai-job.repository";
import { NotFoundError } from "../../shared/errors";

export class GetGenerationStatusUseCase {
  constructor(private repo: AiJobRepository) {}

  async execute(jobId: string, userId: string) {
    const job = await this.repo.findById(jobId);

    if (!job) {
      throw new NotFoundError("Generation job", jobId);
    }

    if (job.userId !== userId) {
      throw new NotFoundError("Generation job", jobId);
    }

    // Return the result image URL — prefer SVG if available, fall back to raster
    const resultImageUrl = job.outputSvgUrl ?? job.outputRasterUrl ?? null;

    return {
      id: job.id,
      petProfileId: job.petProfileId,
      templateId: job.templateId,
      customPrompt: job.prompt,
      status: job.status,
      resultImageUrl,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt?.toISOString() ?? new Date().toISOString(),
      updatedAt: job.updatedAt?.toISOString() ?? new Date().toISOString(),
    };
  }
}
