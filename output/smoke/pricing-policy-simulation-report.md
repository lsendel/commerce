# Pricing Policy Simulation Report

- Started: 2026-03-06T06:41:12.287Z
- Finished: 2026-03-06T06:41:12.288Z
- Status: passed
- Total checks: 5
- Failed checks: 0

| Check | Status | Note |
| --- | --- | --- |
| low-risk-rollout | pass | Balanced small-delta rollout should remain low risk with no blockers. |
| hard-policy-block | pass | Policy violations in enforce mode should trigger high-risk preflight blockers. |
| monitor-mode-warnings | pass | Monitor mode should downgrade violations to warnings without hard blockers. |
| discount-policy-block | pass | Unsafe discount scenarios should produce blocking findings and mitigation guidance. |
| policy-engine-disabled-advisory | pass | Preflight should surface advisory warning when policy enforcement is disabled. |

