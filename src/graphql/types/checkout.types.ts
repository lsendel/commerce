/**
 * Checkout / Order domain GraphQL type definitions.
 */
export const checkoutTypeDefs = /* GraphQL */ `
  enum OrderStatus {
    PENDING
    PROCESSING
    SHIPPED
    DELIVERED
    CANCELLED
    REFUNDED
  }

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
`;
