# Structured Data Coverage Checklist

Use this checklist before shipping content/schema changes.

## Builder Contracts

- [ ] JSON-LD builder schema tests pass.
- [ ] Added/changed builders have deterministic required fields.
- [ ] New schema types are represented in smoke coverage expectations.

## Route Coverage

- [ ] Public listing routes emit collection/list schema where applicable.
- [ ] Editorial routes emit page-level schema (`AboutPage`, `ContactPage`, etc.).
- [ ] Detail routes emit entity schema (`Product`, `Event`, `Place`) and breadcrumbs when expected.
- [ ] JSON-LD payloads are parseable and context/type values are valid.

## Evidence

- [ ] `pnpm smoke:structured-data` executed.
- [ ] Coverage report archived in `output/smoke/structured-data-coverage-report.md`.
- [ ] Any known live-vs-repo drift is documented in current week summary.
