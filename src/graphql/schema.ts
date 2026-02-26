import { createSchema } from "graphql-yoga";
import {
  sharedTypeDefs,
  catalogTypeDefs,
  cartTypeDefs,
  checkoutTypeDefs,
  bookingTypeDefs,
  aiStudioTypeDefs,
  userTypeDefs,
  queryTypeDefs,
} from "./types";
import {
  productResolvers,
  cartResolvers,
  bookingResolvers,
  aiStudioResolvers,
  userResolvers,
} from "./resolvers";

/**
 * Merge multiple resolver maps into a single resolver object.
 * Each resolver map may contribute fields under Query, Mutation, etc.
 */
function mergeResolvers(
  ...resolverMaps: Record<string, Record<string, unknown>>[]
): Record<string, Record<string, unknown>> {
  const merged: Record<string, Record<string, unknown>> = {};

  for (const map of resolverMaps) {
    for (const [typeName, fields] of Object.entries(map)) {
      if (!merged[typeName]) {
        merged[typeName] = {};
      }
      Object.assign(merged[typeName], fields);
    }
  }

  return merged;
}

export const schema = createSchema({
  typeDefs: [
    sharedTypeDefs,
    catalogTypeDefs,
    cartTypeDefs,
    checkoutTypeDefs,
    bookingTypeDefs,
    aiStudioTypeDefs,
    userTypeDefs,
    queryTypeDefs,
  ],
  resolvers: mergeResolvers(
    productResolvers,
    cartResolvers,
    bookingResolvers,
    aiStudioResolvers,
    userResolvers,
  ),
});
