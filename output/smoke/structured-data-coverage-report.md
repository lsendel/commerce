# Structured Data Coverage Report

- Started: 2026-03-06T05:05:24.277Z
- Finished: 2026-03-06T05:05:26.544Z
- Status: passed
- Base URL: https://petm8.io
- Skip HTTP checks: false
- Metrics: total=48, passed=48, failed=0, skipped=0

## Checks

| ID | Section | Target | HTTP | Result | Note |
| --- | --- | --- | --- | --- | --- |
| schema-organization-type | schema-tests | buildOrganization |  | pass | type=Organization |
| schema-website-search-action | schema-tests | buildWebSite |  | pass | urlTemplate=https://petm8.io/products?search={search_term_string} |
| schema-collection-page-shape | schema-tests | buildCollectionPage |  | pass | numberOfItems=10 |
| schema-item-list-elements | schema-tests | buildItemList |  | pass | itemListElementCount=2 |
| schema-web-page-type | schema-tests | buildWebPage |  | pass | type=AboutPage |
| schema-place-address | schema-tests | buildPlace |  | pass | streetAddress=123 Pet St |
| coverage-sitemap-status | live-coverage | /sitemap.xml | 200 | pass | ok |
| home-status | live-coverage | / | 200 | pass | ok |
| home-jsonld-parse | live-coverage | / | 200 | pass | payloads=1 |
| home-jsonld-present | live-coverage | / | 200 | pass | schemaPayloads=1 |
| home-type-organization | live-coverage | / | 200 | pass | discovered=EntryPoint, Organization, SearchAction, WebPage, WebSite |
| home-type-website | live-coverage | / | 200 | pass | discovered=EntryPoint, Organization, SearchAction, WebPage, WebSite |
| products-status | live-coverage | /products | 200 | pass | ok |
| products-jsonld-parse | live-coverage | /products | 200 | pass | payloads=1 |
| products-jsonld-present | live-coverage | /products | 200 | pass | schemaPayloads=1 |
| products-type-collectionpage | live-coverage | /products | 200 | pass | discovered=CollectionPage, ItemList, ListItem |
| products-type-itemlist | live-coverage | /products | 200 | pass | discovered=CollectionPage, ItemList, ListItem |
| events-status | live-coverage | /events | 200 | pass | ok |
| events-jsonld-parse | live-coverage | /events | 200 | pass | payloads=1 |
| events-jsonld-present | live-coverage | /events | 200 | pass | schemaPayloads=1 |
| events-type-collectionpage | live-coverage | /events | 200 | pass | discovered=CollectionPage, ItemList, ListItem |
| events-type-itemlist | live-coverage | /events | 200 | pass | discovered=CollectionPage, ItemList, ListItem |
| events-calendar-status | live-coverage | /events/calendar | 200 | pass | ok |
| events-calendar-jsonld-parse | live-coverage | /events/calendar | 200 | pass | payloads=1 |
| events-calendar-jsonld-present | live-coverage | /events/calendar | 200 | pass | schemaPayloads=1 |
| events-calendar-type-collectionpage | live-coverage | /events/calendar | 200 | pass | discovered=CollectionPage |
| venues-status | live-coverage | /venues | 200 | pass | ok |
| venues-jsonld-parse | live-coverage | /venues | 200 | pass | payloads=1 |
| venues-jsonld-present | live-coverage | /venues | 200 | pass | schemaPayloads=1 |
| venues-type-collectionpage | live-coverage | /venues | 200 | pass | discovered=CollectionPage, ItemList |
| venues-type-itemlist | live-coverage | /venues | 200 | pass | discovered=CollectionPage, ItemList |
| about-status | live-coverage | /about | 200 | pass | ok |
| about-jsonld-parse | live-coverage | /about | 200 | pass | payloads=1 |
| about-jsonld-present | live-coverage | /about | 200 | pass | schemaPayloads=1 |
| about-type-aboutpage | live-coverage | /about | 200 | pass | discovered=AboutPage |
| contact-status | live-coverage | /contact | 200 | pass | ok |
| contact-jsonld-parse | live-coverage | /contact | 200 | pass | payloads=1 |
| contact-jsonld-present | live-coverage | /contact | 200 | pass | schemaPayloads=1 |
| contact-type-contactpage | live-coverage | /contact | 200 | pass | discovered=ContactPage |
| product-detail-status | live-coverage | /products/dog-beach-day-experience | 200 | pass | ok |
| product-detail-jsonld-parse | live-coverage | /products/dog-beach-day-experience | 200 | pass | payloads=2 |
| product-detail-jsonld-present | live-coverage | /products/dog-beach-day-experience | 200 | pass | schemaPayloads=2 |
| product-detail-type-product | live-coverage | /products/dog-beach-day-experience | 200 | pass | discovered=BreadcrumbList, ListItem, Offer, Organization, Product |
| product-detail-type-breadcrumblist | live-coverage | /products/dog-beach-day-experience | 200 | pass | discovered=BreadcrumbList, ListItem, Offer, Organization, Product |
| event-detail-status | live-coverage | /events/dog-beach-day-experience | 200 | pass | ok |
| event-detail-jsonld-parse | live-coverage | /events/dog-beach-day-experience | 200 | pass | payloads=1 |
| event-detail-jsonld-present | live-coverage | /events/dog-beach-day-experience | 200 | pass | schemaPayloads=1 |
| event-detail-type-event | live-coverage | /events/dog-beach-day-experience | 200 | pass | discovered=Answer, Event, FAQPage, Offer, Place, Question |

## Coverage

| Path | Expected Types | Discovered Types | Payloads |
| --- | --- | --- | --- |
| / | Organization, WebSite | EntryPoint, Organization, SearchAction, WebPage, WebSite | 1 |
| /products | CollectionPage, ItemList | CollectionPage, ItemList, ListItem | 1 |
| /events | CollectionPage, ItemList | CollectionPage, ItemList, ListItem | 1 |
| /events/calendar | CollectionPage | CollectionPage | 1 |
| /venues | CollectionPage, ItemList | CollectionPage, ItemList | 1 |
| /about | AboutPage | AboutPage | 1 |
| /contact | ContactPage | ContactPage | 1 |
| /products/dog-beach-day-experience | Product, BreadcrumbList | BreadcrumbList, ListItem, Offer, Organization, Product | 2 |
| /events/dog-beach-day-experience | Event | Answer, Event, FAQPage, Offer, Place, Question | 1 |

