import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Env } from "../../env";
import { createDb } from "../../infrastructure/db/client";
import { AiJobRepository } from "../../infrastructure/repositories/ai-job.repository";
import { R2StorageAdapter } from "../../infrastructure/storage/r2.adapter";
import { GenerateArtworkUseCase } from "../../application/ai-studio/generate-artwork.usecase";
import { GetGenerationStatusUseCase } from "../../application/ai-studio/get-generation-status.usecase";
import { ListTemplatesUseCase } from "../../application/ai-studio/list-templates.usecase";
import { ManagePetProfileUseCase } from "../../application/ai-studio/manage-pet-profile.usecase";
import {
  generateArtworkSchema,
  createPetProfileSchema,
} from "../../shared/validators";
import { requireAuth } from "../../middleware/auth.middleware";
import { NotFoundError, ValidationError } from "../../shared/errors";

const studio = new Hono<{ Bindings: Env }>();

// All AI Studio routes require authentication
studio.use("/*", requireAuth());

// POST /studio/generate — submit generation job
studio.post(
  "/generate",
  zValidator("json", generateArtworkSchema),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const repo = new AiJobRepository(db);
    const useCase = new GenerateArtworkUseCase(repo, c.env.AI_QUEUE);

    try {
      const body = c.req.valid("json");
      const job = await useCase.execute({
        userId: c.get("userId"),
        petProfileId: body.petProfileId,
        templateId: body.templateId,
        customPrompt: body.customPrompt,
      });
      return c.json(job, 201);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return c.json({ error: error.message }, 404);
      }
      if (error instanceof ValidationError) {
        return c.json({ error: error.message }, 400);
      }
      throw error;
    }
  },
);

// GET /studio/jobs/:id — get job status
studio.get("/jobs/:id", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const repo = new AiJobRepository(db);
  const useCase = new GetGenerationStatusUseCase(repo);

  try {
    const jobId = c.req.param("id");
    const job = await useCase.execute(jobId, c.get("userId"));
    return c.json(job, 200);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return c.json({ error: error.message }, 404);
    }
    throw error;
  }
});

// GET /studio/templates — list templates
studio.get(
  "/templates",
  zValidator(
    "query",
    z.object({ category: z.string().optional() }),
  ),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const repo = new AiJobRepository(db);
    const useCase = new ListTemplatesUseCase(repo);

    const { category } = c.req.valid("query");
    const result = await useCase.execute(category);
    return c.json(result, 200);
  },
);

// POST /studio/pets — create pet profile
studio.post(
  "/pets",
  zValidator("json", createPetProfileSchema),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const repo = new AiJobRepository(db);
    const storage = new R2StorageAdapter(c.env.IMAGES);
    const useCase = new ManagePetProfileUseCase(repo, storage);

    try {
      const body = c.req.valid("json");
      const pet = await useCase.create(c.get("userId"), body);
      return c.json(pet, 201);
    } catch (error) {
      if (error instanceof ValidationError) {
        return c.json({ error: error.message }, 400);
      }
      throw error;
    }
  },
);

// GET /studio/pets — list user's pets
studio.get("/pets", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const repo = new AiJobRepository(db);
  const storage = new R2StorageAdapter(c.env.IMAGES);
  const useCase = new ManagePetProfileUseCase(repo, storage);

  const result = await useCase.list(c.get("userId"));
  return c.json(result, 200);
});

// PATCH /studio/pets/:id — update pet
studio.patch(
  "/pets/:id",
  zValidator("json", createPetProfileSchema.partial()),
  async (c) => {
    const db = createDb(c.env.DATABASE_URL);
    const repo = new AiJobRepository(db);
    const storage = new R2StorageAdapter(c.env.IMAGES);
    const useCase = new ManagePetProfileUseCase(repo, storage);

    try {
      const petId = c.req.param("id");
      const body = c.req.valid("json");
      const pet = await useCase.update(c.get("userId"), petId, body);
      return c.json(pet, 200);
    } catch (error) {
      if (error instanceof NotFoundError) {
        return c.json({ error: error.message }, 404);
      }
      if (error instanceof ValidationError) {
        return c.json({ error: error.message }, 400);
      }
      throw error;
    }
  },
);

// DELETE /studio/pets/:id — delete pet
studio.delete("/pets/:id", async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const repo = new AiJobRepository(db);
  const storage = new R2StorageAdapter(c.env.IMAGES);
  const useCase = new ManagePetProfileUseCase(repo, storage);

  try {
    const petId = c.req.param("id");
    await useCase.delete(c.get("userId"), petId);
    return c.json({ success: true }, 200);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return c.json({ error: error.message }, 404);
    }
    throw error;
  }
});

export { studio as aiStudioRoutes };
