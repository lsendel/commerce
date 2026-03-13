# LLM Surface Checklist

Use this checklist for each release that changes discoverability, SEO, or content surfaces.

## Endpoint Integrity

- [ ] `GET /llms.txt` returns `200` and `text/plain`.
- [ ] `GET /.well-known/ai-plugin.json` returns `200` and `application/json`.
- [ ] `GET /robots.txt` and `GET /sitemap.xml` remain healthy.

## llms.txt Governance

- [ ] Required governance headings are present.
- [ ] Canonical domain line is present and valid.
- [ ] Public key page URLs are listed (`/products`, `/events`, `/venues`).
- [ ] Machine endpoints are listed (`sitemap`, `robots`, `llms`, plugin manifest, GraphQL).
- [ ] Discoverability rules include private-route exclusions and volatile-fact verification guidance.

## AI Plugin Manifest Governance

- [ ] Manifest JSON is valid and complete.
- [ ] `api.type=graphql` and `api.url` points to `/graphql`.
- [ ] `legal_info_url` points to `/about`.
- [ ] `contact_email` is non-empty and routable.

## Consistency + Automation

- [ ] `llms.txt` and plugin manifest reference aligned capability claims.
- [ ] `pnpm smoke:llm-surface` passes for target environment.
- [ ] `pnpm smoke:e2e-matrix` command stages pass (admin parity, SEO, LLM surface).
- [ ] Reports are archived in `output/smoke/` for release evidence.
