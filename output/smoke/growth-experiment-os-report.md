# Growth Experiment OS Smoke Report

- Started: 2026-03-06T06:41:09.258Z
- Finished: 2026-03-06T06:41:09.259Z
- Status: passed_with_warnings
- Experiments: 3
- Passed: 2
- Warnings: 1
- Failed: 0
- Invalid definitions: 0

- Registry snapshot: output/experiments/experiment-registry.json

| Experiment | Owner | Registry | Guardrail Status |
| --- | --- | --- | --- |
| wk45-pricing-holdout-geo | commerce-growth | valid | pass |
| wk45-lp-intent-copy | commerce-growth | valid | warn |
| wk45-checkout-recovery-offer | commerce-growth | valid | pass |

## wk45-pricing-holdout-geo: Pricing Lift by Demand Bands

| Metric | Direction | Baseline | Current | Sample | Delta % | Breach % | Status | Action | Note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| conversion_rate | not_below | 3.1 | 3.04 | 1300 | -1.94 | 1.94 | pass | none | Within configured threshold. |
| revenue_per_session | not_below | 2.85 | 2.94 | 1300 | 3.16 | 0 | pass | none | Within configured threshold. |
| refund_rate | not_above | 1.4 | 1.49 | 600 | 6.43 | 6.43 | pass | none | Within configured threshold. |

## wk45-lp-intent-copy: Intent-Led Landing Page Narrative

| Metric | Direction | Baseline | Current | Sample | Delta % | Breach % | Status | Action | Note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| conversion_rate | not_below | 2.6 | 2.52 | 780 | -3.08 | 3.08 | warn | none | Breach 3.08% exceeded warn threshold 3%. |
| average_order_value | not_below | 42.5 | 42.3 | 780 | -0.47 | 0.47 | pass | none | Within configured threshold. |

## wk45-checkout-recovery-offer: Checkout Recovery Offer Timing

| Metric | Direction | Baseline | Current | Sample | Delta % | Breach % | Status | Action | Note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| order_rate | not_below | 1.8 | 1.84 | 420 | 2.22 | 0 | pass | none | Within configured threshold. |
| refund_rate | not_above | 1.3 | 1.35 | 420 | 3.85 | 3.85 | pass | none | Within configured threshold. |

