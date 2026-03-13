# Cost Observability and Unit Economics Runbook

## Scope

- Policy: `docs/policies/cost-observability-unit-economics-v1.json`
- API: `GET /api/analytics/cost-observability`
- Admin page: `/admin/analytics`
- Smoke gate: `pnpm smoke:cost-observability`

## Purpose

- Track cost and unit-economics health across feature/team/tenant views.
- Keep optimization opportunities ranked and execution-ready.

## Operating Procedure

1. Run `pnpm smoke:cost-observability`.
2. Confirm reports:
   - `output/smoke/cost-observability-report.json`
   - `output/smoke/cost-observability-report.md`
3. Review summary KPIs:
   - total estimated cost,
   - blended revenue-to-cost ratio,
   - blended cost per order.
4. Review dimensions:
   - feature rows for status severity and high-cost offenders,
   - team rows for ownership and aggregate cost hotspots,
   - tenant rows for shared-overhead drift.
5. Execute top backlog items (`p0`, then `p1`) and update policy backlog status.

## Failure Handling

1. If policy checks fail:
   - fix missing dimensions, stale dates, or incomplete backlog metadata.
2. If route/contract checks fail:
   - align `src/contracts/analytics.contract.ts` and `src/routes/api/analytics.routes.ts`.
3. If dashboard wiring checks fail:
   - align `src/index.tsx` and `src/routes/pages/admin/analytics.page.tsx`.
4. Re-run:
   - `pnpm smoke:cost-observability`
   - `pnpm smoke:compliance-controls`
   - `SMOKE_MATRIX_SKIP_HTTP=true pnpm smoke:e2e-matrix`

## Escalation Guidelines

- `revenue_to_cost_ratio < 2.0` in any feature/team row: escalate to owner team within 1 business day.
- `cost_per_order_usd > target * 1.25`: create mitigation ticket as `p0` or `p1`.
- Shared platform overhead trend > 20% week-over-week: notify SRE + Platform leads.
