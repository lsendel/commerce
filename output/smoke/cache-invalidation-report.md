# Cache Invalidation Smoke Report

- Started: 2026-03-06T06:41:16.083Z
- Finished: 2026-03-06T06:41:16.094Z
- Status: passed
- Policy path: docs/policies/cache-policy-matrix-v1.json
- Surface count: 8
- Trigger count: 5
- Plan cases: 7
- Plan cases passing: 7
- Total checks: 98
- Failed checks: 0

## Plan Evaluations

| Case | Status | Tags | Direct Keys | Unresolved | Touched Surfaces | Note |
| --- | --- | --- | --- | --- | --- | --- |
| plan-product-slug | pass | pass | pass | pass | pass | all expected outputs present |
| plan-collection-slug | pass | pass | pass | pass | pass | all expected outputs present |
| plan-event-slug | pass | pass | pass | pass | pass | all expected outputs present |
| plan-currency-rates | pass | pass | pass | pass | pass | all expected outputs present |
| plan-listing-broadcast | pass | pass | pass | pass | pass | all expected outputs present |
| plan-unresolved-product-id | pass | pass | pass | pass | pass | all expected outputs present |
| plan-resolver-id-coverage | pass | pass | pass | pass | pass | all expected outputs present |

## Checks

| Check | Status | Note |
| --- | --- | --- |
| policy-owner-present | pass | Policy owner must be defined. |
| surfaces-present | pass | Policy must define at least one cache surface. |
| triggers-present | pass | Policy must define at least one invalidation trigger. |
| resource-type-coverage | pass | resourceTypeCoverage must include all supported resource types: product, collection, event, currency_rates, products_listing, collections_listing, events_listing |
| webhook-path-valid | pass | webhookPath must include /api/ and cache-invalidate path semantics. |
| review-cadence-valid | pass | reviewCadenceDays must be a positive number. |
| review-dates-format | pass | lastReviewedOn and nextReviewBy must use YYYY-MM-DD format. |
| review-next-after-last | pass | nextReviewBy must be on or after lastReviewedOn. |
| review-window-valid | pass | nextReviewBy must stay within reviewCadenceDays window. |
| review-not-overdue | pass | Cache policy review date must not be overdue. |
| surface-products-list-route-path-valid | pass | Surface routePath must start with /: /api/products |
| surface-products-list-ttl-valid | pass | Surface ttlSeconds must be positive: 300 |
| surface-products-list-tags-present | pass | Surface tags must be a non-empty array. |
| surface-products-list-target-hit-rate-valid | pass | targetHitRatePercent must be in range (0, 100]: 70 |
| surface-products-list-resource-types-valid | pass | Surface invalidationResourceTypes must use supported resource types only: product, products_listing, collection, collections_listing |
| surface-products-list-source-path-exists | pass | Surface source path must exist: src/routes/api/products.routes.ts |
| surface-products-list-snippet-1 | pass | Required snippet must be present in src/routes/api/products.routes.ts: cacheResponse({ ttl: 300, tags: ["products:list"] }) |
| surface-product-detail-route-path-valid | pass | Surface routePath must start with /: /api/products/:slug |
| surface-product-detail-ttl-valid | pass | Surface ttlSeconds must be positive: 3600 |
| surface-product-detail-tags-present | pass | Surface tags must be a non-empty array. |
| surface-product-detail-target-hit-rate-valid | pass | targetHitRatePercent must be in range (0, 100]: 80 |
| surface-product-detail-resource-types-valid | pass | Surface invalidationResourceTypes must use supported resource types only: product |
| surface-product-detail-source-path-exists | pass | Surface source path must exist: src/routes/api/products.routes.ts |
| surface-product-detail-snippet-1 | pass | Required snippet must be present in src/routes/api/products.routes.ts: tags: ["products:detail"], |
| surface-product-detail-snippet-2 | pass | Required snippet must be present in src/routes/api/products.routes.ts: dynamicTags: (c) => [`product:${c.req.param("slug")}`] |
| surface-collections-list-route-path-valid | pass | Surface routePath must start with /: /api/collections |
| surface-collections-list-ttl-valid | pass | Surface ttlSeconds must be positive: 3600 |
| surface-collections-list-tags-present | pass | Surface tags must be a non-empty array. |
| surface-collections-list-target-hit-rate-valid | pass | targetHitRatePercent must be in range (0, 100]: 75 |
| surface-collections-list-resource-types-valid | pass | Surface invalidationResourceTypes must use supported resource types only: collection, collections_listing |
| surface-collections-list-source-path-exists | pass | Surface source path must exist: src/routes/api/products.routes.ts |
| surface-collections-list-snippet-1 | pass | Required snippet must be present in src/routes/api/products.routes.ts: cacheResponse({ ttl: 3600, tags: ["collections:list"] }) |
| surface-collections-legacy-list-route-path-valid | pass | Surface routePath must start with /: /api/products/collections |
| surface-collections-legacy-list-ttl-valid | pass | Surface ttlSeconds must be positive: 3600 |
| surface-collections-legacy-list-tags-present | pass | Surface tags must be a non-empty array. |
| surface-collections-legacy-list-target-hit-rate-valid | pass | targetHitRatePercent must be in range (0, 100]: 65 |
| surface-collections-legacy-list-resource-types-valid | pass | Surface invalidationResourceTypes must use supported resource types only: collection, collections_listing |
| surface-collections-legacy-list-source-path-exists | pass | Surface source path must exist: src/routes/api/products.routes.ts |
| surface-collections-legacy-list-snippet-1 | pass | Required snippet must be present in src/routes/api/products.routes.ts: "/products/collections" |
| surface-collections-legacy-list-snippet-2 | pass | Required snippet must be present in src/routes/api/products.routes.ts: cacheResponse({ ttl: 3600, tags: ["collections:list"] }) |
| surface-collection-detail-route-path-valid | pass | Surface routePath must start with /: /api/collections/:slug |
| surface-collection-detail-ttl-valid | pass | Surface ttlSeconds must be positive: 3600 |
| surface-collection-detail-tags-present | pass | Surface tags must be a non-empty array. |
| surface-collection-detail-target-hit-rate-valid | pass | targetHitRatePercent must be in range (0, 100]: 75 |
| surface-collection-detail-resource-types-valid | pass | Surface invalidationResourceTypes must use supported resource types only: collection |
| surface-collection-detail-source-path-exists | pass | Surface source path must exist: src/routes/api/products.routes.ts |
| surface-collection-detail-snippet-1 | pass | Required snippet must be present in src/routes/api/products.routes.ts: dynamicTags: (c) => [`collection:${c.req.param("slug")}`] |
| surface-events-list-route-path-valid | pass | Surface routePath must start with /: /api/events |
| surface-events-list-ttl-valid | pass | Surface ttlSeconds must be positive: 180 |
| surface-events-list-tags-present | pass | Surface tags must be a non-empty array. |
| surface-events-list-target-hit-rate-valid | pass | targetHitRatePercent must be in range (0, 100]: 70 |
| surface-events-list-resource-types-valid | pass | Surface invalidationResourceTypes must use supported resource types only: event, events_listing |
| surface-events-list-source-path-exists | pass | Surface source path must exist: src/routes/api/events.routes.ts |
| surface-events-list-snippet-1 | pass | Required snippet must be present in src/routes/api/events.routes.ts: cacheResponse({ ttl: 180, tags: ["events:list"] }) |
| surface-event-detail-route-path-valid | pass | Surface routePath must start with /: /api/events/:slug |
| surface-event-detail-ttl-valid | pass | Surface ttlSeconds must be positive: 300 |
| surface-event-detail-tags-present | pass | Surface tags must be a non-empty array. |
| surface-event-detail-target-hit-rate-valid | pass | targetHitRatePercent must be in range (0, 100]: 78 |
| surface-event-detail-resource-types-valid | pass | Surface invalidationResourceTypes must use supported resource types only: event |
| surface-event-detail-source-path-exists | pass | Surface source path must exist: src/routes/api/events.routes.ts |
| surface-event-detail-snippet-1 | pass | Required snippet must be present in src/routes/api/events.routes.ts: tags: ["events:detail"], |
| surface-event-detail-snippet-2 | pass | Required snippet must be present in src/routes/api/events.routes.ts: return slug ? [`event:${slug}`] : []; |
| surface-currency-rates-route-path-valid | pass | Surface routePath must start with /: /api/currency/rates |
| surface-currency-rates-ttl-valid | pass | Surface ttlSeconds must be positive: 3600 |
| surface-currency-rates-tags-present | pass | Surface tags must be a non-empty array. |
| surface-currency-rates-target-hit-rate-valid | pass | targetHitRatePercent must be in range (0, 100]: 85 |
| surface-currency-rates-resource-types-valid | pass | Surface invalidationResourceTypes must use supported resource types only: currency_rates |
| surface-currency-rates-source-path-exists | pass | Surface source path must exist: src/routes/api/currency.routes.ts |
| surface-currency-rates-snippet-1 | pass | Required snippet must be present in src/routes/api/currency.routes.ts: cacheResponse({ ttl: 3600, tags: ["currency:rates"] }) |
| trigger-cache-webhook-resource-types-valid | pass | Trigger resourceTypes must use supported resource types only: product, collection, event, currency_rates, products_listing, collections_listing, events_listing |
| trigger-cache-webhook-source-path-exists | pass | Trigger source path must exist: src/routes/api/cache.routes.ts |
| trigger-cache-webhook-snippet-1 | pass | Required snippet must be present in src/routes/api/cache.routes.ts: "/webhooks/cache-invalidate" |
| trigger-cache-webhook-snippet-2 | pass | Required snippet must be present in src/routes/api/cache.routes.ts: const parsedBody = cacheInvalidationBodySchema.safeParse(rawBody); |
| trigger-cache-webhook-snippet-3 | pass | Required snippet must be present in src/routes/api/cache.routes.ts: const execution = await executeCacheInvalidation({ |
| trigger-admin-product-mutations-resource-types-valid | pass | Trigger resourceTypes must use supported resource types only: product, event |
| trigger-admin-product-mutations-source-path-exists | pass | Trigger source path must exist: src/routes/api/admin-products.routes.ts |
| trigger-admin-product-mutations-snippet-1 | pass | Required snippet must be present in src/routes/api/admin-products.routes.ts: async function invalidateProductCache |
| trigger-admin-product-mutations-snippet-2 | pass | Required snippet must be present in src/routes/api/admin-products.routes.ts: type: "event" |
| trigger-admin-product-mutations-snippet-3 | pass | Required snippet must be present in src/routes/api/admin-products.routes.ts: await invalidateProductCache({ |
| trigger-admin-collection-mutations-resource-types-valid | pass | Trigger resourceTypes must use supported resource types only: collection |
| trigger-admin-collection-mutations-source-path-exists | pass | Trigger source path must exist: src/routes/api/admin-collections.routes.ts |
| trigger-admin-collection-mutations-snippet-1 | pass | Required snippet must be present in src/routes/api/admin-collections.routes.ts: async function invalidateCollectionCache |
| trigger-admin-collection-mutations-snippet-2 | pass | Required snippet must be present in src/routes/api/admin-collections.routes.ts: await invalidateCollectionCache({ |
| trigger-currency-config-update-resource-types-valid | pass | Trigger resourceTypes must use supported resource types only: currency_rates |
| trigger-currency-config-update-source-path-exists | pass | Trigger source path must exist: src/routes/api/currency.routes.ts |
| trigger-currency-config-update-snippet-1 | pass | Required snippet must be present in src/routes/api/currency.routes.ts: await invalidateByTags(["currency:rates"]); |
| trigger-plan-executor-resource-types-valid | pass | Trigger resourceTypes must use supported resource types only: product, collection, event, currency_rates, products_listing, collections_listing, events_listing |
| trigger-plan-executor-source-path-exists | pass | Trigger source path must exist: src/infrastructure/cache/invalidation-executor.ts |
| trigger-plan-executor-snippet-1 | pass | Required snippet must be present in src/infrastructure/cache/invalidation-executor.ts: buildCacheInvalidationPlan |
| trigger-plan-executor-snippet-2 | pass | Required snippet must be present in src/infrastructure/cache/invalidation-executor.ts: await invalidateByTags(plan.tags); |
| trigger-plan-executor-snippet-3 | pass | Required snippet must be present in src/infrastructure/cache/invalidation-executor.ts: directKeysPurged |
| plan-plan-product-slug | pass | Plan case plan-product-slug must satisfy expected tags/keys/unresolved/touched surfaces. |
| plan-plan-collection-slug | pass | Plan case plan-collection-slug must satisfy expected tags/keys/unresolved/touched surfaces. |
| plan-plan-event-slug | pass | Plan case plan-event-slug must satisfy expected tags/keys/unresolved/touched surfaces. |
| plan-plan-currency-rates | pass | Plan case plan-currency-rates must satisfy expected tags/keys/unresolved/touched surfaces. |
| plan-plan-listing-broadcast | pass | Plan case plan-listing-broadcast must satisfy expected tags/keys/unresolved/touched surfaces. |
| plan-plan-unresolved-product-id | pass | Plan case plan-unresolved-product-id must satisfy expected tags/keys/unresolved/touched surfaces. |
| plan-plan-resolver-id-coverage | pass | Plan case plan-resolver-id-coverage must satisfy expected tags/keys/unresolved/touched surfaces. |

