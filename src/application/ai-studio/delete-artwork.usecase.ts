import type { AiJobRepository } from "../../infrastructure/repositories/ai-job.repository";
import type { R2StorageAdapter } from "../../infrastructure/storage/r2.adapter";
import { NotFoundError } from "../../shared/errors";

export class DeleteArtworkUseCase {
  constructor(
    private repo: AiJobRepository,
    private storage: R2StorageAdapter,
  ) {}

  async execute(jobId: string, userId: string) {
    const job = await this.repo.findById(jobId);
    if (!job) {
      throw new NotFoundError("Generation job", jobId);
    }
    if (job.userId !== userId) {
      throw new NotFoundError("Generation job", jobId);
    }

    // Delete R2 artifacts
    if (job.outputRasterUrl) {
      const key = this.extractKey(job.outputRasterUrl);
      if (key) await this.storage.delete(key);
    }
    if (job.outputSvgUrl) {
      const key = this.extractKey(job.outputSvgUrl);
      if (key) await this.storage.delete(key);
    }

    // Delete the job record
    await this.repo.deleteJob(jobId);
  }

  private extractKey(url: string): string | null {
    if (url.startsWith("/cdn/")) {
      return url.slice(5);
    }
    return null;
  }
}
