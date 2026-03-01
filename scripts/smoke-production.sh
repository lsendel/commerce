#!/usr/bin/env bash
# Production smoke test — verifies every route responds with the expected HTTP status.
# Usage:
#   ./scripts/smoke-production.sh                    # default: https://petm8.io
#   SMOKE_BASE_URL=https://staging.petm8.io ./scripts/smoke-production.sh

set -euo pipefail

BASE="${SMOKE_BASE_URL:-https://petm8.io}"
CURL="${CURL_PATH:-curl}"

PASS=0
FAIL=0
TOTAL=0

check() {
  local method="$1" label="$2" url="$3" expect="$4"
  TOTAL=$((TOTAL+1))
  code=$($CURL -s -o /dev/null -w '%{http_code}' -X "$method" "$url" 2>/dev/null)
  if [ "$code" = "$expect" ]; then
    PASS=$((PASS+1))
    printf "  ✓ %-6s %-55s → %s\n" "$method" "$label" "$code"
  else
    FAIL=$((FAIL+1))
    printf "  ✗ %-6s %-55s → %s (expected %s)\n" "$method" "$label" "$code" "$expect"
  fi
}

echo "=== PRODUCTION SMOKE TEST ==="
echo "  Target: $BASE"
echo "  Date:   $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

# ─── Public pages (200) ─────────────────────────────────────────────────────
echo "— Public pages —"
check GET "/" "$BASE/" 200
check GET "/products" "$BASE/products" 200
check GET "/events" "$BASE/events" 200
check GET "/health" "$BASE/health" 200
check GET "/auth/login" "$BASE/auth/login" 200
check GET "/auth/register" "$BASE/auth/register" 200
check GET "/auth/forgot-password" "$BASE/auth/forgot-password" 200
check GET "/platform/create-store" "$BASE/platform/create-store" 200

echo ""
echo "— Public page redirects —"
check GET "/login (→ /auth/login)" "$BASE/login" 301

# ─── Public API (200) ───────────────────────────────────────────────────────
echo ""
echo "— Public API —"
check GET "/api/events" "$BASE/api/events" 200
check GET "/api/products" "$BASE/api/products" 200
check GET "/api/cart" "$BASE/api/cart" 200
check GET "/api/platform/plans" "$BASE/api/platform/plans" 200
check GET "/graphql" "$BASE/graphql" 200

# ─── Auth-gated API (expect 401) ────────────────────────────────────────────
echo ""
echo "— Auth-gated API (expect 401) —"
for ep in \
  "/api/auth/me" \
  "/api/auth/profile" \
  "/api/account/profile" \
  "/api/account/orders" \
  "/api/account/subscriptions" \
  "/api/account/addresses" \
  "/api/analytics/readiness" \
  "/api/analytics/top-products" \
  "/api/analytics/revenue" \
  "/api/promotions" \
  "/api/promotions/codes" \
  "/api/shipping/zones" \
  "/api/tax/tax-zones" \
  "/api/platform/stores"; do
  check GET "$ep" "$BASE$ep" 401
done

# ─── POST API — public endpoints (empty body → 400 validation) ──────────────
echo ""
echo "— POST API (public, empty body → 400 validation) —"
check POST "/api/auth/register" "$BASE/api/auth/register" 400
check POST "/api/auth/login" "$BASE/api/auth/login" 400
check POST "/api/cart/items" "$BASE/api/cart/items" 400

echo ""
echo "— POST API (public, no body needed) —"
check POST "/api/auth/logout" "$BASE/api/auth/logout" 200

# ─── Auth-gated POST API (expect 401) ───────────────────────────────────────
echo ""
echo "— Auth-gated POST API (expect 401) —"
for ep in \
  "/api/fulfillment/sync" \
  "/api/fulfillment/mockup"; do
  check POST "$ep" "$BASE$ep" 401
done

# ─── Admin API (expect 401) ─────────────────────────────────────────────────
echo ""
echo "— Admin API (expect 401) —"
for ep in \
  "/api/admin/orders" \
  "/api/admin/reviews" \
  "/api/admin/segments" \
  "/api/admin/affiliates" \
  "/api/admin/bookings" \
  "/api/admin/fulfillment-dashboard" \
  "/api/admin/loyalty/program" \
  "/api/admin/loyalty/members" \
  "/api/admin/loyalty/transactions" \
  "/api/admin/support/tickets" \
  "/api/admin/support/tickets/stats" \
  "/api/admin/workflows" \
  "/api/admin/pricing-experiments" \
  "/api/admin/returns" \
  "/api/admin/ops/incidents/runbooks" \
  "/api/admin/integration-marketplace/apps" \
  "/api/admin/headless/api-packs" \
  "/api/admin/policies" \
  "/api/admin/store-templates" \
  "/api/admin/control-tower/health"; do
  check GET "$ep" "$BASE$ep" 401
done

# ─── Auth-gated pages (expect 302 redirect to /auth/login) ──────────────────
echo ""
echo "— Auth-gated pages (expect 302) —"
for pg in \
  "/account/settings" \
  "/account/pets" \
  "/account/artwork" \
  "/account/addresses" \
  "/account/subscriptions" \
  "/admin/orders" \
  "/admin/reviews" \
  "/admin/segments" \
  "/admin/affiliates" \
  "/admin/bookings" \
  "/admin/fulfillment" \
  "/admin/promotions" \
  "/admin/promotion-codes" \
  "/admin/shipping" \
  "/admin/tax" \
  "/admin/analytics" \
  "/platform/dashboard" \
  "/platform/settings" \
  "/platform/members" \
  "/platform/integrations"; do
  check GET "$pg" "$BASE$pg" 302
done

# ─── 404 sanity ─────────────────────────────────────────────────────────────
echo ""
echo "— 404 sanity —"
check GET "/does-not-exist" "$BASE/does-not-exist" 404

echo ""
echo "================================"
if [ "$FAIL" -eq 0 ]; then
  echo "ALL PASS: $TOTAL/$TOTAL"
else
  echo "TOTAL: $TOTAL | PASS: $PASS | FAIL: $FAIL"
fi
echo "================================"

exit "$FAIL"
