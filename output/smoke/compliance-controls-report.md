# Compliance Controls Smoke Report

- Started: 2026-03-06T06:41:13.350Z
- Finished: 2026-03-06T06:41:13.355Z
- Status: passed
- Matrix path: docs/policies/compliance-control-matrix-v1.json
- Total controls: 18
- Total checks: 413
- Failed checks: 0

| Check | Status | Note |
| --- | --- | --- |
| matrix-has-controls | pass | Control matrix must define at least one control record. |
| CC-001:id-present | pass | Control must include a non-empty controlId. |
| CC-001:id-unique | pass | Control IDs must be unique inside the matrix. |
| CC-001:domain-present | pass | Each control must include the SOC2 domain mapping. |
| CC-001:objective-present | pass | Each control must include an objective. |
| CC-001:implementation-paths-present | pass | Each control must map to at least one implementation path. |
| CC-001:implementation-path-1 | pass | Implementation path must exist: scripts/smoke-policy-control-tower.ts |
| CC-001:implementation-path-2 | pass | Implementation path must exist: src/contracts/policies.contract.ts |
| CC-001:implementation-path-3 | pass | Implementation path must exist: src/contracts/control-tower.contract.ts |
| CC-001:runbook-paths-present | pass | Each control must map to at least one runbook path. |
| CC-001:runbook-path-1 | pass | Runbook path must exist: docs/runbooks/admin-api-parity-smoke.md |
| CC-001:runbook-path-2 | pass | Runbook path must exist: docs/runbooks/policy-engine-guardrails.md |
| CC-001:evidence-paths-present | pass | Each control must include at least one evidence path. |
| CC-001:evidence-1:kind-valid | pass | Evidence kind must be repo_file or generated_artifact: repo_file |
| CC-001:evidence-1:path-present | pass | Evidence path must be non-empty. |
| CC-001:evidence-1:repo-file-exists | pass | Repository evidence path must exist: docs/snapshots/admin-api-parity-report.schema.snapshot.json |
| CC-001:evidence-2:kind-valid | pass | Evidence kind must be repo_file or generated_artifact: generated_artifact |
| CC-001:evidence-2:path-present | pass | Evidence path must be non-empty. |
| CC-001:evidence-2:artifact-path-policy | pass | Generated artifact paths must live under output/smoke/: output/smoke/admin-api-parity-report.contract.json |
| CC-001:command-gates-present | pass | Each control must map to at least one smoke command. |
| CC-001:command-gate-1 | pass | Command gate must exist in package.json scripts: smoke:admin-parity |
| CC-002:id-present | pass | Control must include a non-empty controlId. |
| CC-002:id-unique | pass | Control IDs must be unique inside the matrix. |
| CC-002:domain-present | pass | Each control must include the SOC2 domain mapping. |
| CC-002:objective-present | pass | Each control must include an objective. |
| CC-002:implementation-paths-present | pass | Each control must map to at least one implementation path. |
| CC-002:implementation-path-1 | pass | Implementation path must exist: scripts/smoke-e2e-matrix.ts |
| CC-002:implementation-path-2 | pass | Implementation path must exist: scripts/smoke-production.sh |
| CC-002:runbook-paths-present | pass | Each control must map to at least one runbook path. |
| CC-002:runbook-path-1 | pass | Runbook path must exist: docs/runbooks/e2e-smoke-matrix.md |
| CC-002:runbook-path-2 | pass | Runbook path must exist: docs/runbooks/admin-api-parity-smoke.md |
| CC-002:evidence-paths-present | pass | Each control must include at least one evidence path. |
| CC-002:evidence-1:kind-valid | pass | Evidence kind must be repo_file or generated_artifact: generated_artifact |
| CC-002:evidence-1:path-present | pass | Evidence path must be non-empty. |
| CC-002:evidence-1:artifact-path-policy | pass | Generated artifact paths must live under output/smoke/: output/smoke/e2e-smoke-matrix-report.json |
| CC-002:evidence-2:kind-valid | pass | Evidence kind must be repo_file or generated_artifact: generated_artifact |
| CC-002:evidence-2:path-present | pass | Evidence path must be non-empty. |
| CC-002:evidence-2:artifact-path-policy | pass | Generated artifact paths must live under output/smoke/: output/smoke/compliance-controls-report.json |
| CC-002:command-gates-present | pass | Each control must map to at least one smoke command. |
| CC-002:command-gate-1 | pass | Command gate must exist in package.json scripts: smoke:e2e-matrix |
| CC-002:command-gate-2 | pass | Command gate must exist in package.json scripts: smoke:production |
| CC-002:command-gate-3 | pass | Command gate must exist in package.json scripts: smoke:compliance-controls |
| CC-003:id-present | pass | Control must include a non-empty controlId. |
| CC-003:id-unique | pass | Control IDs must be unique inside the matrix. |
| CC-003:domain-present | pass | Each control must include the SOC2 domain mapping. |
| CC-003:objective-present | pass | Each control must include an objective. |
| CC-003:implementation-paths-present | pass | Each control must map to at least one implementation path. |
| CC-003:implementation-path-1 | pass | Implementation path must exist: src/routes/api/auth.routes.ts |
| CC-003:implementation-path-2 | pass | Implementation path must exist: scripts/smoke-e2e-matrix.ts |
| CC-003:implementation-path-3 | pass | Implementation path must exist: scripts/smoke-production.sh |
| CC-003:runbook-paths-present | pass | Each control must map to at least one runbook path. |
| CC-003:runbook-path-1 | pass | Runbook path must exist: docs/runbooks/e2e-smoke-matrix.md |
| CC-003:runbook-path-2 | pass | Runbook path must exist: docs/runbooks/admin-api-parity-smoke.md |
| CC-003:evidence-paths-present | pass | Each control must include at least one evidence path. |
| CC-003:evidence-1:kind-valid | pass | Evidence kind must be repo_file or generated_artifact: generated_artifact |
| CC-003:evidence-1:path-present | pass | Evidence path must be non-empty. |
| CC-003:evidence-1:artifact-path-policy | pass | Generated artifact paths must live under output/smoke/: output/smoke/e2e-smoke-matrix-report.md |
| CC-003:evidence-2:kind-valid | pass | Evidence kind must be repo_file or generated_artifact: generated_artifact |
| CC-003:evidence-2:path-present | pass | Evidence path must be non-empty. |
| CC-003:evidence-2:artifact-path-policy | pass | Generated artifact paths must live under output/smoke/: output/smoke/admin-api-parity-report.contract.md |
| CC-003:command-gates-present | pass | Each control must map to at least one smoke command. |
| CC-003:command-gate-1 | pass | Command gate must exist in package.json scripts: smoke:e2e-matrix |
| CC-003:command-gate-2 | pass | Command gate must exist in package.json scripts: smoke:admin-parity |
| CC-004:id-present | pass | Control must include a non-empty controlId. |
| CC-004:id-unique | pass | Control IDs must be unique inside the matrix. |
| CC-004:domain-present | pass | Each control must include the SOC2 domain mapping. |
| CC-004:objective-present | pass | Each control must include an objective. |
| CC-004:implementation-paths-present | pass | Each control must map to at least one implementation path. |
| CC-004:implementation-path-1 | pass | Implementation path must exist: scripts/smoke-event-pipeline.ts |
| CC-004:implementation-path-2 | pass | Implementation path must exist: docs/policies/event-taxonomy-governance.md |
| CC-004:runbook-paths-present | pass | Each control must map to at least one runbook path. |
| CC-004:runbook-path-1 | pass | Runbook path must exist: docs/runbooks/event-pipeline-reliability.md |
| CC-004:evidence-paths-present | pass | Each control must include at least one evidence path. |
| CC-004:evidence-1:kind-valid | pass | Evidence kind must be repo_file or generated_artifact: generated_artifact |
| CC-004:evidence-1:path-present | pass | Evidence path must be non-empty. |
| CC-004:evidence-1:artifact-path-policy | pass | Generated artifact paths must live under output/smoke/: output/smoke/event-pipeline-report.json |
| CC-004:evidence-2:kind-valid | pass | Evidence kind must be repo_file or generated_artifact: generated_artifact |
| CC-004:evidence-2:path-present | pass | Evidence path must be non-empty. |
| CC-004:evidence-2:artifact-path-policy | pass | Generated artifact paths must live under output/smoke/: output/smoke/event-pipeline-report.md |
| CC-004:command-gates-present | pass | Each control must map to at least one smoke command. |
| CC-004:command-gate-1 | pass | Command gate must exist in package.json scripts: smoke:event-pipeline |
| CC-005:id-present | pass | Control must include a non-empty controlId. |
| CC-005:id-unique | pass | Control IDs must be unique inside the matrix. |
| CC-005:domain-present | pass | Each control must include the SOC2 domain mapping. |
| CC-005:objective-present | pass | Each control must include an objective. |
| CC-005:implementation-paths-present | pass | Each control must map to at least one implementation path. |
| CC-005:implementation-path-1 | pass | Implementation path must exist: src/application/fulfillment/fulfillment-sla-prediction.usecase.ts |
| CC-005:implementation-path-2 | pass | Implementation path must exist: scripts/smoke-fulfillment-sla.ts |
| CC-005:runbook-paths-present | pass | Each control must map to at least one runbook path. |
| CC-005:runbook-path-1 | pass | Runbook path must exist: docs/runbooks/fulfillment-sla-prediction.md |
| CC-005:runbook-path-2 | pass | Runbook path must exist: docs/runbooks/fulfillment-exception-handler.md |
| CC-005:evidence-paths-present | pass | Each control must include at least one evidence path. |
| CC-005:evidence-1:kind-valid | pass | Evidence kind must be repo_file or generated_artifact: generated_artifact |
| CC-005:evidence-1:path-present | pass | Evidence path must be non-empty. |
| CC-005:evidence-1:artifact-path-policy | pass | Generated artifact paths must live under output/smoke/: output/smoke/fulfillment-sla-report.json |
| CC-005:evidence-2:kind-valid | pass | Evidence kind must be repo_file or generated_artifact: generated_artifact |
| CC-005:evidence-2:path-present | pass | Evidence path must be non-empty. |
| CC-005:evidence-2:artifact-path-policy | pass | Generated artifact paths must live under output/smoke/: output/smoke/fulfillment-sla-report.md |
| CC-005:command-gates-present | pass | Each control must map to at least one smoke command. |
| CC-005:command-gate-1 | pass | Command gate must exist in package.json scripts: smoke:fulfillment-sla |
| CC-006:id-present | pass | Control must include a non-empty controlId. |
| CC-006:id-unique | pass | Control IDs must be unique inside the matrix. |
| CC-006:domain-present | pass | Each control must include the SOC2 domain mapping. |
| CC-006:objective-present | pass | Each control must include an objective. |
| CC-006:implementation-paths-present | pass | Each control must map to at least one implementation path. |
| CC-006:implementation-path-1 | pass | Implementation path must exist: scripts/smoke-production.sh |
| CC-006:implementation-path-2 | pass | Implementation path must exist: scripts/smoke-policy-control-tower.ts |
| CC-006:runbook-paths-present | pass | Each control must map to at least one runbook path. |
| CC-006:runbook-path-1 | pass | Runbook path must exist: docs/runbooks/incident-responder.md |
| CC-006:runbook-path-2 | pass | Runbook path must exist: docs/runbooks/subscription-incident-response.md |
| CC-006:evidence-paths-present | pass | Each control must include at least one evidence path. |
| CC-006:evidence-1:kind-valid | pass | Evidence kind must be repo_file or generated_artifact: generated_artifact |
| CC-006:evidence-1:path-present | pass | Evidence path must be non-empty. |
| CC-006:evidence-1:artifact-path-policy | pass | Generated artifact paths must live under output/smoke/: output/smoke/e2e-smoke-matrix-report.md |
| CC-006:evidence-2:kind-valid | pass | Evidence kind must be repo_file or generated_artifact: generated_artifact |
| CC-006:evidence-2:path-present | pass | Evidence path must be non-empty. |
| CC-006:evidence-2:artifact-path-policy | pass | Generated artifact paths must live under output/smoke/: output/smoke/admin-api-parity-report.contract.md |
| CC-006:command-gates-present | pass | Each control must map to at least one smoke command. |
| CC-006:command-gate-1 | pass | Command gate must exist in package.json scripts: smoke:production |
| CC-006:command-gate-2 | pass | Command gate must exist in package.json scripts: smoke:admin-parity |
| CC-007:id-present | pass | Control must include a non-empty controlId. |
| CC-007:id-unique | pass | Control IDs must be unique inside the matrix. |
| CC-007:domain-present | pass | Each control must include the SOC2 domain mapping. |
| CC-007:objective-present | pass | Each control must include an objective. |
| CC-007:implementation-paths-present | pass | Each control must map to at least one implementation path. |
| CC-007:implementation-path-1 | pass | Implementation path must exist: src/application/platform/policy-engine.usecase.ts |
| CC-007:implementation-path-2 | pass | Implementation path must exist: scripts/smoke-pricing-policy-simulation.ts |
| CC-007:implementation-path-3 | pass | Implementation path must exist: scripts/smoke-growth-experiment-os.ts |
| CC-007:runbook-paths-present | pass | Each control must map to at least one runbook path. |
| CC-007:runbook-path-1 | pass | Runbook path must exist: docs/runbooks/policy-engine-guardrails.md |
| CC-007:runbook-path-2 | pass | Runbook path must exist: docs/runbooks/growth-experiment-os.md |
| CC-007:evidence-paths-present | pass | Each control must include at least one evidence path. |
| CC-007:evidence-1:kind-valid | pass | Evidence kind must be repo_file or generated_artifact: generated_artifact |
| CC-007:evidence-1:path-present | pass | Evidence path must be non-empty. |
| CC-007:evidence-1:artifact-path-policy | pass | Generated artifact paths must live under output/smoke/: output/smoke/pricing-policy-simulation-report.json |
| CC-007:evidence-2:kind-valid | pass | Evidence kind must be repo_file or generated_artifact: generated_artifact |
| CC-007:evidence-2:path-present | pass | Evidence path must be non-empty. |
| CC-007:evidence-2:artifact-path-policy | pass | Generated artifact paths must live under output/smoke/: output/smoke/growth-experiment-os-report.json |
| CC-007:command-gates-present | pass | Each control must map to at least one smoke command. |
| CC-007:command-gate-1 | pass | Command gate must exist in package.json scripts: smoke:pricing-policy-simulation |
| CC-007:command-gate-2 | pass | Command gate must exist in package.json scripts: smoke:growth-experiments |
| CC-008:id-present | pass | Control must include a non-empty controlId. |
| CC-008:id-unique | pass | Control IDs must be unique inside the matrix. |
| CC-008:domain-present | pass | Each control must include the SOC2 domain mapping. |
| CC-008:objective-present | pass | Each control must include an objective. |
| CC-008:implementation-paths-present | pass | Each control must map to at least one implementation path. |
| CC-008:implementation-path-1 | pass | Implementation path must exist: scripts/smoke-seo-audit.ts |
| CC-008:implementation-path-2 | pass | Implementation path must exist: scripts/smoke-llm-surface.ts |
| CC-008:implementation-path-3 | pass | Implementation path must exist: docs/policies/llm-discoverability-rules.md |
| CC-008:runbook-paths-present | pass | Each control must map to at least one runbook path. |
| CC-008:runbook-path-1 | pass | Runbook path must exist: docs/runbooks/technical-seo-smoke.md |
| CC-008:runbook-path-2 | pass | Runbook path must exist: docs/runbooks/llm-surface-smoke.md |
| CC-008:evidence-paths-present | pass | Each control must include at least one evidence path. |
| CC-008:evidence-1:kind-valid | pass | Evidence kind must be repo_file or generated_artifact: generated_artifact |
| CC-008:evidence-1:path-present | pass | Evidence path must be non-empty. |
| CC-008:evidence-1:artifact-path-policy | pass | Generated artifact paths must live under output/smoke/: output/smoke/seo-audit-report.json |
| CC-008:evidence-2:kind-valid | pass | Evidence kind must be repo_file or generated_artifact: generated_artifact |
| CC-008:evidence-2:path-present | pass | Evidence path must be non-empty. |
| CC-008:evidence-2:artifact-path-policy | pass | Generated artifact paths must live under output/smoke/: output/smoke/llm-surface-smoke-report.json |
| CC-008:command-gates-present | pass | Each control must map to at least one smoke command. |
| CC-008:command-gate-1 | pass | Command gate must exist in package.json scripts: smoke:seo |
| CC-008:command-gate-2 | pass | Command gate must exist in package.json scripts: smoke:llm-surface |
| CC-009:id-present | pass | Control must include a non-empty controlId. |
| CC-009:id-unique | pass | Control IDs must be unique inside the matrix. |
| CC-009:domain-present | pass | Each control must include the SOC2 domain mapping. |
| CC-009:objective-present | pass | Each control must include an objective. |
| CC-009:implementation-paths-present | pass | Each control must map to at least one implementation path. |
| CC-009:implementation-path-1 | pass | Implementation path must exist: src/middleware/audit-trail.middleware.ts |
| CC-009:implementation-path-2 | pass | Implementation path must exist: src/shared/audit-trail.ts |
| CC-009:implementation-path-3 | pass | Implementation path must exist: src/shared/pii-redaction.ts |
| CC-009:implementation-path-4 | pass | Implementation path must exist: src/middleware/error-handler.middleware.ts |
| CC-009:runbook-paths-present | pass | Each control must map to at least one runbook path. |
| CC-009:runbook-path-1 | pass | Runbook path must exist: docs/runbooks/audit-trail-pii-guardrails.md |
| CC-009:runbook-path-2 | pass | Runbook path must exist: docs/runbooks/compliance-control-framework.md |
| CC-009:evidence-paths-present | pass | Each control must include at least one evidence path. |
| CC-009:evidence-1:kind-valid | pass | Evidence kind must be repo_file or generated_artifact: generated_artifact |
| CC-009:evidence-1:path-present | pass | Evidence path must be non-empty. |
| CC-009:evidence-1:artifact-path-policy | pass | Generated artifact paths must live under output/smoke/: output/smoke/audit-pii-report.json |
| CC-009:evidence-2:kind-valid | pass | Evidence kind must be repo_file or generated_artifact: generated_artifact |
| CC-009:evidence-2:path-present | pass | Evidence path must be non-empty. |
| CC-009:evidence-2:artifact-path-policy | pass | Generated artifact paths must live under output/smoke/: output/smoke/audit-pii-report.md |
| CC-009:command-gates-present | pass | Each control must map to at least one smoke command. |
| CC-009:command-gate-1 | pass | Command gate must exist in package.json scripts: smoke:audit-pii |
| CC-010:id-present | pass | Control must include a non-empty controlId. |
| CC-010:id-unique | pass | Control IDs must be unique inside the matrix. |
| CC-010:domain-present | pass | Each control must include the SOC2 domain mapping. |
| CC-010:objective-present | pass | Each control must include an objective. |
| CC-010:implementation-paths-present | pass | Each control must map to at least one implementation path. |
| CC-010:implementation-path-1 | pass | Implementation path must exist: scripts/smoke-secrets-hygiene.ts |
| CC-010:implementation-path-2 | pass | Implementation path must exist: src/env.ts |
| CC-010:implementation-path-3 | pass | Implementation path must exist: .github/workflows/admin-api-smoke.yml |
| CC-010:implementation-path-4 | pass | Implementation path must exist: .github/workflows/e2e-smoke-matrix.yml |
| CC-010:implementation-path-5 | pass | Implementation path must exist: .github/workflows/deploy.yml |
| CC-010:runbook-paths-present | pass | Each control must map to at least one runbook path. |
| CC-010:runbook-path-1 | pass | Runbook path must exist: docs/runbooks/secrets-rotation-hygiene.md |
| CC-010:runbook-path-2 | pass | Runbook path must exist: docs/policies/secrets-key-inventory-v1.md |
| CC-010:evidence-paths-present | pass | Each control must include at least one evidence path. |
| CC-010:evidence-1:kind-valid | pass | Evidence kind must be repo_file or generated_artifact: repo_file |
| CC-010:evidence-1:path-present | pass | Evidence path must be non-empty. |
| CC-010:evidence-1:repo-file-exists | pass | Repository evidence path must exist: docs/policies/secrets-key-inventory-v1.json |
| CC-010:evidence-2:kind-valid | pass | Evidence kind must be repo_file or generated_artifact: generated_artifact |
| CC-010:evidence-2:path-present | pass | Evidence path must be non-empty. |
| CC-010:evidence-2:artifact-path-policy | pass | Generated artifact paths must live under output/smoke/: output/smoke/secrets-hygiene-report.json |
| CC-010:evidence-3:kind-valid | pass | Evidence kind must be repo_file or generated_artifact: generated_artifact |
| CC-010:evidence-3:path-present | pass | Evidence path must be non-empty. |
| CC-010:evidence-3:artifact-path-policy | pass | Generated artifact paths must live under output/smoke/: output/smoke/secrets-hygiene-report.md |
| CC-010:command-gates-present | pass | Each control must map to at least one smoke command. |
| CC-010:command-gate-1 | pass | Command gate must exist in package.json scripts: smoke:secrets-hygiene |
| CC-011:id-present | pass | Control must include a non-empty controlId. |
| CC-011:id-unique | pass | Control IDs must be unique inside the matrix. |
| CC-011:domain-present | pass | Each control must include the SOC2 domain mapping. |
| CC-011:objective-present | pass | Each control must include an objective. |
| CC-011:implementation-paths-present | pass | Each control must map to at least one implementation path. |
| CC-011:implementation-path-1 | pass | Implementation path must exist: scripts/smoke-access-governance.ts |
| CC-011:implementation-path-2 | pass | Implementation path must exist: src/middleware/role.middleware.ts |
| CC-011:implementation-path-3 | pass | Implementation path must exist: src/index.tsx |
| CC-011:implementation-path-4 | pass | Implementation path must exist: src/routes/api/platform.routes.ts |
| CC-011:runbook-paths-present | pass | Each control must map to at least one runbook path. |
| CC-011:runbook-path-1 | pass | Runbook path must exist: docs/runbooks/access-governance-break-glass.md |
| CC-011:runbook-path-2 | pass | Runbook path must exist: docs/policies/access-governance-policy-v1.md |
| CC-011:evidence-paths-present | pass | Each control must include at least one evidence path. |
| CC-011:evidence-1:kind-valid | pass | Evidence kind must be repo_file or generated_artifact: repo_file |
| CC-011:evidence-1:path-present | pass | Evidence path must be non-empty. |
| CC-011:evidence-1:repo-file-exists | pass | Repository evidence path must exist: docs/policies/access-governance-policy-v1.json |
| CC-011:evidence-2:kind-valid | pass | Evidence kind must be repo_file or generated_artifact: generated_artifact |
| CC-011:evidence-2:path-present | pass | Evidence path must be non-empty. |
| CC-011:evidence-2:artifact-path-policy | pass | Generated artifact paths must live under output/smoke/: output/smoke/access-governance-report.json |
| CC-011:evidence-3:kind-valid | pass | Evidence kind must be repo_file or generated_artifact: generated_artifact |
| CC-011:evidence-3:path-present | pass | Evidence path must be non-empty. |
| CC-011:evidence-3:artifact-path-policy | pass | Generated artifact paths must live under output/smoke/: output/smoke/break-glass-drill-report.json |
| CC-011:command-gates-present | pass | Each control must map to at least one smoke command. |
| CC-011:command-gate-1 | pass | Command gate must exist in package.json scripts: smoke:access-governance |
| CC-012:id-present | pass | Control must include a non-empty controlId. |
| CC-012:id-unique | pass | Control IDs must be unique inside the matrix. |
| CC-012:domain-present | pass | Each control must include the SOC2 domain mapping. |
| CC-012:objective-present | pass | Each control must include an objective. |
| CC-012:implementation-paths-present | pass | Each control must map to at least one implementation path. |
| CC-012:implementation-path-1 | pass | Implementation path must exist: src/application/analytics/get-cost-observability.usecase.ts |
| CC-012:implementation-path-2 | pass | Implementation path must exist: src/routes/api/analytics.routes.ts |
| CC-012:implementation-path-3 | pass | Implementation path must exist: src/routes/pages/admin/analytics.page.tsx |
| CC-012:implementation-path-4 | pass | Implementation path must exist: src/index.tsx |
| CC-012:implementation-path-5 | pass | Implementation path must exist: scripts/smoke-cost-observability.ts |
| CC-012:runbook-paths-present | pass | Each control must map to at least one runbook path. |
| CC-012:runbook-path-1 | pass | Runbook path must exist: docs/runbooks/cost-observability-unit-economics.md |
| CC-012:runbook-path-2 | pass | Runbook path must exist: docs/policies/cost-observability-unit-economics-v1.md |
| CC-012:evidence-paths-present | pass | Each control must include at least one evidence path. |
| CC-012:evidence-1:kind-valid | pass | Evidence kind must be repo_file or generated_artifact: repo_file |
| CC-012:evidence-1:path-present | pass | Evidence path must be non-empty. |
| CC-012:evidence-1:repo-file-exists | pass | Repository evidence path must exist: docs/policies/cost-observability-unit-economics-v1.json |
| CC-012:evidence-2:kind-valid | pass | Evidence kind must be repo_file or generated_artifact: generated_artifact |
| CC-012:evidence-2:path-present | pass | Evidence path must be non-empty. |
| CC-012:evidence-2:artifact-path-policy | pass | Generated artifact paths must live under output/smoke/: output/smoke/cost-observability-report.json |
| CC-012:evidence-3:kind-valid | pass | Evidence kind must be repo_file or generated_artifact: generated_artifact |
| CC-012:evidence-3:path-present | pass | Evidence path must be non-empty. |
| CC-012:evidence-3:artifact-path-policy | pass | Generated artifact paths must live under output/smoke/: output/smoke/cost-observability-report.md |
| CC-012:command-gates-present | pass | Each control must map to at least one smoke command. |
| CC-012:command-gate-1 | pass | Command gate must exist in package.json scripts: smoke:cost-observability |
| CC-013:id-present | pass | Control must include a non-empty controlId. |
| CC-013:id-unique | pass | Control IDs must be unique inside the matrix. |
| CC-013:domain-present | pass | Each control must include the SOC2 domain mapping. |
| CC-013:objective-present | pass | Each control must include an objective. |
| CC-013:implementation-paths-present | pass | Each control must map to at least one implementation path. |
| CC-013:implementation-path-1 | pass | Implementation path must exist: src/infrastructure/db/schema.ts |
| CC-013:implementation-path-2 | pass | Implementation path must exist: src/infrastructure/repositories/cart.repository.ts |
| CC-013:implementation-path-3 | pass | Implementation path must exist: src/infrastructure/repositories/order.repository.ts |
| CC-013:implementation-path-4 | pass | Implementation path must exist: src/infrastructure/repositories/promotion.repository.ts |
| CC-013:implementation-path-5 | pass | Implementation path must exist: scripts/sql/add-week57-performance-indexes.sql |
| CC-013:implementation-path-6 | pass | Implementation path must exist: scripts/smoke-query-performance.ts |
| CC-013:runbook-paths-present | pass | Each control must map to at least one runbook path. |
| CC-013:runbook-path-1 | pass | Runbook path must exist: docs/runbooks/query-performance-budget-wave1.md |
| CC-013:runbook-path-2 | pass | Runbook path must exist: docs/policies/query-performance-budget-v1.md |
| CC-013:evidence-paths-present | pass | Each control must include at least one evidence path. |
| CC-013:evidence-1:kind-valid | pass | Evidence kind must be repo_file or generated_artifact: repo_file |
| CC-013:evidence-1:path-present | pass | Evidence path must be non-empty. |
| CC-013:evidence-1:repo-file-exists | pass | Repository evidence path must exist: docs/policies/query-performance-budget-v1.json |
| CC-013:evidence-2:kind-valid | pass | Evidence kind must be repo_file or generated_artifact: generated_artifact |
| CC-013:evidence-2:path-present | pass | Evidence path must be non-empty. |
| CC-013:evidence-2:artifact-path-policy | pass | Generated artifact paths must live under output/smoke/: output/smoke/query-performance-report.json |
| CC-013:evidence-3:kind-valid | pass | Evidence kind must be repo_file or generated_artifact: generated_artifact |
| CC-013:evidence-3:path-present | pass | Evidence path must be non-empty. |
| CC-013:evidence-3:artifact-path-policy | pass | Generated artifact paths must live under output/smoke/: output/smoke/query-performance-report.md |
| CC-013:command-gates-present | pass | Each control must map to at least one smoke command. |
| CC-013:command-gate-1 | pass | Command gate must exist in package.json scripts: smoke:query-performance |
| CC-014:id-present | pass | Control must include a non-empty controlId. |
| CC-014:id-unique | pass | Control IDs must be unique inside the matrix. |
| CC-014:domain-present | pass | Each control must include the SOC2 domain mapping. |
| CC-014:objective-present | pass | Each control must include an objective. |
| CC-014:implementation-paths-present | pass | Each control must map to at least one implementation path. |
| CC-014:implementation-path-1 | pass | Implementation path must exist: src/infrastructure/cache/invalidation-plan.ts |
| CC-014:implementation-path-2 | pass | Implementation path must exist: src/infrastructure/cache/invalidation-executor.ts |
| CC-014:implementation-path-3 | pass | Implementation path must exist: src/routes/api/cache.routes.ts |
| CC-014:implementation-path-4 | pass | Implementation path must exist: src/routes/api/admin-products.routes.ts |
| CC-014:implementation-path-5 | pass | Implementation path must exist: src/routes/api/admin-collections.routes.ts |
| CC-014:implementation-path-6 | pass | Implementation path must exist: src/routes/api/currency.routes.ts |
| CC-014:implementation-path-7 | pass | Implementation path must exist: scripts/smoke-cache-invalidation.ts |
| CC-014:runbook-paths-present | pass | Each control must map to at least one runbook path. |
| CC-014:runbook-path-1 | pass | Runbook path must exist: docs/runbooks/cache-invalidation-automation.md |
| CC-014:runbook-path-2 | pass | Runbook path must exist: docs/policies/cache-policy-matrix-v1.md |
| CC-014:evidence-paths-present | pass | Each control must include at least one evidence path. |
| CC-014:evidence-1:kind-valid | pass | Evidence kind must be repo_file or generated_artifact: repo_file |
| CC-014:evidence-1:path-present | pass | Evidence path must be non-empty. |
| CC-014:evidence-1:repo-file-exists | pass | Repository evidence path must exist: docs/policies/cache-policy-matrix-v1.json |
| CC-014:evidence-2:kind-valid | pass | Evidence kind must be repo_file or generated_artifact: generated_artifact |
| CC-014:evidence-2:path-present | pass | Evidence path must be non-empty. |
| CC-014:evidence-2:artifact-path-policy | pass | Generated artifact paths must live under output/smoke/: output/smoke/cache-invalidation-report.json |
| CC-014:evidence-3:kind-valid | pass | Evidence kind must be repo_file or generated_artifact: generated_artifact |
| CC-014:evidence-3:path-present | pass | Evidence path must be non-empty. |
| CC-014:evidence-3:artifact-path-policy | pass | Generated artifact paths must live under output/smoke/: output/smoke/cache-invalidation-report.md |
| CC-014:command-gates-present | pass | Each control must map to at least one smoke command. |
| CC-014:command-gate-1 | pass | Command gate must exist in package.json scripts: smoke:cache-invalidation |
| CC-015:id-present | pass | Control must include a non-empty controlId. |
| CC-015:id-unique | pass | Control IDs must be unique inside the matrix. |
| CC-015:domain-present | pass | Each control must include the SOC2 domain mapping. |
| CC-015:objective-present | pass | Each control must include an objective. |
| CC-015:implementation-paths-present | pass | Each control must map to at least one implementation path. |
| CC-015:implementation-path-1 | pass | Implementation path must exist: src/queues/orchestration-policy.ts |
| CC-015:implementation-path-2 | pass | Implementation path must exist: src/queues/handler.ts |
| CC-015:implementation-path-3 | pass | Implementation path must exist: src/queues/ai-generation.consumer.ts |
| CC-015:implementation-path-4 | pass | Implementation path must exist: src/queues/order-fulfillment.consumer.ts |
| CC-015:implementation-path-5 | pass | Implementation path must exist: src/queues/notification.consumer.ts |
| CC-015:implementation-path-6 | pass | Implementation path must exist: src/routes/api/workflows.routes.ts |
| CC-015:implementation-path-7 | pass | Implementation path must exist: scripts/smoke-workflow-reliability.ts |
| CC-015:runbook-paths-present | pass | Each control must map to at least one runbook path. |
| CC-015:runbook-path-1 | pass | Runbook path must exist: docs/runbooks/async-workflow-orchestration.md |
| CC-015:runbook-path-2 | pass | Runbook path must exist: docs/policies/workflow-reliability-scorecard-v1.md |
| CC-015:evidence-paths-present | pass | Each control must include at least one evidence path. |
| CC-015:evidence-1:kind-valid | pass | Evidence kind must be repo_file or generated_artifact: repo_file |
| CC-015:evidence-1:path-present | pass | Evidence path must be non-empty. |
| CC-015:evidence-1:repo-file-exists | pass | Repository evidence path must exist: docs/policies/workflow-reliability-scorecard-v1.json |
| CC-015:evidence-2:kind-valid | pass | Evidence kind must be repo_file or generated_artifact: generated_artifact |
| CC-015:evidence-2:path-present | pass | Evidence path must be non-empty. |
| CC-015:evidence-2:artifact-path-policy | pass | Generated artifact paths must live under output/smoke/: output/smoke/workflow-reliability-report.json |
| CC-015:evidence-3:kind-valid | pass | Evidence kind must be repo_file or generated_artifact: generated_artifact |
| CC-015:evidence-3:path-present | pass | Evidence path must be non-empty. |
| CC-015:evidence-3:artifact-path-policy | pass | Generated artifact paths must live under output/smoke/: output/smoke/workflow-reliability-report.md |
| CC-015:command-gates-present | pass | Each control must map to at least one smoke command. |
| CC-015:command-gate-1 | pass | Command gate must exist in package.json scripts: smoke:workflow-reliability |
| CC-016:id-present | pass | Control must include a non-empty controlId. |
| CC-016:id-unique | pass | Control IDs must be unique inside the matrix. |
| CC-016:domain-present | pass | Each control must include the SOC2 domain mapping. |
| CC-016:objective-present | pass | Each control must include an objective. |
| CC-016:implementation-paths-present | pass | Each control must map to at least one implementation path. |
| CC-016:implementation-path-1 | pass | Implementation path must exist: src/queues/dlq-remediation.ts |
| CC-016:implementation-path-2 | pass | Implementation path must exist: src/queues/handler.ts |
| CC-016:implementation-path-3 | pass | Implementation path must exist: src/queues/orchestration-policy.ts |
| CC-016:implementation-path-4 | pass | Implementation path must exist: src/queues/order-fulfillment.consumer.ts |
| CC-016:implementation-path-5 | pass | Implementation path must exist: src/queues/notification.consumer.ts |
| CC-016:implementation-path-6 | pass | Implementation path must exist: scripts/smoke-dlq-remediation.ts |
| CC-016:runbook-paths-present | pass | Each control must map to at least one runbook path. |
| CC-016:runbook-path-1 | pass | Runbook path must exist: docs/runbooks/dlq-auto-remediation-playbook.md |
| CC-016:runbook-path-2 | pass | Runbook path must exist: docs/policies/dlq-auto-remediation-v1.md |
| CC-016:evidence-paths-present | pass | Each control must include at least one evidence path. |
| CC-016:evidence-1:kind-valid | pass | Evidence kind must be repo_file or generated_artifact: repo_file |
| CC-016:evidence-1:path-present | pass | Evidence path must be non-empty. |
| CC-016:evidence-1:repo-file-exists | pass | Repository evidence path must exist: docs/policies/dlq-auto-remediation-v1.json |
| CC-016:evidence-2:kind-valid | pass | Evidence kind must be repo_file or generated_artifact: generated_artifact |
| CC-016:evidence-2:path-present | pass | Evidence path must be non-empty. |
| CC-016:evidence-2:artifact-path-policy | pass | Generated artifact paths must live under output/smoke/: output/smoke/dlq-remediation-report.json |
| CC-016:evidence-3:kind-valid | pass | Evidence kind must be repo_file or generated_artifact: generated_artifact |
| CC-016:evidence-3:path-present | pass | Evidence path must be non-empty. |
| CC-016:evidence-3:artifact-path-policy | pass | Generated artifact paths must live under output/smoke/: output/smoke/dlq-remediation-report.md |
| CC-016:command-gates-present | pass | Each control must map to at least one smoke command. |
| CC-016:command-gate-1 | pass | Command gate must exist in package.json scripts: smoke:dlq-remediation |
| CC-017:id-present | pass | Control must include a non-empty controlId. |
| CC-017:id-unique | pass | Control IDs must be unique inside the matrix. |
| CC-017:domain-present | pass | Each control must include the SOC2 domain mapping. |
| CC-017:objective-present | pass | Each control must include an objective. |
| CC-017:implementation-paths-present | pass | Each control must map to at least one implementation path. |
| CC-017:implementation-path-1 | pass | Implementation path must exist: src/shared/api-versioning.ts |
| CC-017:implementation-path-2 | pass | Implementation path must exist: src/middleware/api-versioning.middleware.ts |
| CC-017:implementation-path-3 | pass | Implementation path must exist: src/routes/api/api-versioning.routes.ts |
| CC-017:implementation-path-4 | pass | Implementation path must exist: src/index.tsx |
| CC-017:implementation-path-5 | pass | Implementation path must exist: scripts/smoke-api-versioning.ts |
| CC-017:runbook-paths-present | pass | Each control must map to at least one runbook path. |
| CC-017:runbook-path-1 | pass | Runbook path must exist: docs/runbooks/api-versioning-migration.md |
| CC-017:runbook-path-2 | pass | Runbook path must exist: docs/policies/api-version-policy-v1.md |
| CC-017:evidence-paths-present | pass | Each control must include at least one evidence path. |
| CC-017:evidence-1:kind-valid | pass | Evidence kind must be repo_file or generated_artifact: repo_file |
| CC-017:evidence-1:path-present | pass | Evidence path must be non-empty. |
| CC-017:evidence-1:repo-file-exists | pass | Repository evidence path must exist: docs/policies/api-version-policy-v1.json |
| CC-017:evidence-2:kind-valid | pass | Evidence kind must be repo_file or generated_artifact: generated_artifact |
| CC-017:evidence-2:path-present | pass | Evidence path must be non-empty. |
| CC-017:evidence-2:artifact-path-policy | pass | Generated artifact paths must live under output/smoke/: output/smoke/api-versioning-report.json |
| CC-017:evidence-3:kind-valid | pass | Evidence kind must be repo_file or generated_artifact: generated_artifact |
| CC-017:evidence-3:path-present | pass | Evidence path must be non-empty. |
| CC-017:evidence-3:artifact-path-policy | pass | Generated artifact paths must live under output/smoke/: output/smoke/api-versioning-report.md |
| CC-017:command-gates-present | pass | Each control must map to at least one smoke command. |
| CC-017:command-gate-1 | pass | Command gate must exist in package.json scripts: smoke:api-versioning |
| CC-018:id-present | pass | Control must include a non-empty controlId. |
| CC-018:id-unique | pass | Control IDs must be unique inside the matrix. |
| CC-018:domain-present | pass | Each control must include the SOC2 domain mapping. |
| CC-018:objective-present | pass | Each control must include an objective. |
| CC-018:implementation-paths-present | pass | Each control must map to at least one implementation path. |
| CC-018:implementation-path-1 | pass | Implementation path must exist: src/application/platform/partner-onboarding.usecase.ts |
| CC-018:implementation-path-2 | pass | Implementation path must exist: src/routes/api/integration-marketplace.routes.ts |
| CC-018:implementation-path-3 | pass | Implementation path must exist: src/contracts/integration-marketplace.contract.ts |
| CC-018:implementation-path-4 | pass | Implementation path must exist: public/scripts/admin-integration-marketplace.js |
| CC-018:implementation-path-5 | pass | Implementation path must exist: scripts/smoke-partner-onboarding.ts |
| CC-018:runbook-paths-present | pass | Each control must map to at least one runbook path. |
| CC-018:runbook-path-1 | pass | Runbook path must exist: docs/runbooks/partner-onboarding-self-serve.md |
| CC-018:runbook-path-2 | pass | Runbook path must exist: docs/policies/partner-onboarding-contract-v1.md |
| CC-018:evidence-paths-present | pass | Each control must include at least one evidence path. |
| CC-018:evidence-1:kind-valid | pass | Evidence kind must be repo_file or generated_artifact: repo_file |
| CC-018:evidence-1:path-present | pass | Evidence path must be non-empty. |
| CC-018:evidence-1:repo-file-exists | pass | Repository evidence path must exist: docs/policies/partner-onboarding-contract-v1.json |
| CC-018:evidence-2:kind-valid | pass | Evidence kind must be repo_file or generated_artifact: generated_artifact |
| CC-018:evidence-2:path-present | pass | Evidence path must be non-empty. |
| CC-018:evidence-2:artifact-path-policy | pass | Generated artifact paths must live under output/smoke/: output/smoke/partner-onboarding-report.json |
| CC-018:evidence-3:kind-valid | pass | Evidence kind must be repo_file or generated_artifact: generated_artifact |
| CC-018:evidence-3:path-present | pass | Evidence path must be non-empty. |
| CC-018:evidence-3:artifact-path-policy | pass | Generated artifact paths must live under output/smoke/: output/smoke/partner-onboarding-report.md |
| CC-018:command-gates-present | pass | Each control must map to at least one smoke command. |
| CC-018:command-gate-1 | pass | Command gate must exist in package.json scripts: smoke:partner-onboarding |

