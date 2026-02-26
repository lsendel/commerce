/**
 * Barrel export for all GraphQL resolvers.
 * Each domain exports its own resolver map with Query (and optionally Mutation) keys.
 */
export { productResolvers } from "./product.resolver";
export { cartResolvers } from "./cart.resolver";
export { bookingResolvers } from "./booking.resolver";
export { aiStudioResolvers } from "./ai-studio.resolver";
export { userResolvers } from "./user.resolver";
