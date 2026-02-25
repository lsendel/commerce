import { initContract } from "@ts-rest/core";
import { z } from "zod";
import {
  generateArtworkSchema,
  createPetProfileSchema,
  idParamSchema,
} from "../shared/validators";

const c = initContract();

const generationJobSchema = z.object({
  id: z.string(),
  petProfileId: z.string(),
  templateId: z.string().nullable(),
  customPrompt: z.string().nullable(),
  status: z.enum(["pending", "processing", "completed", "failed"]),
  resultImageUrl: z.string().nullable(),
  errorMessage: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const templateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  previewImageUrl: z.string(),
  category: z.string(),
});

const petProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  species: z.string(),
  breed: z.string().nullable(),
  imageUrl: z.string().nullable(),
  createdAt: z.string(),
});

export const aiStudioContract = c.router({
  generate: {
    method: "POST",
    path: "/api/studio/generate",
    body: generateArtworkSchema,
    responses: {
      201: generationJobSchema,
      400: z.object({ error: z.string() }),
      401: z.object({ error: z.string() }),
      404: z.object({ error: z.string() }),
    },
  },
  getJob: {
    method: "GET",
    path: "/api/studio/jobs/:id",
    pathParams: idParamSchema,
    responses: {
      200: generationJobSchema,
      401: z.object({ error: z.string() }),
      404: z.object({ error: z.string() }),
    },
  },
  listTemplates: {
    method: "GET",
    path: "/api/studio/templates",
    query: z.object({
      category: z.string().optional(),
    }),
    responses: {
      200: z.object({
        templates: z.array(templateSchema),
      }),
    },
  },
  createPet: {
    method: "POST",
    path: "/api/studio/pets",
    body: createPetProfileSchema,
    responses: {
      201: petProfileSchema,
      400: z.object({ error: z.string() }),
      401: z.object({ error: z.string() }),
    },
  },
  listPets: {
    method: "GET",
    path: "/api/studio/pets",
    responses: {
      200: z.object({
        pets: z.array(petProfileSchema),
      }),
      401: z.object({ error: z.string() }),
    },
  },
  updatePet: {
    method: "PATCH",
    path: "/api/studio/pets/:id",
    pathParams: idParamSchema,
    body: createPetProfileSchema.partial(),
    responses: {
      200: petProfileSchema,
      400: z.object({ error: z.string() }),
      401: z.object({ error: z.string() }),
      404: z.object({ error: z.string() }),
    },
  },
  deletePet: {
    method: "DELETE",
    path: "/api/studio/pets/:id",
    pathParams: idParamSchema,
    body: z.object({}),
    responses: {
      200: z.object({ success: z.boolean() }),
      401: z.object({ error: z.string() }),
      404: z.object({ error: z.string() }),
    },
  },
});
