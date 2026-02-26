import type { AiJobRepository } from "../../infrastructure/repositories/ai-job.repository";
import { NotFoundError, ValidationError } from "../../shared/errors";

interface GenerateArtworkInput {
  userId: string;
  petProfileId: string;
  templateId?: string;
  customPrompt?: string;
}

export class GenerateArtworkUseCase {
  constructor(
    private repo: AiJobRepository,
    private queue: Queue,
  ) {}

  async execute(input: GenerateArtworkInput) {
    const { userId, petProfileId, templateId, customPrompt } = input;

    // 1. Validate pet profile exists and belongs to user
    const pet = await this.repo.findPetById(petProfileId);
    if (!pet) {
      throw new NotFoundError("Pet profile", petProfileId);
    }
    if (pet.userId !== userId) {
      throw new NotFoundError("Pet profile", petProfileId);
    }

    // 2. Get template if templateId provided (or use custom prompt)
    let stylePrompt: string;

    if (templateId) {
      const template = await this.repo.findTemplateById(templateId);
      if (!template) {
        throw new NotFoundError("Art template", templateId);
      }
      stylePrompt = template.stylePrompt;
    } else if (customPrompt) {
      stylePrompt = customPrompt;
    } else {
      throw new ValidationError(
        "Either templateId or customPrompt must be provided",
      );
    }

    // 3. Create generation job in DB with status 'queued'
    const jobResult = await this.repo.createJob({
      userId,
      petProfileId,
      templateId,
      inputImageUrl: pet.photoUrl,
      prompt: stylePrompt,
    });

    if (!jobResult) {
      throw new Error("Failed to create generation job");
    }

    // 4. Enqueue to AI_QUEUE
    await this.queue.send({
      jobId: jobResult.id,
      inputImageUrl: pet.photoUrl,
      stylePrompt,
      petName: pet.name,
    });

    // 5. Return the job ID for polling
    return {
      id: jobResult.id,
      petProfileId: jobResult.petProfileId,
      templateId: jobResult.templateId,
      customPrompt: customPrompt ?? null,
      status: jobResult.status,
      resultImageUrl: null,
      errorMessage: null,
      createdAt: jobResult.createdAt?.toISOString() ?? new Date().toISOString(),
      updatedAt: jobResult.updatedAt?.toISOString() ?? new Date().toISOString(),
    };
  }
}
