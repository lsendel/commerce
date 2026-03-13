# Admin API Parity Smoke Report

- Started: 2026-03-13T05:34:34.672Z
- Finished: 2026-03-13T05:34:34.675Z
- Status: contract_only
- Mutation checks enabled: false
- Flaky policy defaults (external-provider): attempts=3, delayMs=750, suppress=false
- Flaky policy (verify): attempts=3, delayMs=750, suppress=false
- Flaky policy (install): attempts=3, delayMs=750, suppress=false
- Flaky policy (uninstall): attempts=3, delayMs=750, suppress=false
- Checks: total=66, failed=0, suppressed=0
- Latency (ms): count=0, min=n/a, p50=n/a, p95=n/a, max=n/a, avg=n/a
- Owner rollups (top): commerce-platform(total=13,pass=13,fail=0,suppressed=0); commerce-billing(total=9,pass=9,fail=0,suppressed=0); commerce-identity(total=7,pass=7,fail=0,suppressed=0); commerce-checkout(total=6,pass=6,fail=0,suppressed=0); commerce-bookings(total=4,pass=4,fail=0,suppressed=0); commerce-control-tower(total=4,pass=4,fail=0,suppressed=0); commerce-integrations(total=4,pass=4,fail=0,suppressed=0); commerce-reviews(total=4,pass=4,fail=0,suppressed=0)
- Owner latency rollups (top): commerce-automation(checks=3,count=0,p50=n/a,p95=n/a,avg=n/a); commerce-billing(checks=9,count=0,p50=n/a,p95=n/a,avg=n/a); commerce-bookings(checks=4,count=0,p50=n/a,p95=n/a,avg=n/a); commerce-catalog(checks=3,count=0,p50=n/a,p95=n/a,avg=n/a); commerce-checkout(checks=6,count=0,p50=n/a,p95=n/a,avg=n/a); commerce-control-tower(checks=4,count=0,p50=n/a,p95=n/a,avg=n/a); commerce-growth(checks=3,count=0,p50=n/a,p95=n/a,avg=n/a); commerce-identity(checks=7,count=0,p50=n/a,p95=n/a,avg=n/a)
- Owner latency SLO (p95): configuredOwners=0, warnings=0, failures=0
- Owner latency SLO warnings (top): none
- Owner latency SLO failures (top): none
- Tag rollups (top): mutations(total=34,pass=34,fail=0,suppressed=0); admin(total=25,pass=25,fail=0,suppressed=0); storefront(total=15,pass=15,fail=0,suppressed=0); read(total=12,pass=12,fail=0,suppressed=0); account(total=9,pass=9,fail=0,suppressed=0); subscriptions(total=9,pass=9,fail=0,suppressed=0); auth(total=7,pass=7,fail=0,suppressed=0); platform(total=6,pass=6,fail=0,suppressed=0); bookings(total=4,pass=4,fail=0,suppressed=0); cart(total=4,pass=4,fail=0,suppressed=0); integrations(total=4,pass=4,fail=0,suppressed=0); members(total=4,pass=4,fail=0,suppressed=0)
- Error: none

| Name | Method | Path | Owner | Tags | Status | Result | Duration(ms) | Attempts | Suppressed | Note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| contract:getPolicy | GET | /api/admin/policies | commerce-control-tower | admin,policies,compliance | contract | pass |  |  | no |  |
| contract:updatePolicy | PUT | /api/admin/policies | commerce-control-tower | admin,policies,mutations | contract | pass |  |  | no |  |
| contract:listViolations | GET | /api/admin/policies/violations | commerce-control-tower | admin,policies,violations | contract | pass |  |  | no |  |
| contract:getControlTowerSummary | GET | /api/admin/control-tower/summary | commerce-control-tower | admin,control-tower,summary | contract | pass |  |  | no |  |
| contract:listPricingExperiments | GET | /api/admin/pricing-experiments | commerce-growth | admin,pricing,experiments | contract | pass |  |  | no |  |
| contract:pricingExperimentPreflight | POST | /api/admin/pricing-experiments/preflight | commerce-growth | admin,pricing,preflight | contract | pass |  |  | no |  |
| contract:pricingExperimentPerformance | GET | /api/admin/pricing-experiments/:id/performance | commerce-growth | admin,pricing,performance | contract | pass |  |  | no |  |
| contract:fulfillmentSlaDashboard | GET | /api/admin/ops/fulfillment-sla | commerce-operations | admin,fulfillment,sla | contract | pass |  |  | no |  |
| contract:fulfillmentSlaInterventions | POST | /api/admin/ops/fulfillment-sla/interventions | commerce-operations | admin,fulfillment,sla,interventions | contract | pass |  |  | no |  |
| contract:listWorkflows | GET | /api/admin/workflows | commerce-automation | admin,workflows | contract | pass |  |  | no |  |
| contract:analyticsRecommendationHistory | GET | /api/analytics/recommendations/history | commerce-automation | admin,analytics,recommendations,automation,read | contract | pass |  |  | no |  |
| contract:analyticsApplyRecommendation | POST | /api/analytics/recommendations/apply | commerce-automation | admin,analytics,recommendations,automation,mutations | contract | pass |  |  | no |  |
| contract:listIntegrationMarketplaceApps | GET | /api/admin/integration-marketplace/apps | commerce-integrations | admin,integrations,marketplace | contract | pass |  |  | no |  |
| contract:installIntegrationApp | POST | /api/admin/integration-marketplace/apps/:provider/install | commerce-integrations | admin,integrations,provider,mutations | contract | pass |  |  | no |  |
| contract:uninstallIntegrationApp | POST | /api/admin/integration-marketplace/apps/:provider/uninstall | commerce-integrations | admin,integrations,provider,mutations | contract | pass |  |  | no |  |
| contract:verifyIntegrationApp | POST | /api/admin/integration-marketplace/apps/:provider/verify | commerce-integrations | admin,integrations,provider,verification | contract | pass |  |  | no |  |
| contract:listPartnerOnboarding | GET | /api/admin/integration-marketplace/partners/onboarding | unknown | unmapped | contract | pass |  |  | no |  |
| contract:getPartnerOnboarding | GET | /api/admin/integration-marketplace/partners/:provider/onboarding | unknown | unmapped | contract | pass |  |  | no |  |
| contract:completePartnerOnboarding | POST | /api/admin/integration-marketplace/partners/:provider/onboarding/complete | unknown | unmapped | contract | pass |  |  | no |  |
| contract:verifyPartnerContract | POST | /api/admin/integration-marketplace/partners/:provider/contract-verify | unknown | unmapped | contract | pass |  |  | no |  |
| contract:listHeadlessPacks | GET | /api/admin/headless/packs | commerce-platform | admin,headless,api-packs | contract | pass |  |  | no |  |
| contract:createHeadlessPack | POST | /api/admin/headless/packs | commerce-platform | admin,headless,api-packs,mutations | contract | pass |  |  | no |  |
| contract:revokeHeadlessPack | POST | /api/admin/headless/packs/:id/revoke | commerce-platform | admin,headless,api-packs,mutations | contract | pass |  |  | no |  |
| contract:listStoreTemplates | GET | /api/admin/store-templates | commerce-platform | admin,store-templates | contract | pass |  |  | no |  |
| contract:createStoreTemplate | POST | /api/admin/store-templates | commerce-platform | admin,store-templates,mutations | contract | pass |  |  | no |  |
| contract:cloneStoreTemplate | POST | /api/admin/store-templates/:id/clone | commerce-platform | admin,store-templates,clone | contract | pass |  |  | no |  |
| contract:deleteStoreTemplate | DELETE | /api/admin/store-templates/:id | commerce-platform | admin,store-templates,mutations | contract | pass |  |  | no |  |
| contract:getPlatformPlans | GET | /api/platform/plans | commerce-platform | platform,plans,read | contract | pass |  |  | no |  |
| contract:invitePlatformMember | POST | /api/platform/stores/:id/invite | commerce-platform | platform,members,invite,mutations | contract | pass |  |  | no |  |
| contract:acceptPlatformInvitation | POST | /api/platform/invitations/:token/accept | commerce-platform | platform,members,invite,mutations | contract | pass |  |  | no |  |
| contract:changePlatformMemberRole | PATCH | /api/platform/stores/:id/members/:userId/role | commerce-platform | platform,members,role,mutations | contract | pass |  |  | no |  |
| contract:uploadPlatformStoreLogo | POST | /api/platform/stores/:id/logo | commerce-platform | platform,stores,branding,mutations | contract | pass |  |  | no |  |
| contract:removePlatformMember | DELETE | /api/platform/stores/:id/members/:userId | commerce-platform | platform,members,mutations | contract | pass |  |  | no |  |
| contract:listProducts | GET | /api/products | commerce-catalog | storefront,catalog,products,read | contract | pass |  |  | no |  |
| contract:getProductBySlug | GET | /api/products/:slug | commerce-catalog | storefront,catalog,product-detail,read | contract | pass |  |  | no |  |
| contract:listCollections | GET | /api/collections | commerce-catalog | storefront,catalog,collections,read | contract | pass |  |  | no |  |
| contract:getCart | GET | /api/cart | commerce-checkout | storefront,cart,read | contract | pass |  |  | no |  |
| contract:validateCart | POST | /api/cart/validate | commerce-checkout | storefront,cart,validation | contract | pass |  |  | no |  |
| contract:applyCartCoupon | POST | /api/cart/apply-coupon | commerce-checkout | storefront,cart,coupon,mutations | contract | pass |  |  | no |  |
| contract:removeCartCoupon | DELETE | /api/cart/remove-coupon | commerce-checkout | storefront,cart,coupon,mutations | contract | pass |  |  | no |  |
| contract:createCheckout | POST | /api/checkout | commerce-checkout | storefront,checkout,mutations | contract | pass |  |  | no |  |
| contract:checkoutSuccess | GET | /api/checkout/success | commerce-checkout | storefront,checkout,read | contract | pass |  |  | no |  |
| contract:listProductReviews | GET | /api/products/:slug/reviews | commerce-reviews | storefront,reviews,read | contract | pass |  |  | no |  |
| contract:markReviewHelpful | POST | /api/reviews/:id/helpful | commerce-reviews | storefront,reviews,engagement,mutations | contract | pass |  |  | no |  |
| contract:reportReview | POST | /api/reviews/:id/report | commerce-reviews | storefront,reviews,moderation,mutations | contract | pass |  |  | no |  |
| contract:respondToReview | POST | /api/reviews/:id/respond | commerce-reviews | admin,reviews,moderation,mutations | contract | pass |  |  | no |  |
| contract:markBookingNoShow | POST | /api/bookings/:id/no-show | commerce-bookings | admin,bookings,mutations | contract | pass |  |  | no |  |
| contract:joinBookingWaitlist | POST | /api/bookings/availability/:id/waitlist | commerce-bookings | storefront,bookings,waitlist,mutations | contract | pass |  |  | no |  |
| contract:listBookingWaitlist | GET | /api/bookings/waitlist | commerce-bookings | storefront,bookings,waitlist,read | contract | pass |  |  | no |  |
| contract:removeBookingWaitlistEntry | DELETE | /api/bookings/waitlist/:id | commerce-bookings | storefront,bookings,waitlist,mutations | contract | pass |  |  | no |  |
| contract:authForgotPassword | POST | /api/auth/forgot-password | commerce-identity | auth,password-reset,mutations | contract | pass |  |  | no |  |
| contract:authResetPassword | POST | /api/auth/reset-password | commerce-identity | auth,password-reset,mutations | contract | pass |  |  | no |  |
| contract:authVerifyEmail | POST | /api/auth/verify-email | commerce-identity | auth,email-verification,mutations | contract | pass |  |  | no |  |
| contract:authProfile | GET | /api/auth/profile | commerce-identity | auth,profile,read | contract | pass |  |  | no |  |
| contract:authUpdateProfile | PATCH | /api/auth/profile | commerce-identity | auth,profile,mutations | contract | pass |  |  | no |  |
| contract:authRequestVerification | POST | /api/auth/request-verification | commerce-identity | auth,email-verification,mutations | contract | pass |  |  | no |  |
| contract:authChangePassword | POST | /api/auth/change-password | commerce-identity | auth,password,mutations | contract | pass |  |  | no |  |
| contract:subscriptionCreate | POST | /api/subscriptions | commerce-billing | account,subscriptions,mutations | contract | pass |  |  | no |  |
| contract:subscriptionList | GET | /api/subscriptions | commerce-billing | account,subscriptions,read | contract | pass |  |  | no |  |
| contract:subscriptionBuilderOptions | GET | /api/subscriptions/builder/options | commerce-billing | account,subscriptions,builder,read | contract | pass |  |  | no |  |
| contract:subscriptionBuilderQuote | POST | /api/subscriptions/builder/quote | commerce-billing | account,subscriptions,builder,quote | contract | pass |  |  | no |  |
| contract:subscriptionBuilderCheckout | POST | /api/subscriptions/builder/checkout | commerce-billing | account,subscriptions,builder,mutations | contract | pass |  |  | no |  |
| contract:subscriptionPortal | POST | /api/subscriptions/portal | commerce-billing | account,subscriptions,portal,mutations | contract | pass |  |  | no |  |
| contract:subscriptionCancel | DELETE | /api/subscriptions/:id | commerce-billing | account,subscriptions,mutations | contract | pass |  |  | no |  |
| contract:subscriptionChangePlan | PATCH | /api/subscriptions/:id/change-plan | commerce-billing | account,subscriptions,plan-change,mutations | contract | pass |  |  | no |  |
| contract:subscriptionResume | POST | /api/subscriptions/:id/resume | commerce-billing | account,subscriptions,resume,mutations | contract | pass |  |  | no |  |
