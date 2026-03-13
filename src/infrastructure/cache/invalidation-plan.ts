import { buildCacheKey } from "./cache";

export type CacheInvalidationResourceType =
  | "product"
  | "collection"
  | "event"
  | "currency_rates"
  | "products_listing"
  | "collections_listing"
  | "events_listing";

export interface CacheInvalidationResource {
  type: CacheInvalidationResourceType;
  id?: string | null;
  slug?: string | null;
}

export interface CacheInvalidationResolvers {
  resolveProductSlugById?: (id: string) => Promise<string | null>;
  resolveCollectionSlugById?: (id: string) => Promise<string | null>;
  resolveEventSlugById?: (id: string) => Promise<string | null>;
}

export interface CacheInvalidationPlan {
  tags: string[];
  directKeys: string[];
  unresolved: Array<{
    type: CacheInvalidationResourceType;
    id: string;
  }>;
  touchedSurfaces: string[];
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))].sort((a, b) => a.localeCompare(b));
}

function pushCatalogListingKeys(storeId: string, directKeys: string[]) {
  directKeys.push(buildCacheKey(storeId, "/api/products"));
  directKeys.push(buildCacheKey(storeId, "/api/collections"));
  directKeys.push(buildCacheKey(storeId, "/api/products/collections"));
}

function pushEventListingKeys(storeId: string, directKeys: string[]) {
  directKeys.push(buildCacheKey(storeId, "/api/events"));
}

function pushCollectionSlugKeys(storeId: string, slug: string, directKeys: string[]) {
  directKeys.push(buildCacheKey(storeId, "/api/collections"));
  directKeys.push(buildCacheKey(storeId, `/api/collections/${slug}`));
  directKeys.push(buildCacheKey(storeId, "/api/products", { collection: slug }));
}

function pushProductSlugKeys(storeId: string, slug: string, directKeys: string[]) {
  directKeys.push(buildCacheKey(storeId, `/api/products/${slug}`));
  directKeys.push(buildCacheKey(storeId, `/products/${slug}`));
}

function pushEventSlugKeys(storeId: string, slug: string, directKeys: string[]) {
  directKeys.push(buildCacheKey(storeId, `/api/events/${slug}`));
}

async function resolveSlug(
  resource: CacheInvalidationResource,
  resolvers: CacheInvalidationResolvers,
): Promise<string | null> {
  if (resource.slug && resource.slug.trim().length > 0) {
    return resource.slug.trim();
  }
  if (!resource.id) return null;

  if (resource.type === "product" && resolvers.resolveProductSlugById) {
    return resolvers.resolveProductSlugById(resource.id);
  }
  if (resource.type === "collection" && resolvers.resolveCollectionSlugById) {
    return resolvers.resolveCollectionSlugById(resource.id);
  }
  if (resource.type === "event" && resolvers.resolveEventSlugById) {
    return resolvers.resolveEventSlugById(resource.id);
  }
  return null;
}

export async function buildCacheInvalidationPlan(input: {
  storeId: string;
  resources: CacheInvalidationResource[];
  resolvers?: CacheInvalidationResolvers;
}): Promise<CacheInvalidationPlan> {
  const resources = input.resources ?? [];
  const resolvers = input.resolvers ?? {};
  const tags: string[] = [];
  const directKeys: string[] = [];
  const touchedSurfaces: string[] = [];
  const unresolved: Array<{ type: CacheInvalidationResourceType; id: string }> = [];

  for (const resource of resources) {
    switch (resource.type) {
      case "product": {
        tags.push("products:list", "products:detail");
        touchedSurfaces.push("catalog-products");

        const slug = await resolveSlug(resource, resolvers);
        if (slug) {
          tags.push(`product:${slug}`);
          pushProductSlugKeys(input.storeId, slug, directKeys);
        } else if (resource.id) {
          unresolved.push({ type: resource.type, id: resource.id });
        }
        break;
      }

      case "collection": {
        tags.push("products:list", "collections:list");
        touchedSurfaces.push("catalog-collections");

        const slug = await resolveSlug(resource, resolvers);
        if (slug) {
          tags.push(`collection:${slug}`);
          pushCollectionSlugKeys(input.storeId, slug, directKeys);
        } else if (resource.id) {
          unresolved.push({ type: resource.type, id: resource.id });
        } else {
          pushCatalogListingKeys(input.storeId, directKeys);
        }
        break;
      }

      case "event": {
        tags.push("events:list", "events:detail");
        touchedSurfaces.push("catalog-events");

        const slug = await resolveSlug(resource, resolvers);
        if (slug) {
          tags.push(`event:${slug}`);
          pushEventSlugKeys(input.storeId, slug, directKeys);
        } else if (resource.id) {
          unresolved.push({ type: resource.type, id: resource.id });
        } else {
          pushEventListingKeys(input.storeId, directKeys);
        }
        break;
      }

      case "currency_rates": {
        tags.push("currency:rates");
        directKeys.push(buildCacheKey(input.storeId, "/api/currency/rates"));
        touchedSurfaces.push("currency-rates");
        break;
      }

      case "products_listing": {
        tags.push("products:list");
        pushCatalogListingKeys(input.storeId, directKeys);
        touchedSurfaces.push("catalog-products");
        break;
      }

      case "collections_listing": {
        tags.push("collections:list");
        directKeys.push(buildCacheKey(input.storeId, "/api/products"));
        directKeys.push(buildCacheKey(input.storeId, "/api/collections"));
        directKeys.push(buildCacheKey(input.storeId, "/api/products/collections"));
        touchedSurfaces.push("catalog-collections");
        break;
      }

      case "events_listing": {
        tags.push("events:list");
        pushEventListingKeys(input.storeId, directKeys);
        touchedSurfaces.push("catalog-events");
        break;
      }
    }
  }

  return {
    tags: unique(tags),
    directKeys: unique(directKeys),
    unresolved: unresolved.sort((a, b) => `${a.type}:${a.id}`.localeCompare(`${b.type}:${b.id}`)),
    touchedSurfaces: unique(touchedSurfaces),
  };
}
