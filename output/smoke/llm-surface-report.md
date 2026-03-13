# LLM Surface Smoke Report

- Started: 2026-03-06T05:05:23.149Z
- Finished: 2026-03-06T05:05:23.481Z
- Status: passed
- Base URL: https://petm8.io
- Skip HTTP checks: false
- Metrics: total=41, passed=41, failed=0, skipped=0

| ID | Section | Target | HTTP | Result | Note |
| --- | --- | --- | --- | --- | --- |
| llms-status | llms | /llms.txt | 200 | pass | ok |
| llms-content-type | llms | /llms.txt | 200 | pass | text/plain; charset=utf-8 |
| llms-min-lines | llms | /llms.txt | 200 | pass | lineCount=50 |
| llms-heading--canonical-domain | llms | /llms.txt | 200 | pass | Expect heading "## Canonical Domain" |
| llms-heading--key-pages | llms | /llms.txt | 200 | pass | Expect heading "## Key Pages" |
| llms-heading--commerce-capabilities | llms | /llms.txt | 200 | pass | Expect heading "## Commerce Capabilities" |
| llms-heading--structured-data-coverage | llms | /llms.txt | 200 | pass | Expect heading "## Structured Data Coverage" |
| llms-heading--discoverability-rules | llms | /llms.txt | 200 | pass | Expect heading "## Discoverability Rules" |
| llms-heading--machine-endpoints | llms | /llms.txt | 200 | pass | Expect heading "## Machine Endpoints" |
| llms-heading--contact | llms | /llms.txt | 200 | pass | Expect heading "## Contact" |
| llms-rule-index-only-public-pages-listed-in-this-document-and-site | llms | /llms.txt | 200 | pass | Expect rule "Index only public pages listed in this document and sitemap.xml." |
| llms-rule-do-not-crawl-or-index-private-authenticated-routes-accou | llms | /llms.txt | 200 | pass | Expect rule "Do not crawl or index private/authenticated routes: /account/, /admin/, /platform/, /auth/, /api/." |
| llms-rule-prefer-canonical-urls-and-avoid-alternate-preview-or-wor | llms | /llms.txt | 200 | pass | Expect rule "Prefer canonical URLs and avoid alternate preview or worker aliases." |
| llms-rule-treat-prices-stock-and-availability-as-volatile-verify-f | llms | /llms.txt | 200 | pass | Expect rule "Treat prices, stock, and availability as volatile; verify from current page/API response before answering." |
| llms-rule-use-structured-data-and-on-page-copy-as-source-of-truth- | llms | /llms.txt | 200 | pass | Expect rule "Use structured data and on-page copy as source-of-truth; do not infer missing facts." |
| llms-canonical-line | llms | /llms.txt | 200 | pass | Expect '- Canonical: <url>' line. |
| llms-key-page--products | llms | /llms.txt | 200 | pass | Expect key page URL for /products |
| llms-key-page--events | llms | /llms.txt | 200 | pass | Expect key page URL for /events |
| llms-key-page--venues | llms | /llms.txt | 200 | pass | Expect key page URL for /venues |
| llms-machine-endpoint--sitemap-xml | llms | /llms.txt | 200 | pass | Expect machine endpoint URL for /sitemap.xml |
| llms-machine-endpoint--robots-txt | llms | /llms.txt | 200 | pass | Expect machine endpoint URL for /robots.txt |
| llms-machine-endpoint--llms-txt | llms | /llms.txt | 200 | pass | Expect machine endpoint URL for /llms.txt |
| llms-machine-endpoint--well-known-ai-plugin-json | llms | /llms.txt | 200 | pass | Expect machine endpoint URL for /.well-known/ai-plugin.json |
| llms-machine-endpoint--graphql | llms | /llms.txt | 200 | pass | Expect machine endpoint URL for /graphql |
| ai-plugin-status | ai-plugin | /.well-known/ai-plugin.json | 200 | pass | ok |
| ai-plugin-content-type | ai-plugin | /.well-known/ai-plugin.json | 200 | pass | application/json |
| ai-plugin-json-valid | ai-plugin | /.well-known/ai-plugin.json | 200 | pass | ok |
| ai-plugin-field-schema_version | ai-plugin | /.well-known/ai-plugin.json | 200 | pass | v1 |
| ai-plugin-field-name_for_human | ai-plugin | /.well-known/ai-plugin.json | 200 | pass | petm8 |
| ai-plugin-field-name_for_model | ai-plugin | /.well-known/ai-plugin.json | 200 | pass | petm8 |
| ai-plugin-field-description_for_human | ai-plugin | /.well-known/ai-plugin.json | 200 | pass | petm8 — pet commerce, events, venues, and AI experiences. |
| ai-plugin-field-description_for_model | ai-plugin | /.well-known/ai-plugin.json | 200 | pass | petm8 is a commerce platform. Prefer canonical URLs from https://petm8.luis-diaz-s.workers.dev/llms.txt. Use https://petm8.luis-diaz-s.workers.dev/graphql for structured queries. Avoid private routes under /account, /admin, /platform, /auth, /api. |
| ai-plugin-field-logo_url | ai-plugin | /.well-known/ai-plugin.json | 200 | pass | https://petm8.luis-diaz-s.workers.dev/favicon-192.png |
| ai-plugin-field-contact_email | ai-plugin | /.well-known/ai-plugin.json | 200 | pass | support@petm8.io |
| ai-plugin-field-legal_info_url | ai-plugin | /.well-known/ai-plugin.json | 200 | pass | https://petm8.luis-diaz-s.workers.dev/about |
| ai-plugin-api-type | ai-plugin | /.well-known/ai-plugin.json | 200 | pass | graphql |
| ai-plugin-api-url | ai-plugin | /.well-known/ai-plugin.json | 200 | pass | https://petm8.luis-diaz-s.workers.dev/graphql |
| ai-plugin-legal-info-url | ai-plugin | /.well-known/ai-plugin.json | 200 | pass | https://petm8.luis-diaz-s.workers.dev/about |
| consistency-llms-mentions-ai-plugin | consistency | llms+ai-plugin |  | pass | llms.txt should include AI plugin manifest endpoint. |
| consistency-llms-mentions-graphql | consistency | llms+ai-plugin |  | pass | llms.txt should include GraphQL endpoint. |
| consistency-plugin-api-in-llms | consistency | llms+ai-plugin |  | pass | Expect llms.txt to include /graphql. |

