/**
 * Booking domain GraphQL type definitions.
 */
export const bookingTypeDefs = /* GraphQL */ `
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
`;
