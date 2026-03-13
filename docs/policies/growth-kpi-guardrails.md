# Growth KPI Guardrails Policy

## Objective

Define enforceable KPI safety thresholds for growth experiments so autonomous rollout never trades short-term lift for sustained conversion or revenue regression.

## Scope

- Experiment registry entries under Week 45 experimentation OS.
- Metrics tracked per experiment:
  - `conversion_rate`
  - `revenue_per_session`
  - `average_order_value`
  - `order_rate`
  - `refund_rate`

## Guardrail Rules

1. Holdout requirement
- Every experiment must include exactly one holdout/control variant.
- Variant allocation percentages must sum to exactly `100`.

2. Attribution requirement
- Attribution policy must include campaign/source/landing dimensions:
  - `utmSource`
  - `utmCampaign`
  - `landingPath`
- Attribution model and lookback window must be explicitly declared.

3. KPI threshold requirement
- Each experiment must define:
  - warning threshold,
  - fail threshold,
  - minimum sample size,
  - explicit fail action (`pause_experiment` or `rollback_variant`).
- The primary experiment metric must be part of the guardrail set.

4. Action requirement on failure
- If any guardrail status is `fail`, the configured fail action must be executed.
- If guardrail status is `warn`, experiment may continue only with owner review in the same release window.

## Enforcement

- Registry validation and KPI checks:
  - `pnpm smoke:growth-experiments`
- Matrix enforcement stage:
  - `pnpm smoke:e2e-matrix` (includes growth-experiment command stage)
- Artifacts:
  - `output/experiments/experiment-registry.json`
  - `output/smoke/growth-experiment-os-report.json`
  - `output/smoke/growth-experiment-os-report.md`

## Change Control

- Any modification to guardrail metrics/thresholds must update:
  - this policy file,
  - `src/infrastructure/growth/experiment-registry.ts`,
  - Week summary for the current execution week.
