/**
 * User / Identity domain query resolvers.
 * Stub implementations return empty data until connected to repositories.
 */
export const userResolvers = {
  Query: {
    me: () => null,
    myOrders: () => ({
      edges: [],
      pageInfo: { hasNextPage: false, hasPreviousPage: false },
      totalCount: 0,
    }),
  },
};
