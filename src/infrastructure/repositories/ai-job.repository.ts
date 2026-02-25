import { eq, and } from "drizzle-orm";
import type { Database } from "../db/client";
import {
  generationJobs,
  petProfiles,
  artTemplates,
} from "../db/schema";

export class AiJobRepository {
  constructor(private db: Database) {}

  // ─── Generation Jobs ────────────────────────────────────────────────────────

  async createJob(data: {
    userId: string;
    petProfileId: string;
    templateId?: string;
    inputImageUrl: string | null;
    prompt: string;
    provider?: "gemini" | "flux";
  }) {
    const result = await this.db
      .insert(generationJobs)
      .values({
        userId: data.userId,
        petProfileId: data.petProfileId,
        templateId: data.templateId ?? null,
        inputImageUrl: data.inputImageUrl,
        prompt: data.prompt,
        provider: data.provider ?? null,
        status: "queued",
      })
      .returning();
    return result[0];
  }

  async findById(id: string) {
    const result = await this.db
      .select()
      .from(generationJobs)
      .where(eq(generationJobs.id, id))
      .limit(1);
    return result[0] ?? null;
  }

  async findByUserId(userId: string) {
    return this.db
      .select()
      .from(generationJobs)
      .where(eq(generationJobs.userId, userId));
  }

  async updateStatus(
    id: string,
    status: "queued" | "processing" | "completed" | "failed",
    outputUrls?: { outputSvgUrl?: string; outputRasterUrl?: string },
    errorMessage?: string,
  ) {
    const updateData: Record<string, unknown> = {
      status,
      updatedAt: new Date(),
    };

    if (outputUrls?.outputSvgUrl !== undefined) {
      updateData.outputSvgUrl = outputUrls.outputSvgUrl;
    }
    if (outputUrls?.outputRasterUrl !== undefined) {
      updateData.outputRasterUrl = outputUrls.outputRasterUrl;
    }
    if (errorMessage !== undefined) {
      updateData.errorMessage = errorMessage;
    }

    const result = await this.db
      .update(generationJobs)
      .set(updateData)
      .where(eq(generationJobs.id, id))
      .returning();
    return result[0] ?? null;
  }

  // ─── Pet Profiles ───────────────────────────────────────────────────────────

  async createPetProfile(
    userId: string,
    data: {
      name: string;
      species: string;
      breed?: string;
      photoUrl?: string;
    },
  ) {
    const result = await this.db
      .insert(petProfiles)
      .values({
        userId,
        name: data.name,
        species: data.species,
        breed: data.breed ?? null,
        photoUrl: data.photoUrl ?? null,
      })
      .returning();
    return result[0];
  }

  async findPetsByUserId(userId: string) {
    return this.db
      .select()
      .from(petProfiles)
      .where(eq(petProfiles.userId, userId));
  }

  async findPetById(id: string) {
    const result = await this.db
      .select()
      .from(petProfiles)
      .where(eq(petProfiles.id, id))
      .limit(1);
    return result[0] ?? null;
  }

  async updatePetProfile(
    id: string,
    data: Partial<{
      name: string;
      species: string;
      breed: string;
      photoUrl: string;
    }>,
  ) {
    const result = await this.db
      .update(petProfiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(petProfiles.id, id))
      .returning();
    return result[0] ?? null;
  }

  async deletePetProfile(id: string) {
    const result = await this.db
      .delete(petProfiles)
      .where(eq(petProfiles.id, id))
      .returning();
    return result[0] ?? null;
  }

  // ─── Art Templates ──────────────────────────────────────────────────────────

  async findTemplates(category?: string) {
    if (category) {
      return this.db
        .select()
        .from(artTemplates)
        .where(
          and(
            eq(artTemplates.isActive, true),
            eq(artTemplates.category, category),
          ),
        );
    }
    return this.db
      .select()
      .from(artTemplates)
      .where(eq(artTemplates.isActive, true));
  }

  async findTemplateById(id: string) {
    const result = await this.db
      .select()
      .from(artTemplates)
      .where(eq(artTemplates.id, id))
      .limit(1);
    return result[0] ?? null;
  }
}
