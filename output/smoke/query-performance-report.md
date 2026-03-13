# Query Performance Smoke Report

- Started: 2026-03-13T04:41:36.759Z
- Finished: 2026-03-13T04:41:36.778Z
- Status: passed
- Policy: docs/policies/query-performance-budget-v1.json
- Metrics: checks=66, failed=0, hotPaths=6/6, cacheSurfaces=3/3, indexes=8

## Hot Path Evaluation

| ID | Label | Target P95 (ms) | Budget Units | Predicates | Index Coverage | Status |
| --- | --- | --- | --- | --- | --- | --- |
| hp-cart-find-or-create | Cart session lookup | 40 | 2 | ok | ok | pass |
| hp-cart-merge | Cart merge login path | 90 | 5 | ok | ok | pass |
| hp-orders-by-store | Admin order listing | 120 | 3 | ok | ok | pass |
| hp-orders-by-user | Account order listing | 90 | 3 | ok | ok | pass |
| hp-active-promotions | Active promotion resolution | 80 | 2 | ok | ok | pass |
| hp-segment-freshness | Segment freshness snapshot | 100 | 3 | ok | ok | pass |

## Cache Surface Evaluation

| ID | Target Hit Rate (%) | Snippet Present | Status |
| --- | --- | --- | --- |
| cache-products-list | 70 | yes | pass |
| cache-product-detail | 80 | yes | pass |
| cache-collections-list | 75 | yes | pass |

## Checks

| Check | Status | Note |
| --- | --- | --- |
| policy-owner-present | pass | Policy owner must be defined. |
| hotpaths-present | pass | Policy must define at least one hot path budget. |
| cache-surfaces-present | pass | Policy must define at least one cache surface budget. |
| index-catalog-present | pass | Policy must define at least one index name in indexCatalog. |
| index-migration-path-exists | pass | Index migration script must exist: scripts/sql/add-week57-performance-indexes.sql |
| index-schema-carts_store_session_idx | pass | Schema must define index name carts_store_session_idx. |
| index-sql-carts_store_session_idx | pass | SQL migration must include index name carts_store_session_idx. |
| index-schema-carts_store_user_idx | pass | Schema must define index name carts_store_user_idx. |
| index-sql-carts_store_user_idx | pass | SQL migration must include index name carts_store_user_idx. |
| index-schema-orders_store_user_created_idx | pass | Schema must define index name orders_store_user_created_idx. |
| index-sql-orders_store_user_created_idx | pass | SQL migration must include index name orders_store_user_created_idx. |
| index-schema-orders_store_status_created_idx | pass | Schema must define index name orders_store_status_created_idx. |
| index-sql-orders_store_status_created_idx | pass | SQL migration must include index name orders_store_status_created_idx. |
| index-schema-promotions_store_status_window_priority_idx | pass | Schema must define index name promotions_store_status_window_priority_idx. |
| index-sql-promotions_store_status_window_priority_idx | pass | SQL migration must include index name promotions_store_status_window_priority_idx. |
| index-schema-redemptions_promotion_customer_idx | pass | Schema must define index name redemptions_promotion_customer_idx. |
| index-sql-redemptions_promotion_customer_idx | pass | SQL migration must include index name redemptions_promotion_customer_idx. |
| index-schema-customer_segments_store_created_idx | pass | Schema must define index name customer_segments_store_created_idx. |
| index-sql-customer_segments_store_created_idx | pass | SQL migration must include index name customer_segments_store_created_idx. |
| index-schema-segment_memberships_segment_customer_idx | pass | Schema must define index name segment_memberships_segment_customer_idx. |
| index-sql-segment_memberships_segment_customer_idx | pass | SQL migration must include index name segment_memberships_segment_customer_idx. |
| hotpath-hp-cart-find-or-create-file-exists | pass | Repository file must exist: src/infrastructure/repositories/cart.repository.ts |
| hotpath-hp-cart-find-or-create-method-present | pass | Method findOrCreateCart must exist in src/infrastructure/repositories/cart.repository.ts. |
| hotpath-hp-cart-find-or-create-predicates | pass | Hot path hp-cart-find-or-create must contain all required predicates. |
| hotpath-hp-cart-find-or-create-index-catalog-coverage | pass | Hot path hp-cart-find-or-create missing indexCatalog entries: none. |
| hotpath-hp-cart-find-or-create-budget-valid | pass | Hot path hp-cart-find-or-create must define positive targetP95Ms and queryBudgetUnits. |
| hotpath-hp-cart-merge-file-exists | pass | Repository file must exist: src/infrastructure/repositories/cart.repository.ts |
| hotpath-hp-cart-merge-method-present | pass | Method mergeCart must exist in src/infrastructure/repositories/cart.repository.ts. |
| hotpath-hp-cart-merge-predicates | pass | Hot path hp-cart-merge must contain all required predicates. |
| hotpath-hp-cart-merge-index-catalog-coverage | pass | Hot path hp-cart-merge missing indexCatalog entries: none. |
| hotpath-hp-cart-merge-budget-valid | pass | Hot path hp-cart-merge must define positive targetP95Ms and queryBudgetUnits. |
| hotpath-hp-orders-by-store-file-exists | pass | Repository file must exist: src/infrastructure/repositories/order.repository.ts |
| hotpath-hp-orders-by-store-method-present | pass | Method findByStore must exist in src/infrastructure/repositories/order.repository.ts. |
| hotpath-hp-orders-by-store-predicates | pass | Hot path hp-orders-by-store must contain all required predicates. |
| hotpath-hp-orders-by-store-index-catalog-coverage | pass | Hot path hp-orders-by-store missing indexCatalog entries: none. |
| hotpath-hp-orders-by-store-budget-valid | pass | Hot path hp-orders-by-store must define positive targetP95Ms and queryBudgetUnits. |
| hotpath-hp-orders-by-user-file-exists | pass | Repository file must exist: src/infrastructure/repositories/order.repository.ts |
| hotpath-hp-orders-by-user-method-present | pass | Method findByUserId must exist in src/infrastructure/repositories/order.repository.ts. |
| hotpath-hp-orders-by-user-predicates | pass | Hot path hp-orders-by-user must contain all required predicates. |
| hotpath-hp-orders-by-user-index-catalog-coverage | pass | Hot path hp-orders-by-user missing indexCatalog entries: none. |
| hotpath-hp-orders-by-user-budget-valid | pass | Hot path hp-orders-by-user must define positive targetP95Ms and queryBudgetUnits. |
| hotpath-hp-active-promotions-file-exists | pass | Repository file must exist: src/infrastructure/repositories/promotion.repository.ts |
| hotpath-hp-active-promotions-method-present | pass | Method listActive must exist in src/infrastructure/repositories/promotion.repository.ts. |
| hotpath-hp-active-promotions-predicates | pass | Hot path hp-active-promotions must contain all required predicates. |
| hotpath-hp-active-promotions-index-catalog-coverage | pass | Hot path hp-active-promotions missing indexCatalog entries: none. |
| hotpath-hp-active-promotions-budget-valid | pass | Hot path hp-active-promotions must define positive targetP95Ms and queryBudgetUnits. |
| hotpath-hp-segment-freshness-file-exists | pass | Repository file must exist: src/infrastructure/repositories/promotion.repository.ts |
| hotpath-hp-segment-freshness-method-present | pass | Method getSegmentFreshnessSnapshot must exist in src/infrastructure/repositories/promotion.repository.ts. |
| hotpath-hp-segment-freshness-predicates | pass | Hot path hp-segment-freshness must contain all required predicates. |
| hotpath-hp-segment-freshness-index-catalog-coverage | pass | Hot path hp-segment-freshness missing indexCatalog entries: none. |
| hotpath-hp-segment-freshness-budget-valid | pass | Hot path hp-segment-freshness must define positive targetP95Ms and queryBudgetUnits. |
| cache-cache-products-list-file-exists | pass | Cache surface source path must exist: src/routes/api/products.routes.ts |
| cache-cache-products-list-snippet | pass | Cache surface cache-products-list must include required snippet. |
| cache-cache-products-list-target-valid | pass | Cache surface cache-products-list targetHitRatePercent must be in range (0, 100]. |
| cache-cache-product-detail-file-exists | pass | Cache surface source path must exist: src/routes/api/products.routes.ts |
| cache-cache-product-detail-snippet | pass | Cache surface cache-product-detail must include required snippet. |
| cache-cache-product-detail-target-valid | pass | Cache surface cache-product-detail targetHitRatePercent must be in range (0, 100]. |
| cache-cache-collections-list-file-exists | pass | Cache surface source path must exist: src/routes/api/products.routes.ts |
| cache-cache-collections-list-snippet | pass | Cache surface cache-collections-list must include required snippet. |
| cache-cache-collections-list-target-valid | pass | Cache surface cache-collections-list targetHitRatePercent must be in range (0, 100]. |
| review-cadence-valid | pass | reviewCadenceDays must be a positive number. |
| review-dates-format | pass | lastReviewedOn and nextReviewBy must use YYYY-MM-DD format. |
| review-next-after-last | pass | nextReviewBy must be on or after lastReviewedOn. |
| review-window-valid | pass | nextReviewBy must stay within reviewCadenceDays window. |
| review-not-overdue | pass | Query performance policy review date must not be overdue. |
| runbook-exists | pass | Runbook must exist: docs/runbooks/query-performance-budget-wave1.md |

