# Landing Page QA Rubric

## Goal

Ensure generated landing pages are publish-ready for enterprise marketing teams with consistent brand voice and conversion structure.

## Score Model

- Each gate is pass/fail.
- A page passes only when all required gates pass.
- Pipeline output includes per-gate evidence in `output/smoke/landing-page-pipeline-report.md`.

## Required Gates

1. SEO metadata quality
- Title length: `40-65` characters.
- Description length: `120-160` characters.

2. Conversion structure completeness
- Required sections must exist:
  - hero
  - value-props
  - proof
  - faq
  - cta
- FAQ must include at least `3` entries.
- CTA label must be non-empty and CTA URL must be a relative product URL path.

3. Keyword and intent alignment
- Primary keyword must appear in hero title.
- Primary keyword must appear in page body copy.

4. Readability threshold
- Average sentence length must be `<= 24` words.

5. Brand consistency controls
- Required brand phrases must appear.
- Banned phrases must not appear.
- Voice pillars must be represented in generated copy.

## Release Rule

- Do not ship generated LP artifacts when any gate fails.
- Fix template inputs or pipeline copy logic, then rerun:
  - `pnpm smoke:landing-pages`
