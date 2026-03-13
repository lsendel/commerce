# Technical SEO Smoke Audit Report

- Started: 2026-03-06T05:05:21.755Z
- Finished: 2026-03-06T05:05:22.474Z
- Status: passed
- Base URL: https://petm8.io
- Skip HTTP checks: false
- Metrics: total=83, passed=83, failed=0, skipped=0

| ID | Section | Target | HTTP | Result | Note |
| --- | --- | --- | --- | --- | --- |
| robots-status | robots | /robots.txt | 200 | pass | ok |
| robots-content-type | robots | /robots.txt | 200 | pass | text/plain; charset=utf-8 |
| robots-rule-user-agent- | robots | /robots.txt | 200 | pass | Expect "User-agent: *" |
| robots-rule-disallow-api- | robots | /robots.txt | 200 | pass | Expect "Disallow: /api/" |
| robots-rule-disallow-admin- | robots | /robots.txt | 200 | pass | Expect "Disallow: /admin/" |
| robots-rule-disallow-platform- | robots | /robots.txt | 200 | pass | Expect "Disallow: /platform/" |
| robots-rule-disallow-account- | robots | /robots.txt | 200 | pass | Expect "Disallow: /account/" |
| robots-rule-disallow-auth- | robots | /robots.txt | 200 | pass | Expect "Disallow: /auth/" |
| robots-sitemap-directive | robots | /robots.txt | 200 | pass | https://petm8.luis-diaz-s.workers.dev/sitemap.xml |
| sitemap-status | sitemap | /sitemap.xml | 200 | pass | ok |
| sitemap-content-type | sitemap | /sitemap.xml | 200 | pass | application/xml; charset=utf-8 |
| sitemap-has-urls | sitemap | /sitemap.xml | 200 | pass | Found 16 URL entries. |
| sitemap-no-duplicates | sitemap | /sitemap.xml | 200 | pass | Entries=16, unique=16. |
| sitemap-contains-- | sitemap | /sitemap.xml | 200 | pass | Expect path "/" |
| sitemap-contains--products | sitemap | /sitemap.xml | 200 | pass | Expect path "/products" |
| sitemap-contains--events | sitemap | /sitemap.xml | 200 | pass | Expect path "/events" |
| sitemap-contains--venues | sitemap | /sitemap.xml | 200 | pass | Expect path "/venues" |
| sitemap-excludes--api- | sitemap | /sitemap.xml | 200 | pass | ok |
| sitemap-excludes--admin- | sitemap | /sitemap.xml | 200 | pass | ok |
| sitemap-excludes--platform- | sitemap | /sitemap.xml | 200 | pass | ok |
| sitemap-excludes--account- | sitemap | /sitemap.xml | 200 | pass | ok |
| sitemap-excludes--auth- | sitemap | /sitemap.xml | 200 | pass | ok |
| home-status | metadata | / | 200 | pass | ok |
| home-content-type | metadata | / | 200 | pass | text/html; charset=UTF-8 |
| home-title | metadata | / | 200 | pass | Title length=12 |
| home-description | metadata | / | 200 | pass | Description length=105 |
| home-robots-meta | metadata | / | 200 | pass | robots=index,follow |
| home-canonical-present | canonical | / | 200 | pass | https://petm8.luis-diaz-s.workers.dev |
| home-canonical-absolute | canonical | / | 200 | pass | https://petm8.luis-diaz-s.workers.dev/ |
| home-canonical-path-match | canonical | / | 200 | pass | https://petm8.luis-diaz-s.workers.dev/ |
| home-jsonld-valid | structured-data | / | 200 | pass | payloads=1 |
| home-jsonld-required | structured-data | / | 200 | pass | schemaPayloads=1 |
| home-jsonld-has-types | structured-data | / | 200 | pass | types=EntryPoint, Organization, SearchAction, WebPage, WebSite |
| products-status | metadata | /products | 200 | pass | ok |
| products-content-type | metadata | /products | 200 | pass | text/html; charset=UTF-8 |
| products-title | metadata | /products | 200 | pass | Title length=12 |
| products-description | metadata | /products | 200 | pass | Description length=65 |
| products-robots-meta | metadata | /products | 200 | pass | robots=index,follow |
| products-canonical-present | canonical | /products | 200 | pass | https://petm8.luis-diaz-s.workers.dev/products |
| products-canonical-absolute | canonical | /products | 200 | pass | https://petm8.luis-diaz-s.workers.dev/products |
| products-canonical-path-match | canonical | /products | 200 | pass | https://petm8.luis-diaz-s.workers.dev/products |
| products-jsonld-valid | structured-data | /products | 200 | pass | payloads=1 |
| events-status | metadata | /events | 200 | pass | ok |
| events-content-type | metadata | /events | 200 | pass | text/html; charset=UTF-8 |
| events-title | metadata | /events | 200 | pass | Title length=14 |
| events-description | metadata | /events | 200 | pass | Description length=67 |
| events-robots-meta | metadata | /events | 200 | pass | robots=index,follow |
| events-canonical-present | canonical | /events | 200 | pass | https://petm8.io/events |
| events-canonical-absolute | canonical | /events | 200 | pass | https://petm8.io/events |
| events-canonical-path-match | canonical | /events | 200 | pass | https://petm8.io/events |
| events-jsonld-valid | structured-data | /events | 200 | pass | payloads=1 |
| venues-status | metadata | /venues | 200 | pass | ok |
| venues-content-type | metadata | /venues | 200 | pass | text/html; charset=UTF-8 |
| venues-title | metadata | /venues | 200 | pass | Title length=14 |
| venues-description | metadata | /venues | 200 | pass | Description length=76 |
| venues-robots-meta | metadata | /venues | 200 | pass | robots=index,follow |
| venues-canonical-present | canonical | /venues | 200 | pass | https://petm8.io/venues |
| venues-canonical-absolute | canonical | /venues | 200 | pass | https://petm8.io/venues |
| venues-canonical-path-match | canonical | /venues | 200 | pass | https://petm8.io/venues |
| venues-jsonld-valid | structured-data | /venues | 200 | pass | payloads=1 |
| product-detail-status | metadata | /products/dog-beach-day-experience | 200 | pass | ok |
| product-detail-content-type | metadata | /products/dog-beach-day-experience | 200 | pass | text/html; charset=UTF-8 |
| product-detail-title | metadata | /products/dog-beach-day-experience | 200 | pass | Title length=40 |
| product-detail-description | metadata | /products/dog-beach-day-experience | 200 | pass | Description length=113 |
| product-detail-robots-meta | metadata | /products/dog-beach-day-experience | 200 | pass | robots=index,follow |
| product-detail-canonical-present | canonical | /products/dog-beach-day-experience | 200 | pass | https://petm8.luis-diaz-s.workers.dev/products/dog-beach-day-experience |
| product-detail-canonical-absolute | canonical | /products/dog-beach-day-experience | 200 | pass | https://petm8.luis-diaz-s.workers.dev/products/dog-beach-day-experience |
| product-detail-canonical-path-match | canonical | /products/dog-beach-day-experience | 200 | pass | https://petm8.luis-diaz-s.workers.dev/products/dog-beach-day-experience |
| product-detail-jsonld-valid | structured-data | /products/dog-beach-day-experience | 200 | pass | payloads=2 |
| product-detail-jsonld-required | structured-data | /products/dog-beach-day-experience | 200 | pass | schemaPayloads=2 |
| product-detail-jsonld-has-types | structured-data | /products/dog-beach-day-experience | 200 | pass | types=BreadcrumbList, ListItem, Offer, Organization, Product |
| event-detail-status | metadata | /events/dog-beach-day-experience | 200 | pass | ok |
| event-detail-content-type | metadata | /events/dog-beach-day-experience | 200 | pass | text/html; charset=UTF-8 |
| event-detail-title | metadata | /events/dog-beach-day-experience | 200 | pass | Title length=40 |
| event-detail-description | metadata | /events/dog-beach-day-experience | 200 | pass | Description length=113 |
| event-detail-robots-meta | metadata | /events/dog-beach-day-experience | 200 | pass | robots=index,follow |
| event-detail-canonical-present | canonical | /events/dog-beach-day-experience | 200 | pass | https://petm8.luis-diaz-s.workers.dev/events/dog-beach-day-experience |
| event-detail-canonical-absolute | canonical | /events/dog-beach-day-experience | 200 | pass | https://petm8.luis-diaz-s.workers.dev/events/dog-beach-day-experience |
| event-detail-canonical-path-match | canonical | /events/dog-beach-day-experience | 200 | pass | https://petm8.luis-diaz-s.workers.dev/events/dog-beach-day-experience |
| event-detail-jsonld-valid | structured-data | /events/dog-beach-day-experience | 200 | pass | payloads=1 |
| event-detail-jsonld-required | structured-data | /events/dog-beach-day-experience | 200 | pass | schemaPayloads=1 |
| event-detail-jsonld-has-types | structured-data | /events/dog-beach-day-experience | 200 | pass | types=Answer, Event, FAQPage, Offer, Place, Question |
| canonical-origin-consistency | canonical | all-pages |  | pass | Origins vary (https://petm8.luis-diaz-s.workers.dev, https://petm8.io); strict mode disabled |
