# Recommendation Quality Report

- Started: 2026-03-06T06:41:11.862Z
- Finished: 2026-03-06T06:41:11.863Z
- Status: passed
- Model version: wk48-ranking-v1
- Total checks: 6
- Failed checks: 0

| Check | Status | Note |
| --- | --- | --- |
| related-priority | pass | Related signal should outrank plain catalog fallback when price fit is similar. |
| reason-co-purchase | pass | Top recommendation should preserve co_purchase_signal reason. |
| inventory-penalty | pass | In-stock candidate should outrank low-stock risk candidate. |
| price-fit-priority | pass | Price-fit candidate should outrank extreme price outlier candidate. |
| fallback-reason | pass | Fallback candidate must include catalog_fallback reason. |
| model-version-tag | pass | Ranked output must include model version reason tag for traceability. |

