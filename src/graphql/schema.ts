import { createSchema } from "graphql-yoga";

export const schema = createSchema({
  typeDefs: /* GraphQL */ `
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

    # Enums
    enum ProductType {
      PHYSICAL
      DIGITAL
      SUBSCRIPTION
      BOOKABLE
    }

    enum ProductSort {
      PRICE_ASC
      PRICE_DESC
      NEWEST
      NAME
    }

    enum OrderStatus {
      PENDING
      PROCESSING
      SHIPPED
      DELIVERED
      CANCELLED
      REFUNDED
    }

    enum BookingSlotStatus {
      AVAILABLE
      FULL
      IN_PROGRESS
      COMPLETED
      CLOSED
      CANCELED
    }

    enum BookingStatus {
      CONFIRMED
      CHECKED_IN
      CANCELLED
      NO_SHOW
    }

    enum GenerationStatus {
      QUEUED
      PROCESSING
      COMPLETED
      FAILED
    }

    # Catalog types
    type Product {
      id: ID!
      name: String!
      slug: String!
      description: String
      descriptionHtml: String
      type: ProductType!
      availableForSale: Boolean!
      featuredImageUrl: String
      seoTitle: String
      seoDescription: String
      priceRange: PriceRange!
      variants: [ProductVariant!]!
      images: [ProductImage!]!
      collections: [Collection!]!
      bookingSettings: BookingSettings
      bookingConfig: BookingConfig
    }

    type ProductVariant {
      id: ID!
      title: String!
      sku: String
      price: Float!
      compareAtPrice: Float
      availableForSale: Boolean!
      inventoryQuantity: Int!
      options: JSON
    }

    type ProductImage {
      id: ID!
      url: String!
      altText: String
      position: Int!
    }

    type PriceRange {
      min: Float!
      max: Float!
    }

    type Collection {
      id: ID!
      name: String!
      slug: String!
      description: String
      imageUrl: String
      products(first: Int): [Product!]!
    }

    type ProductConnection {
      edges: [ProductEdge!]!
      pageInfo: PageInfo!
      totalCount: Int!
    }

    type ProductEdge {
      node: Product!
      cursor: String!
    }

    type PageInfo {
      hasNextPage: Boolean!
      hasPreviousPage: Boolean!
      startCursor: String
      endCursor: String
    }

    # Cart types
    type Cart {
      id: ID!
      items: [CartItem!]!
      subtotal: Float!
      totalQuantity: Int!
    }

    type CartItem {
      id: ID!
      quantity: Int!
      variant: ProductVariant!
      product: Product!
      bookingSlot: BookingSlot
      personTypeQuantities: JSON
    }

    # Checkout types
    type Order {
      id: ID!
      status: OrderStatus!
      subtotal: Float!
      tax: Float!
      shippingCost: Float!
      total: Float!
      items: [OrderItem!]!
      shippingAddress: JSON
      createdAt: String!
    }

    type OrderItem {
      id: ID!
      productName: String!
      variantTitle: String
      quantity: Int!
      unitPrice: Float!
      totalPrice: Float!
    }

    type OrderConnection {
      edges: [OrderEdge!]!
      pageInfo: PageInfo!
      totalCount: Int!
    }

    type OrderEdge {
      node: Order!
      cursor: String!
    }

    # Booking types
    type BookingSlot {
      id: ID!
      productId: ID!
      slotDate: String!
      slotTime: String!
      totalCapacity: Int!
      reservedCount: Int!
      remainingCapacity: Int!
      status: BookingSlotStatus!
      prices: [PersonTypePrice!]!
    }

    type PersonTypePrice {
      personType: String!
      price: Float!
    }

    type Booking {
      id: ID!
      status: BookingStatus!
      slot: BookingSlot!
      items: [BookingItem!]!
      createdAt: String!
    }

    type BookingItem {
      personType: String!
      quantity: Int!
      unitPrice: Float!
      totalPrice: Float!
    }

    type BookingSettings {
      duration: Int!
      durationUnit: String!
      capacityPerSlot: Int!
      cutOffTime: Int!
      cutOffUnit: String!
      enableWaitlist: Boolean!
    }

    type BookingConfig {
      location: String
      included: [String!]
      notIncluded: [String!]
      itinerary: [ItineraryStep!]
      faqs: [FAQ!]
      cancellationPolicy: String
    }

    type ItineraryStep {
      time: String!
      description: String!
    }

    type FAQ {
      question: String!
      answer: String!
    }

    # AI Studio types
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

    # User types
    type User {
      id: ID!
      email: String!
      name: String!
    }

    scalar JSON
  `,
  resolvers: {
    Query: {
      // Stub resolvers — implemented in Phase 6+
      products: () => ({ edges: [], pageInfo: { hasNextPage: false, hasPreviousPage: false }, totalCount: 0 }),
      product: () => null,
      collections: () => [],
      collection: () => null,
      cart: () => null,
      availability: () => [],
      templates: () => [],
      generationJob: () => null,
      me: () => null,
      myOrders: () => ({ edges: [], pageInfo: { hasNextPage: false, hasPreviousPage: false }, totalCount: 0 }),
      myBookings: () => [],
      myPets: () => [],
    },
  },
});
