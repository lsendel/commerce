/**
 * Root Query type definition. Aggregates all top-level query fields.
 */
export const queryTypeDefs = /* GraphQL */ `
  type Query {
    # Catalog
    products(
      first: Int
      after: String
      type: ProductType
      collection: String
      search: String
      sort: ProductSort
    ): ProductConnection!
    product(slug: String!): Product
    collections: [Collection!]!
    collection(slug: String!): Collection

    # Cart
    cart: Cart

    # Booking
    availability(
      productId: ID!
      dateFrom: String
      dateTo: String
    ): [BookingSlot!]!

    # AI Studio
    templates(category: String): [ArtTemplate!]!
    generationJob(id: ID!): GenerationJob

    # User (requires auth)
    me: User
    myOrders(first: Int, after: String): OrderConnection!
    myBookings: [Booking!]!
    myPets: [PetProfile!]!
  }
`;
