/**
 * Catalog domain query resolvers (products, collections).
 * Stub implementations return empty data until connected to repositories.
 */
export const productResolvers = {
  Query: {
    products: () => ({
      edges: [],
      pageInfo: { hasNextPage: false, hasPreviousPage: false },
      totalCount: 0,
    }),
    product: () => null,
    collections: () => [],
    collection: () => null,
  },
};
