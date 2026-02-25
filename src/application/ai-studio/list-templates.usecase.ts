import type { AiJobRepository } from "../../infrastructure/repositories/ai-job.repository";

export class ListTemplatesUseCase {
  constructor(private repo: AiJobRepository) {}

  async execute(category?: string) {
    const templates = await this.repo.findTemplates(category);

    return {
      templates: templates.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        previewImageUrl: t.previewImageUrl ?? "",
        category: t.category ?? "",
      })),
    };
  }
}
