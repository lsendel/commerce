/**
 * Cart domain GraphQL type definitions.
 */
export const cartTypeDefs = /* GraphQL */ `
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
`;
