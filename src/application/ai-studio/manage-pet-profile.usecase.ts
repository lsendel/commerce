import type { AiJobRepository } from "../../infrastructure/repositories/ai-job.repository";
import type { R2StorageAdapter } from "../../infrastructure/storage/r2.adapter";
import { NotFoundError } from "../../shared/errors";

export class ManagePetProfileUseCase {
  constructor(
    private repo: AiJobRepository,
    private storage: R2StorageAdapter,
  ) {}

  async create(
    userId: string,
    data: { name: string; species: string; breed?: string },
    photoFile?: { data: ArrayBuffer; contentType: string },
  ) {
    let photoUrl: string | undefined;

    if (photoFile) {
      const key = `ai-studio/pets/${userId}/${crypto.randomUUID()}.${this.getExtension(photoFile.contentType)}`;
      await this.storage.upload(key, photoFile.data, photoFile.contentType);
      photoUrl = this.storage.getUrl(key);
    }

    const pet = await this.repo.createPetProfile(userId, {
      name: data.name,
      species: data.species,
      breed: data.breed,
      photoUrl,
    });

    if (!pet) {
      throw new Error("Failed to create pet profile");
    }
    return this.formatPet(pet);
  }

  async list(userId: string) {
    const pets = await this.repo.findPetsByUserId(userId);
    return {
      pets: pets.map((p) => this.formatPet(p)),
    };
  }

  async update(
    userId: string,
    petId: string,
    data: Partial<{ name: string; species: string; breed: string }>,
  ) {
    const existing = await this.repo.findPetById(petId);
    if (!existing || existing.userId !== userId) {
      throw new NotFoundError("Pet profile", petId);
    }

    const updated = await this.repo.updatePetProfile(petId, data);
    if (!updated) {
      throw new NotFoundError("Pet profile", petId);
    }

    return this.formatPet(updated);
  }

  async uploadPhoto(
    petId: string,
    userId: string,
    file: { data: ArrayBuffer; contentType: string; size: number },
  ) {
    const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB

    if (!ALLOWED_TYPES.includes(file.contentType)) {
      throw new Error("Invalid file type. Allowed: JPEG, PNG, WebP");
    }
    if (file.size > MAX_SIZE) {
      throw new Error("File too large. Maximum size is 5MB");
    }

    const existing = await this.repo.findPetById(petId);
    if (!existing || existing.userId !== userId) {
      throw new NotFoundError("Pet profile", petId);
    }

    // Remove old photo if it exists
    if (existing.photoUrl) {
      const oldKey = this.extractKeyFromUrl(existing.photoUrl);
      if (oldKey) {
        await this.storage.delete(oldKey);
      }
    }

    const ext = this.getExtension(file.contentType);
    const key = `pets/${petId}/${Date.now()}.${ext}`;
    await this.storage.upload(key, file.data, file.contentType);
    const photoUrl = this.storage.getUrl(key);

    const updated = await this.repo.updatePetProfile(petId, {
      photoUrl,
      photoStorageKey: key,
    });

    if (!updated) {
      throw new NotFoundError("Pet profile", petId);
    }

    return this.formatPet(updated);
  }

  async delete(userId: string, petId: string) {
    const existing = await this.repo.findPetById(petId);
    if (!existing || existing.userId !== userId) {
      throw new NotFoundError("Pet profile", petId);
    }

    // Clean up the photo from R2 if it exists
    if (existing.photoUrl) {
      const key = this.extractKeyFromUrl(existing.photoUrl);
      if (key) {
        await this.storage.delete(key);
      }
    }

    await this.repo.deletePetProfile(petId);
  }

  private formatPet(pet: {
    id: string;
    name: string;
    species: string;
    breed: string | null;
    photoUrl: string | null;
    createdAt: Date | null;
  }) {
    return {
      id: pet.id,
      name: pet.name,
      species: pet.species,
      breed: pet.breed,
      imageUrl: pet.photoUrl,
      createdAt: pet.createdAt?.toISOString() ?? new Date().toISOString(),
    };
  }

  private getExtension(contentType: string): string {
    const map: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
    };
    return map[contentType] ?? "jpg";
  }

  private extractKeyFromUrl(url: string): string | null {
    // URLs are in the format /cdn/ai-studio/pets/...
    if (url.startsWith("/cdn/")) {
      return url.slice(5); // Remove "/cdn/" prefix
    }
    return null;
  }
}
