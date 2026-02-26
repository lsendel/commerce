import { eq, and, desc, count } from "drizzle-orm";
import type { Database } from "../db/client";
import {
  generationJobs,
  petProfiles,
  artTemplates,
} from "../db/schema";

export class AiJobRepository {
  constructor(
    private db: Database,
    private storeId: string,
  ) {}

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
        storeId: this.storeId,
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
      .where(and(eq(generationJobs.id, id), eq(generationJobs.storeId, this.storeId)))
      .limit(1);
    return result[0] ?? null;
  }

  async findByUserId(userId: string) {
    return this.db
      .select()
      .from(generationJobs)
      .where(and(eq(generationJobs.userId, userId), eq(generationJobs.storeId, this.storeId)));
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
      .where(and(eq(generationJobs.id, id), eq(generationJobs.storeId, this.storeId)))
      .returning();
    return result[0] ?? null;
  }

  async deleteJob(id: string) {
    const result = await this.db
      .delete(generationJobs)
      .where(and(eq(generationJobs.id, id), eq(generationJobs.storeId, this.storeId)))
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
        storeId: this.storeId,
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
      .where(and(eq(petProfiles.userId, userId), eq(petProfiles.storeId, this.storeId)));
  }

  async findPetById(id: string) {
    const result = await this.db
      .select()
      .from(petProfiles)
      .where(and(eq(petProfiles.id, id), eq(petProfiles.storeId, this.storeId)))
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
      photoStorageKey: string;
    }>,
  ) {
    const result = await this.db
      .update(petProfiles)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(petProfiles.id, id), eq(petProfiles.storeId, this.storeId)))
      .returning();
    return result[0] ?? null;
  }

  async deletePetProfile(id: string) {
    const result = await this.db
      .delete(petProfiles)
      .where(and(eq(petProfiles.id, id), eq(petProfiles.storeId, this.storeId)))
      .returning();
    return result[0] ?? null;
  }

  // ─── Art Templates (platform-level, not scoped by storeId — shared across stores) ──

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
