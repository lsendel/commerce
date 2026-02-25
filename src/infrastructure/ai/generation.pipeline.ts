import type { GeminiClient } from "./gemini.client";
import type { WorkersAiClient } from "./workers-ai.client";
import type { R2StorageAdapter } from "../storage/r2.adapter";
import type { Database } from "../db/client";
import { generationJobs } from "../db/schema";
import { eq } from "drizzle-orm";

interface PipelineJob {
  id: string;
  inputImageUrl: string;
  stylePrompt: string;
  petName: string;
  provider: string;
}

export class GenerationPipeline {
  constructor(
    private gemini: GeminiClient,
    private workersAi: WorkersAiClient,
    private storage: R2StorageAdapter,
    private db: Database,
  ) {}

  async process(job: PipelineJob): Promise<void> {
    // 1. Update job status to 'processing'
    await this.db
      .update(generationJobs)
      .set({
        status: "processing",
        updatedAt: new Date(),
      })
      .where(eq(generationJobs.id, job.id));

    try {
      let outputSvgUrl: string | null = null;
      let outputRasterUrl: string | null = null;
      let usedProvider: "gemini" | "flux" = "gemini";

      // 2. Try Gemini first for SVG generation
      try {
        const svg = await this.gemini.generateSvg(
          job.inputImageUrl,
          job.stylePrompt,
          job.petName,
        );

        // Store SVG in R2
        const svgKey = `ai-studio/outputs/${job.id}.svg`;
        await this.storage.upload(svgKey, svg, "image/svg+xml");
        outputSvgUrl = this.storage.getUrl(svgKey);
        usedProvider = "gemini";
      } catch (geminiError) {
        console.error(
          `Gemini generation failed for job ${job.id}, falling back to Workers AI:`,
          geminiError,
        );

        // 3. Fall back to Workers AI for raster image
        const rasterPrompt = [
          `Pet portrait of a pet named "${job.petName}".`,
          `Style: ${job.stylePrompt}`,
          `High quality, detailed, professional pet artwork.`,
        ].join(" ");

        const imageData = await this.workersAi.generateImage(rasterPrompt);

        // Store raster image in R2
        const rasterKey = `ai-studio/outputs/${job.id}.png`;
        await this.storage.upload(rasterKey, imageData, "image/png");
        outputRasterUrl = this.storage.getUrl(rasterKey);
        usedProvider = "flux";
      }

      // 5. Update job with output URLs and status 'completed'
      await this.db
        .update(generationJobs)
        .set({
          status: "completed",
          outputSvgUrl,
          outputRasterUrl,
          provider: usedProvider,
          updatedAt: new Date(),
        })
        .where(eq(generationJobs.id, job.id));
    } catch (error) {
      // 6. On failure, update job status to 'failed' with error message
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      await this.db
        .update(generationJobs)
        .set({
          status: "failed",
          errorMessage,
          updatedAt: new Date(),
        })
        .where(eq(generationJobs.id, job.id));

      throw error;
    }
  }
}
