/**
 * Shared GraphQL type definitions: scalars, pagination, and enums used across domains.
 */
export const sharedTypeDefs = /* GraphQL */ `
  scalar JSON

  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
  }
`;
