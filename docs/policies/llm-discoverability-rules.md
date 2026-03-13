# LLM Discoverability Policy Rules

## Objective

Define strict content/discovery rules for all LLM-facing surfaces (`/llms.txt`, `/.well-known/ai-plugin.json`, and canonical public pages).

## Rules

1. Canonical authority
- `llms.txt` must declare a canonical domain line (`- Canonical: <https-url>`).
- LLM responses should prefer canonical URLs over worker preview aliases.

2. Public-only discoverability
- `llms.txt` may enumerate only public pages for discovery.
- Private routes must remain explicitly excluded from discoverability guidance:
  - `/account/`, `/admin/`, `/platform/`, `/auth/`, `/api/`.

3. Machine endpoint completeness
- `llms.txt` must include direct links to:
  - `/sitemap.xml`
  - `/robots.txt`
  - `/llms.txt`
  - `/.well-known/ai-plugin.json`
  - `/graphql`

4. Stable capability claims
- Capability statements must be factual and map to real user-visible features.
- Do not claim unsupported integrations, models, or workflows.

5. Volatile fact safety
- LLM guidance must explicitly instruct verification of volatile facts (pricing, inventory, availability) from current source pages or APIs.

6. Manifest consistency
- `/.well-known/ai-plugin.json` must:
  - expose valid JSON,
  - declare GraphQL API endpoint at `/graphql`,
  - include legal info URL (`/about`) and contact email.

## Enforcement

- Automated checks:
  - `pnpm smoke:llm-surface`
  - `pnpm smoke:e2e-matrix` (LLM-surface command stage)
- Artifacts:
  - `output/smoke/llm-surface-report.json`
  - `output/smoke/llm-surface-report.md`

## Change Control

- Any change to `llms.txt` structure or plugin manifest fields must update:
  - this policy file,
  - the LLM-surface smoke checks,
  - the current week summary document.
