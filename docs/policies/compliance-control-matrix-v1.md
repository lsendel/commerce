# Compliance Control Matrix v1

## Purpose

- Establish a SOC2-style control map from compliance objectives to concrete implementation files, runbooks, and smoke evidence.
- Keep controls executable by binding each control to at least one command gate and explicit evidence paths.

## Control Source

- Source of truth (machine-readable): `docs/policies/compliance-control-matrix-v1.json`
- Validation gate: `pnpm smoke:compliance-controls`
- Report artifacts:
  - `output/smoke/compliance-controls-report.json`
  - `output/smoke/compliance-controls-report.md`

## Control Coverage Snapshot

| Control ID | Domain | Objective | Primary Gates |
| --- | --- | --- | --- |
| `CC-001` | `CC1/CC7` | Admin policy + control-tower parity and response-shape enforcement | `smoke:admin-parity` |
| `CC-002` | `CC2/CC7` | Release safety via matrix + production checks | `smoke:e2e-matrix`, `smoke:production`, `smoke:compliance-controls` |
| `CC-003` | `CC6` | AuthN/AuthZ gate enforcement across account/platform/admin surfaces | `smoke:e2e-matrix`, `smoke:admin-parity` |
| `CC-004` | `CC7` | Event taxonomy and replay reliability | `smoke:event-pipeline` |
| `CC-005` | `A1` | Fulfillment/returns SLA risk and intervention readiness | `smoke:fulfillment-sla` |
| `CC-006` | `CC7` | Incident response preparedness and escalation readiness | `smoke:production`, `smoke:admin-parity` |
| `CC-007` | `CC3` | Pricing/growth guardrail preflight risk controls | `smoke:pricing-policy-simulation`, `smoke:growth-experiments` |
| `CC-008` | `CC2/CC7` | SEO + LLM external-surface governance | `smoke:seo`, `smoke:llm-surface` |
| `CC-009` | `CC7` | Audit log integrity and PII redaction guardrails | `smoke:audit-pii` |
| `CC-010` | `CC6/CC7` | Secret lifecycle governance for runtime + CI | `smoke:secrets-hygiene` |
| `CC-011` | `CC6/CC7` | Access governance + break-glass drill controls | `smoke:access-governance` |
| `CC-012` | `CC3/CC7` | Cost observability + unit-economics optimization governance | `smoke:cost-observability` |
| `CC-013` | `CC2/CC7` | Query performance budgets, index coverage, and cache governance | `smoke:query-performance` |
| `CC-014` | `CC2/CC7` | Edge cache policy + invalidation automation governance | `smoke:cache-invalidation` |
| `CC-015` | `CC2/CC7` | Async workflow orchestration timeout/retry/compensation governance | `smoke:workflow-reliability` |
| `CC-016` | `CC2/CC7` | Dead-letter auto-remediation bounded action governance | `smoke:dlq-remediation` |
| `CC-017` | `CC2/CC7` | API version negotiation + deprecation lifecycle governance | `smoke:api-versioning` |
| `CC-018` | `CC2/CC7` | Partner onboarding self-serve contract governance | `smoke:partner-onboarding` |

## Update Rules

1. Any new critical operator or customer workflow must map to a new or existing control record in the JSON matrix.
2. Every control entry must include implementation paths, runbooks, and evidence paths.
3. `pnpm smoke:compliance-controls` must pass before merging control-matrix changes.
4. Evidence path policy:
   - repository evidence uses `kind: "repo_file"` and must exist in git-tracked files,
   - generated smoke evidence uses `kind: "generated_artifact"` and must stay under `output/smoke/`.
