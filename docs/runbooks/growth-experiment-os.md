# Growth Experiment Operating System Runbook

## Scope

- Command: `pnpm smoke:growth-experiments`
- Script: `scripts/smoke-growth-experiment-os.ts`
- Core module: `src/infrastructure/growth/experiment-registry.ts`
- Purpose:
  - validate experiment registry integrity,
  - enforce KPI guardrails for autonomous growth experiments,
  - publish registry + evaluation artifacts for release triage.

## What It Covers

- Registry structural checks:
  - unique experiment IDs,
  - exact holdout count (`1`),
  - allocation total (`100`),
  - required attribution keys,
  - primary metric presence in guardrails.
- KPI guardrail checks:
  - warning/fail threshold evaluation,
  - minimum sample size checks,
  - action recommendation (`pause_experiment` / `rollback_variant`).

## Modes

1. Default mode
- `pnpm smoke:growth-experiments`

2. Artifact override mode
- `SMOKE_GROWTH_EXPERIMENTS_JSON_PATH=<path> pnpm smoke:growth-experiments`
- `SMOKE_GROWTH_EXPERIMENTS_MD_PATH=<path> pnpm smoke:growth-experiments`
- `EXPERIMENT_REGISTRY_JSON_PATH=<path> pnpm smoke:growth-experiments`

3. Matrix skip control
- `SMOKE_MATRIX_SKIP_GROWTH_EXPERIMENTS=true pnpm smoke:e2e-matrix`

## Artifacts

- Report JSON:
  - `output/smoke/growth-experiment-os-report.json`
- Report Markdown:
  - `output/smoke/growth-experiment-os-report.md`
- Registry snapshot:
  - `output/experiments/experiment-registry.json`

## Failure Handling

1. Open `output/smoke/growth-experiment-os-report.md`.
2. Fix registry violations first:
  - allocation totals,
  - holdout misconfiguration,
  - missing attribution requirements.
3. Then fix KPI failures:
  - tighten or rollback violating variants,
  - re-evaluate thresholds if they are too permissive/strict for baseline.
4. Re-run:
  - `pnpm smoke:growth-experiments`
  - `pnpm smoke:e2e-matrix`
