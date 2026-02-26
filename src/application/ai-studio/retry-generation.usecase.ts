import type { AiJobRepository } from "../../infrastructure/repositories/ai-job.repository";
import { NotFoundError, ValidationError } from "../../shared/errors";

export class RetryGenerationUseCase {
  constructor(
    private repo: AiJobRepository,
    private queue: Queue,
  ) {}

  async execute(jobId: string, userId: string) {
    const job = await this.repo.findById(jobId);
    if (!job) {
      throw new NotFoundError("Generation job", jobId);
    }
    if (job.userId !== userId) {
      throw new NotFoundError("Generation job", jobId);
    }
    if (job.status !== "failed") {
      throw new ValidationError("Only failed jobs can be retried");
    }

    // Reset to queued
    const updated = await this.repo.updateStatus(jobId, "queued");
    if (!updated) {
      throw new Error("Failed to reset job status");
    }

    // Re-enqueue
    await this.queue.send({
      jobId: updated.id,
      inputImageUrl: updated.inputImageUrl,
      stylePrompt: updated.prompt,
      petName: "",
    });

    return {
      id: updated.id,
      status: updated.status,
    };
  }
}
