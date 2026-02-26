/**
 * AI Studio domain GraphQL type definitions.
 */
export const aiStudioTypeDefs = /* GraphQL */ `
  enum GenerationStatus {
    QUEUED
    PROCESSING
    COMPLETED
    FAILED
  }

  type ArtTemplate {
    id: ID!
    name: String!
    slug: String!
    description: String
    stylePrompt: String!
    previewImageUrl: String
    category: String
  }

  type GenerationJob {
    id: ID!
    status: GenerationStatus!
    outputSvgUrl: String
    outputRasterUrl: String
    provider: String
    createdAt: String!
  }

  type PetProfile {
    id: ID!
    name: String!
    species: String!
    breed: String
    photoUrl: String
  }
`;
