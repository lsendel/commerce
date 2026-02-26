/**
 * Catalog domain GraphQL type definitions: products, variants, images, collections.
 */
export const catalogTypeDefs = /* GraphQL */ `
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
`;
