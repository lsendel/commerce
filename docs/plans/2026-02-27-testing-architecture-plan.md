# Testing Architecture Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a multi-layer testing infrastructure (unit, integration, API contract, smoke, E2E) for petm8.io using Vitest + Playwright.

**Architecture:** Vitest workspace with 4 projects (unit, integration, api, smoke) plus a separate Playwright config for browser E2E. OpenAPI spec auto-generated from ts-rest contracts. All layers triggered manually via `pnpm test:*` scripts.

**Tech Stack:** Vitest 3.x, Playwright 1.50+, @ts-rest/open-api, TypeScript, pnpm

---

### Task 1: Install dependencies and create Vitest workspace config

**Files:**
- Modify: `package.json`
- Create: `tests/vitest.config.ts`
- Create: `tests/setup/test-env.ts`

**Step 1: Install test dependencies**

Run:
```bash
pnpm add -D vitest @playwright/test @ts-rest/open-api
```

**Step 2: Add test scripts to package.json**

Add these scripts to `package.json`:

```json
{
  "test": "vitest run --config tests/vitest.config.ts",
  "test:unit": "vitest run --config tests/vitest.config.ts --project unit",
  "test:integration": "vitest run --config tests/vitest.config.ts --project integration",
  "test:api": "vitest run --config tests/vitest.config.ts --project api",
  "test:smoke": "vitest run --config tests/vitest.config.ts --project smoke",
  "test:e2e": "playwright test --config tests/e2e/playwright.config.ts",
  "test:watch": "vitest --config tests/vitest.config.ts --project unit",
  "openapi:generate": "tsx scripts/generate-openapi.ts"
}
```

**Step 3: Create Vitest workspace config**

Create `tests/vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.ts"],
          environment: "node",
          testTimeout: 5000,
        },
        resolve: {
          alias: { "@": path.resolve(__dirname, "../src") },
        },
      },
      {
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          environment: "node",
          testTimeout: 30000,
          env: { NODE_ENV: "test" },
        },
        resolve: {
          alias: { "@": path.resolve(__dirname, "../src") },
        },
      },
      {
        test: {
          name: "api",
          include: ["tests/api/**/*.test.ts"],
          environment: "node",
          testTimeout: 15000,
        },
      },
      {
        test: {
          name: "smoke",
          include: ["tests/smoke/**/*.smoke.test.ts"],
          environment: "node",
          testTimeout: 10000,
        },
      },
    ],
  },
});
```

**Step 4: Create shared test env helper**

Create `tests/setup/test-env.ts`:

```typescript
import { config } from "dotenv";
import path from "path";

// Load test env from tests/.env.test if it exists
config({ path: path.resolve(__dirname, "../.env.test") });

export const TEST_ENV = {
  BASE_URL: process.env.BASE_URL || "http://localhost:8787",
  DATABASE_URL: process.env.DATABASE_URL || "",
  PRINTFUL_API_KEY: process.env.PRINTFUL_API_KEY || "",
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || "",
  RESEND_API_KEY: process.env.RESEND_API_KEY || "",

  // Test user credentials (for API + E2E tests)
  TEST_USER_EMAIL: process.env.TEST_USER_EMAIL || "smoke-test@petm8.io",
  TEST_USER_PASSWORD: process.env.TEST_USER_PASSWORD || "",
  TEST_ADMIN_EMAIL: process.env.TEST_ADMIN_EMAIL || "admin@petm8.io",
  TEST_ADMIN_PASSWORD: process.env.TEST_ADMIN_PASSWORD || "",
} as const;

export function requireEnv(key: keyof typeof TEST_ENV): string {
  const value = TEST_ENV[key];
  if (!value) throw new Error(`Missing required test env: ${key}`);
  return value;
}
```

**Step 5: Create .env.test template**

Create `tests/.env.test.example`:

```env
BASE_URL=https://petm8.io
DATABASE_URL=postgresql://user:pass@host/db
PRINTFUL_API_KEY=
STRIPE_SECRET_KEY=
RESEND_API_KEY=
TEST_USER_EMAIL=smoke-test@petm8.io
TEST_USER_PASSWORD=
TEST_ADMIN_EMAIL=admin@petm8.io
TEST_ADMIN_PASSWORD=
```

**Step 6: Add tests/.env.test to .gitignore**

Append to `.gitignore`:
```
tests/.env.test
```

**Step 7: Run typecheck to verify config compiles**

Run: `pnpm tsc --noEmit`
Expected: PASS (0 errors)

**Step 8: Commit**

```bash
git add tests/vitest.config.ts tests/setup/test-env.ts tests/.env.test.example package.json .gitignore
git commit -m "feat: add Vitest workspace config with unit/integration/api/smoke projects"
```

---

### Task 2: OpenAPI spec generation from ts-rest contracts

**Files:**
- Create: `scripts/generate-openapi.ts`
- Reference: `src/contracts/index.ts` (18 contracts)

**Step 1: Create the OpenAPI generation script**

Create `scripts/generate-openapi.ts`:

```typescript
import { generateOpenApi } from "@ts-rest/open-api";
import { contract } from "../src/contracts/index";
import fs from "node:fs";
import path from "node:path";

const openApiDocument = generateOpenApi(contract, {
  info: {
    title: "petm8 API",
    version: "0.1.0",
    description: "Auto-generated from ts-rest contracts",
  },
  servers: [
    { url: "https://petm8.io", description: "Production" },
    { url: "http://localhost:8787", description: "Local dev" },
  ],
});

const outPath = path.resolve(__dirname, "../docs/openapi.json");
fs.writeFileSync(outPath, JSON.stringify(openApiDocument, null, 2), "utf8");
console.log(`OpenAPI spec written to ${outPath}`);
console.log(`  Paths: ${Object.keys(openApiDocument.paths ?? {}).length}`);
```

**Step 2: Run the generator**

Run: `pnpm openapi:generate`
Expected: Output like `OpenAPI spec written to docs/openapi.json` with path count matching the ~40+ endpoints across 18 contracts.

**Step 3: Verify the output**

Run: `node -e "const s = require('./docs/openapi.json'); console.log(Object.keys(s.paths).length + ' paths')"`
Expected: A number > 30 (the combined endpoint count across all contracts)

**Step 4: Add docs/openapi.json to .gitignore** (generated file)

Append to `.gitignore`:
```
docs/openapi.json
```

**Step 5: Commit**

```bash
git add scripts/generate-openapi.ts .gitignore
git commit -m "feat: add OpenAPI spec generator from ts-rest contracts"
```

---

### Task 3: Unit tests — domain entities and value objects

**Files:**
- Create: `tests/unit/domain/user.entity.test.ts`
- Create: `tests/unit/domain/cart-total.vo.test.ts`
- Reference: `src/domain/identity/user.entity.ts`
- Reference: `src/domain/cart/cart-total.vo.ts`

**Step 1: Write user entity tests**

Create `tests/unit/domain/user.entity.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { isEmailVerified, createUser } from "@/domain/identity/user.entity";

describe("User entity", () => {
  const baseParams = {
    id: "usr_123",
    email: "test@petm8.io",
    name: "Test User",
    passwordHash: "hashed",
    googleSub: null,
    appleSub: null,
    metaSub: null,
    stripeCustomerId: null,
    emailVerifiedAt: null,
    avatarUrl: null,
    locale: "en",
    timezone: "UTC",
    marketingOptIn: false,
    lastLoginAt: null,
  };

  it("creates user with timestamps", () => {
    const user = createUser(baseParams);
    expect(user.id).toBe("usr_123");
    expect(user.createdAt).toBeInstanceOf(Date);
    expect(user.updatedAt).toBeInstanceOf(Date);
  });

  it("reports email not verified when emailVerifiedAt is null", () => {
    const user = createUser(baseParams);
    expect(isEmailVerified(user)).toBe(false);
  });

  it("reports email verified when emailVerifiedAt is set", () => {
    const user = createUser({ ...baseParams, emailVerifiedAt: new Date() });
    expect(isEmailVerified(user)).toBe(true);
  });
});
```

**Step 2: Write cart total value object tests**

Create `tests/unit/domain/cart-total.vo.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { recalculate, totalSavings } from "@/domain/cart/cart-total.vo";

describe("CartTotal recalculate", () => {
  it("calculates subtotal from line items", () => {
    const result = recalculate([
      { quantity: 2, price: 10 },
      { quantity: 1, price: 25 },
    ]);
    expect(result.subtotal).toBe(45);
  });

  it("applies percentage coupon", () => {
    const result = recalculate(
      [{ quantity: 1, price: 100 }],
      { discountType: "percentage", discountValue: 10 },
    );
    expect(result.discount).toBe(10);
  });

  it("applies fixed amount coupon capped at subtotal", () => {
    const result = recalculate(
      [{ quantity: 1, price: 5 }],
      { discountType: "fixed_amount", discountValue: 20 },
    );
    expect(result.discount).toBe(5); // capped at subtotal
  });

  it("skips coupon if minimum not met", () => {
    const result = recalculate(
      [{ quantity: 1, price: 10 }],
      { discountType: "percentage", discountValue: 10, minimumOrderAmount: 50 },
    );
    expect(result.discount).toBe(0);
  });

  it("free shipping for orders >= $50", () => {
    const result = recalculate([{ quantity: 1, price: 60 }]);
    expect(result.shippingEstimate).toBe(0);
  });

  it("$5.99 shipping for orders < $50", () => {
    const result = recalculate([{ quantity: 1, price: 20 }]);
    expect(result.shippingEstimate).toBe(5.99);
  });

  it("calculates 8% tax estimate", () => {
    const result = recalculate([{ quantity: 1, price: 100 }]);
    expect(result.taxEstimate).toBe(8);
  });
});

describe("totalSavings", () => {
  it("returns 0 when no compareAtPrice", () => {
    expect(totalSavings([{ quantity: 1, price: 10 }])).toBe(0);
  });

  it("calculates savings from compareAtPrice", () => {
    const savings = totalSavings([
      { quantity: 2, price: 10, compareAtPrice: 15 },
    ]);
    expect(savings).toBe(10); // (15-10) * 2
  });
});
```

**Step 3: Run unit tests**

Run: `pnpm test:unit`
Expected: All tests PASS

**Step 4: Commit**

```bash
git add tests/unit/
git commit -m "test: add unit tests for User entity and CartTotal value object"
```

---

### Task 4: Unit tests — promotion evaluator service

**Files:**
- Create: `tests/unit/domain/promotion-evaluator.test.ts`
- Reference: `src/domain/promotions/promotion-evaluator.service.ts`
- Reference: `src/domain/promotions/promotion.entity.ts`

**Step 1: Read the Promotion entity to understand the shape**

Reference file: `src/domain/promotions/promotion.entity.ts`

**Step 2: Write promotion evaluator tests**

Create `tests/unit/domain/promotion-evaluator.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  evaluateCondition,
  applyStrategy,
  evaluatePromotions,
  type CartForEvaluation,
  type EvaluationContext,
} from "@/domain/promotions/promotion-evaluator.service";
import type { Promotion, ConditionNode } from "@/domain/promotions/promotion.entity";

const baseCart: CartForEvaluation = {
  items: [
    { variantId: "v1", productId: "p1", collectionIds: ["c1"], quantity: 2, unitPrice: 25, lineTotal: 50 },
    { variantId: "v2", productId: "p2", collectionIds: ["c2"], quantity: 1, unitPrice: 10, lineTotal: 10 },
  ],
  subtotal: 60,
  itemCount: 3,
  customerId: "cust_1",
};

const baseCtx: EvaluationContext = {
  isFirstPurchase: false,
  customerSegmentIds: [],
};

function makePromo(overrides: Partial<Promotion>): Promotion {
  return {
    id: "promo_1",
    name: "Test Promo",
    storeId: "store_1",
    status: "active",
    priority: 1,
    stackable: true,
    startsAt: new Date("2020-01-01"),
    endsAt: null,
    usageLimit: null,
    usageCount: 0,
    conditions: { type: "cart_total", op: "gte", value: 0 } as ConditionNode,
    strategyType: "percentage_off",
    strategyParams: { percentage: 10 },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Promotion;
}

describe("evaluateCondition", () => {
  it("cart_total gte passes when subtotal meets threshold", () => {
    const node: ConditionNode = { type: "cart_total", op: "gte", value: 50 } as ConditionNode;
    expect(evaluateCondition(node, baseCart, baseCtx)).toBe(true);
  });

  it("cart_total gte fails when subtotal below threshold", () => {
    const node: ConditionNode = { type: "cart_total", op: "gte", value: 100 } as ConditionNode;
    expect(evaluateCondition(node, baseCart, baseCtx)).toBe(false);
  });

  it("AND operator requires all children true", () => {
    const node: ConditionNode = {
      operator: "and",
      children: [
        { type: "cart_total", op: "gte", value: 50 },
        { type: "item_count", op: "gte", value: 3 },
      ],
    } as ConditionNode;
    expect(evaluateCondition(node, baseCart, baseCtx)).toBe(true);
  });

  it("first_purchase condition works", () => {
    const node: ConditionNode = { type: "first_purchase" } as ConditionNode;
    expect(evaluateCondition(node, baseCart, { ...baseCtx, isFirstPurchase: true })).toBe(true);
    expect(evaluateCondition(node, baseCart, baseCtx)).toBe(false);
  });
});

describe("applyStrategy", () => {
  it("percentage_off calculates correct discount", () => {
    const promo = makePromo({ strategyType: "percentage_off", strategyParams: { percentage: 10 } });
    const result = applyStrategy(promo, baseCart);
    expect(result.discountAmount).toBe(6); // 10% of 60
  });

  it("fixed_amount caps at subtotal", () => {
    const promo = makePromo({ strategyType: "fixed_amount", strategyParams: { amount: 100 } });
    const result = applyStrategy(promo, baseCart);
    expect(result.discountAmount).toBe(60); // capped at subtotal
  });

  it("free_shipping sets flag with zero discount", () => {
    const promo = makePromo({ strategyType: "free_shipping", strategyParams: {} });
    const result = applyStrategy(promo, baseCart);
    expect(result.freeShipping).toBe(true);
    expect(result.discountAmount).toBe(0);
  });

  it("bogo discounts cheapest item", () => {
    const promo = makePromo({ strategyType: "bogo", strategyParams: {} });
    const result = applyStrategy(promo, baseCart);
    expect(result.discountAmount).toBe(10); // cheapest item (v2 @ $10)
    expect(result.affectedItems).toEqual(["v2"]);
  });
});

describe("evaluatePromotions", () => {
  it("skips promotions that exceed usage limit", () => {
    const promo = makePromo({ usageLimit: 5, usageCount: 5 });
    const results = evaluatePromotions([promo], baseCart, baseCtx);
    expect(results).toHaveLength(0);
  });

  it("non-stackable promo blocks subsequent non-stackable", () => {
    const promo1 = makePromo({ id: "p1", stackable: false, strategyParams: { percentage: 10 } });
    const promo2 = makePromo({ id: "p2", stackable: false, strategyParams: { percentage: 20 } });
    const results = evaluatePromotions([promo1, promo2], baseCart, baseCtx);
    expect(results).toHaveLength(1);
    expect(results[0].promotionId).toBe("p1");
  });
});
```

**Step 3: Run unit tests**

Run: `pnpm test:unit`
Expected: All tests PASS

**Step 4: Commit**

```bash
git add tests/unit/domain/promotion-evaluator.test.ts
git commit -m "test: add unit tests for promotion evaluator service"
```

---

### Task 5: Smoke tests — health, pages, GraphQL

**Files:**
- Create: `tests/smoke/health.smoke.test.ts`
- Create: `tests/smoke/pages.smoke.test.ts`
- Create: `tests/smoke/graphql.smoke.test.ts`

**Step 1: Create health smoke test**

Create `tests/smoke/health.smoke.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { requireEnv } from "../setup/test-env";

const BASE_URL = requireEnv("BASE_URL");

describe("Health check", () => {
  it("GET /health returns 200 with ok status", async () => {
    const start = Date.now();
    const res = await fetch(`${BASE_URL}/health`);
    const elapsed = Date.now() - start;

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.timestamp).toBeDefined();
    expect(elapsed).toBeLessThan(2000);
  });
});
```

**Step 2: Create pages smoke test**

Create `tests/smoke/pages.smoke.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { requireEnv } from "../setup/test-env";

const BASE_URL = requireEnv("BASE_URL");

async function expectPageLoads(path: string, containsText?: string) {
  const res = await fetch(`${BASE_URL}${path}`);
  expect(res.status).toBe(200);
  const html = await res.text();
  expect(html).toContain("<title>");
  if (containsText) {
    expect(html.toLowerCase()).toContain(containsText.toLowerCase());
  }
  return html;
}

describe("Storefront pages", () => {
  it("homepage loads", async () => {
    await expectPageLoads("/", "petm8");
  });

  it("product list loads", async () => {
    await expectPageLoads("/products");
  });

  it("login page loads", async () => {
    await expectPageLoads("/login", "sign in");
  });

  it("register page loads", async () => {
    await expectPageLoads("/register", "sign up");
  });
});
```

**Step 3: Create GraphQL smoke test**

Create `tests/smoke/graphql.smoke.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { requireEnv } from "../setup/test-env";

const BASE_URL = requireEnv("BASE_URL");

describe("GraphQL endpoint", () => {
  it("introspection returns valid schema", async () => {
    const res = await fetch(`${BASE_URL}/graphql`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "{ __schema { types { name } } }",
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.__schema.types).toBeInstanceOf(Array);

    const typeNames = body.data.__schema.types.map((t: { name: string }) => t.name);
    expect(typeNames).toContain("Query");
    expect(typeNames).toContain("Product");
  });
});
```

**Step 4: Run smoke tests** (requires BASE_URL pointing to running app)

Run: `BASE_URL=https://petm8.io pnpm test:smoke`
Expected: All PASS if production is up

**Step 5: Commit**

```bash
git add tests/smoke/
git commit -m "test: add smoke tests for health, pages, and GraphQL"
```

---

### Task 6: Smoke tests — integrations and infrastructure

**Files:**
- Create: `tests/smoke/integrations.smoke.test.ts`
- Create: `tests/smoke/infrastructure.smoke.test.ts`
- Create: `tests/smoke/fulfillment.smoke.test.ts`

**Step 1: Create integrations smoke test**

Create `tests/smoke/integrations.smoke.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { TEST_ENV } from "../setup/test-env";

describe("Third-party integrations", () => {
  it("Printful API is reachable", async () => {
    const key = TEST_ENV.PRINTFUL_API_KEY;
    if (!key) return; // skip if not configured

    const res = await fetch("https://api.printful.com/stores", {
      headers: { Authorization: `Bearer ${key}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.result)).toBe(true);
  });

  it("Stripe API key is valid", async () => {
    const key = TEST_ENV.STRIPE_SECRET_KEY;
    if (!key) return;

    const res = await fetch("https://api.stripe.com/v1/balance", {
      headers: { Authorization: `Bearer ${key}` },
    });
    expect(res.status).toBe(200);
  });

  it("Resend email API is reachable", async () => {
    const key = TEST_ENV.RESEND_API_KEY;
    if (!key) return;

    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${key}` },
    });
    expect(res.status).toBe(200);
  });
});
```

**Step 2: Create infrastructure smoke test**

Create `tests/smoke/infrastructure.smoke.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { TEST_ENV, requireEnv } from "../setup/test-env";

describe("Infrastructure", () => {
  it("Neon database is connectable", async () => {
    const dbUrl = TEST_ENV.DATABASE_URL;
    if (!dbUrl) return;

    // Use the Neon serverless driver to run SELECT 1
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(dbUrl);
    const result = await sql`SELECT 1 as one`;
    expect(result[0].one).toBe(1);
  });

  it("App health/infra endpoint reports infrastructure status", async () => {
    const BASE_URL = requireEnv("BASE_URL");
    // The existing /api/integrations/health endpoint checks bindings
    const res = await fetch(`${BASE_URL}/api/integrations/health`);
    // May require auth — if 401, that still proves the endpoint is live
    expect([200, 401]).toContain(res.status);
  });
});
```

**Step 3: Create fulfillment providers smoke test**

Create `tests/smoke/fulfillment.smoke.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { TEST_ENV } from "../setup/test-env";

describe("Fulfillment providers", () => {
  it("Printful provider is reachable", async () => {
    const key = TEST_ENV.PRINTFUL_API_KEY;
    if (!key) return;

    const res = await fetch("https://api.printful.com/store", {
      headers: { Authorization: `Bearer ${key}` },
    });
    expect([200, 401]).toContain(res.status); // 200 = connected, 401 = key issue
  });

  it("Gooten API is reachable", async () => {
    // Gooten uses a public API for product catalog
    const res = await fetch("https://api.gooten.com/api/v/1/source/api/productvariants/");
    // Just verify the host responds — may return 400 without recipe_id
    expect(res.status).toBeLessThan(500);
  });

  it("Prodigi API is reachable", async () => {
    const res = await fetch("https://api.prodigi.com/v4.0/products");
    // May return 401 without auth — that still proves the API is up
    expect(res.status).toBeLessThan(500);
  });
});
```

**Step 4: Run smoke tests**

Run: `pnpm test:smoke`
Expected: Tests pass or skip (tests gracefully skip when API keys aren't configured)

**Step 5: Commit**

```bash
git add tests/smoke/
git commit -m "test: add smoke tests for integrations, infrastructure, fulfillment providers"
```

---

### Task 7: API contract tests — auth, products, cart

**Files:**
- Create: `tests/api/helpers/api-client.ts`
- Create: `tests/api/helpers/auth-helper.ts`
- Create: `tests/api/auth.api.test.ts`
- Create: `tests/api/products.api.test.ts`
- Create: `tests/api/cart.api.test.ts`
- Reference: `src/contracts/auth.contract.ts`
- Reference: `src/contracts/products.contract.ts`
- Reference: `src/contracts/cart.contract.ts`

**Step 1: Create API client helper**

Create `tests/api/helpers/api-client.ts`:

```typescript
import { requireEnv } from "../../setup/test-env";

const BASE_URL = requireEnv("BASE_URL");

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  cookies?: string;
}

export async function apiRequest(path: string, options: RequestOptions = {}) {
  const { method = "GET", body, headers = {}, cookies } = options;

  const fetchHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };

  if (cookies) {
    fetchHeaders["Cookie"] = cookies;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: fetchHeaders,
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });

  return {
    status: res.status,
    headers: res.headers,
    json: () => res.json(),
    text: () => res.text(),
    cookies: res.headers.get("set-cookie"),
  };
}
```

**Step 2: Create auth helper**

Create `tests/api/helpers/auth-helper.ts`:

```typescript
import { apiRequest } from "./api-client";
import { TEST_ENV } from "../../setup/test-env";

export async function loginAsTestUser(): Promise<string> {
  const res = await apiRequest("/api/auth/login", {
    method: "POST",
    body: {
      email: TEST_ENV.TEST_USER_EMAIL,
      password: TEST_ENV.TEST_USER_PASSWORD,
    },
  });

  if (res.status !== 200) {
    throw new Error(`Login failed with status ${res.status}`);
  }

  // Extract auth cookie
  const cookie = res.cookies;
  if (!cookie) throw new Error("No auth cookie returned from login");
  return cookie;
}

export async function loginAsAdmin(): Promise<string> {
  const res = await apiRequest("/api/auth/login", {
    method: "POST",
    body: {
      email: TEST_ENV.TEST_ADMIN_EMAIL,
      password: TEST_ENV.TEST_ADMIN_PASSWORD,
    },
  });

  if (res.status !== 200) {
    throw new Error(`Admin login failed with status ${res.status}`);
  }

  const cookie = res.cookies;
  if (!cookie) throw new Error("No auth cookie returned from admin login");
  return cookie;
}
```

**Step 3: Create auth API tests**

Create `tests/api/auth.api.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { apiRequest } from "./helpers/api-client";
import { TEST_ENV } from "../setup/test-env";

describe("Auth API", () => {
  it("POST /api/auth/login returns user on valid credentials", async () => {
    const email = TEST_ENV.TEST_USER_EMAIL;
    const password = TEST_ENV.TEST_USER_PASSWORD;
    if (!email || !password) return;

    const res = await apiRequest("/api/auth/login", {
      method: "POST",
      body: { email, password },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("id");
    expect(body).toHaveProperty("email");
    expect(body).toHaveProperty("name");
  });

  it("POST /api/auth/login returns 401 on bad credentials", async () => {
    const res = await apiRequest("/api/auth/login", {
      method: "POST",
      body: { email: "nobody@example.com", password: "WrongPass123" },
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  it("GET /api/auth/me returns 401 without auth cookie", async () => {
    const res = await apiRequest("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("GET /api/auth/me returns user with valid auth cookie", async () => {
    const email = TEST_ENV.TEST_USER_EMAIL;
    const password = TEST_ENV.TEST_USER_PASSWORD;
    if (!email || !password) return;

    // Login first
    const loginRes = await apiRequest("/api/auth/login", {
      method: "POST",
      body: { email, password },
    });
    const cookie = loginRes.cookies ?? "";

    // Fetch me
    const meRes = await apiRequest("/api/auth/me", { cookies: cookie });
    expect(meRes.status).toBe(200);
    const body = await meRes.json();
    expect(body.email).toBe(email);
  });
});
```

**Step 4: Create products API tests**

Create `tests/api/products.api.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { apiRequest } from "./helpers/api-client";

describe("Products API", () => {
  it("GET /api/products returns paginated product list", async () => {
    const res = await apiRequest("/api/products?page=1&limit=5");

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("products");
    expect(body).toHaveProperty("total");
    expect(body).toHaveProperty("page");
    expect(body).toHaveProperty("limit");
    expect(Array.isArray(body.products)).toBe(true);

    if (body.products.length > 0) {
      const product = body.products[0];
      expect(product).toHaveProperty("id");
      expect(product).toHaveProperty("name");
      expect(product).toHaveProperty("slug");
      expect(product).toHaveProperty("priceRange");
    }
  });

  it("GET /api/collections returns collection list", async () => {
    const res = await apiRequest("/api/collections?page=1&limit=5");

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("collections");
    expect(Array.isArray(body.collections)).toBe(true);
  });
});
```

**Step 5: Create cart API tests**

Create `tests/api/cart.api.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { apiRequest } from "./helpers/api-client";
import { loginAsTestUser } from "./helpers/auth-helper";
import { TEST_ENV } from "../setup/test-env";

describe("Cart API", () => {
  it("GET /api/cart returns 401 without auth", async () => {
    const res = await apiRequest("/api/cart");
    expect(res.status).toBe(401);
  });

  it("GET /api/cart returns cart shape when authenticated", async () => {
    if (!TEST_ENV.TEST_USER_PASSWORD) return;

    const cookie = await loginAsTestUser();
    const res = await apiRequest("/api/cart", { cookies: cookie });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("id");
    expect(body).toHaveProperty("items");
    expect(body).toHaveProperty("subtotal");
    expect(Array.isArray(body.items)).toBe(true);
  });
});
```

**Step 6: Run API tests**

Run: `pnpm test:api`
Expected: PASS (tests that require credentials skip gracefully when env vars are missing)

**Step 7: Commit**

```bash
git add tests/api/
git commit -m "test: add API contract tests for auth, products, cart"
```

---

### Task 8: Playwright E2E setup and storefront tests

**Files:**
- Create: `tests/e2e/playwright.config.ts`
- Create: `tests/e2e/storefront/homepage.spec.ts`
- Create: `tests/e2e/storefront/product-browse.spec.ts`
- Create: `tests/e2e/storefront/auth-flow.spec.ts`

**Step 1: Install Playwright browsers**

Run:
```bash
pnpm exec playwright install chromium
```

**Step 2: Create Playwright config**

Create `tests/e2e/playwright.config.ts`:

```typescript
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:8787",
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
  ],
  outputDir: "../../output/playwright",
});
```

**Step 3: Create homepage E2E test**

Create `tests/e2e/storefront/homepage.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test("loads and displays header navigation", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/petm8/i);
    await expect(page.locator("header")).toBeVisible();
    await expect(page.locator('a[href="/products"]')).toBeVisible();
  });

  test("has working navigation to products", async ({ page }) => {
    await page.goto("/");
    await page.click('a[href="/products"]');
    await expect(page).toHaveURL(/\/products/);
  });
});
```

**Step 4: Create product browse E2E test**

Create `tests/e2e/storefront/product-browse.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";

test.describe("Product browsing", () => {
  test("product list page shows products", async ({ page }) => {
    await page.goto("/products");
    await expect(page.locator("h1, h2")).toContainText(/product/i);
  });

  test("clicking a product navigates to detail page", async ({ page }) => {
    await page.goto("/products");
    // Click the first product link (adjust selector based on actual markup)
    const firstProduct = page.locator('a[href*="/products/"]').first();
    if (await firstProduct.isVisible()) {
      await firstProduct.click();
      await expect(page).toHaveURL(/\/products\/.+/);
    }
  });
});
```

**Step 5: Create auth flow E2E test**

Create `tests/e2e/storefront/auth-flow.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";

test.describe("Auth flow", () => {
  test("login page renders form fields", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("register page renders form fields", async ({ page }) => {
    await page.goto("/register");
    await expect(page.locator('input[name="name"], input[placeholder*="name" i]')).toBeVisible();
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("login with invalid credentials shows error", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"], input[name="email"]', "fake@example.com");
    await page.fill('input[type="password"]', "WrongPassword1");
    await page.click('button[type="submit"]');
    // Expect some error indication (text, alert, or class change)
    await expect(page.locator("text=/invalid|error|incorrect/i")).toBeVisible({ timeout: 5000 });
  });
});
```

**Step 6: Run E2E tests**

Run: `BASE_URL=https://petm8.io pnpm test:e2e`
Expected: Tests run in chromium, pass if production is serving pages

**Step 7: Commit**

```bash
git add tests/e2e/
git commit -m "test: add Playwright E2E tests for storefront pages and auth flow"
```

---

### Task 9: Playwright E2E — admin pages

**Files:**
- Create: `tests/e2e/admin/dashboard.spec.ts`
- Create: `tests/e2e/admin/orders.spec.ts`

**Step 1: Create admin dashboard E2E test**

Create `tests/e2e/admin/dashboard.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || "";
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || "";

test.describe("Admin dashboard", () => {
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, "Admin credentials not configured");

  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto("/login");
    await page.fill('input[type="email"], input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL("**/admin/**", { timeout: 10000 }).catch(() => {
      // May redirect elsewhere — navigate manually
    });
  });

  test("admin dashboard loads", async ({ page }) => {
    await page.goto("/admin/dashboard");
    await expect(page.locator("body")).not.toContainText("404");
  });

  test("admin orders page loads", async ({ page }) => {
    await page.goto("/admin/orders");
    await expect(page.locator("body")).not.toContainText("404");
  });

  test("admin fulfillment page loads", async ({ page }) => {
    await page.goto("/admin/fulfillment");
    await expect(page.locator("body")).not.toContainText("404");
  });

  test("admin analytics page loads", async ({ page }) => {
    await page.goto("/admin/analytics");
    await expect(page.locator("body")).not.toContainText("404");
  });
});
```

**Step 2: Run admin E2E tests**

Run: `TEST_ADMIN_EMAIL=admin@petm8.io TEST_ADMIN_PASSWORD=xxx pnpm test:e2e`
Expected: PASS or SKIP

**Step 3: Commit**

```bash
git add tests/e2e/admin/
git commit -m "test: add Playwright E2E tests for admin dashboard pages"
```

---

### Task 10: Integration tests — repositories against dev DB

**Files:**
- Create: `tests/integration/repositories/user.repository.test.ts`
- Create: `tests/integration/repositories/product.repository.test.ts`
- Reference: `src/infrastructure/repositories/user.repository.ts`
- Reference: `src/infrastructure/repositories/product.repository.ts`

**Step 1: Read the repository implementations to understand method signatures**

Read files:
- `src/infrastructure/repositories/user.repository.ts`
- `src/infrastructure/repositories/product.repository.ts`

**Step 2: Create user repository integration test**

Create `tests/integration/repositories/user.repository.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from "vitest";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { TEST_ENV } from "../../setup/test-env";

// This test requires DATABASE_URL to be set
const skip = !TEST_ENV.DATABASE_URL;

describe.skipIf(skip)("UserRepository integration", () => {
  let db: ReturnType<typeof drizzle>;

  beforeAll(async () => {
    const sql = neon(TEST_ENV.DATABASE_URL);
    db = drizzle(sql);
  });

  it("can query users table", async () => {
    // Simple connectivity test — verify the table exists and is queryable
    const result = await db.execute("SELECT COUNT(*) as count FROM users");
    expect(Number(result.rows[0].count)).toBeGreaterThanOrEqual(0);
  });
});
```

**Step 3: Create product repository integration test**

Create `tests/integration/repositories/product.repository.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from "vitest";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { TEST_ENV } from "../../setup/test-env";

const skip = !TEST_ENV.DATABASE_URL;

describe.skipIf(skip)("ProductRepository integration", () => {
  let db: ReturnType<typeof drizzle>;

  beforeAll(async () => {
    const sql = neon(TEST_ENV.DATABASE_URL);
    db = drizzle(sql);
  });

  it("can query products table", async () => {
    const result = await db.execute("SELECT COUNT(*) as count FROM products");
    expect(Number(result.rows[0].count)).toBeGreaterThanOrEqual(0);
  });

  it("can query product_variants table", async () => {
    const result = await db.execute("SELECT COUNT(*) as count FROM product_variants");
    expect(Number(result.rows[0].count)).toBeGreaterThanOrEqual(0);
  });
});
```

**Step 4: Run integration tests**

Run: `pnpm test:integration`
Expected: PASS if DATABASE_URL is set, SKIP otherwise

**Step 5: Commit**

```bash
git add tests/integration/
git commit -m "test: add integration tests for user and product repositories"
```

---

### Task 11: Add output/ and playwright artifacts to .gitignore, final verification

**Files:**
- Modify: `.gitignore`

**Step 1: Update .gitignore with test output paths**

Append to `.gitignore`:
```
output/playwright/
tests/e2e/test-results/
```

**Step 2: Run full test suite to verify everything works**

Run each layer:
```bash
pnpm test:unit
pnpm test:smoke  # needs BASE_URL
pnpm test:api    # needs BASE_URL
pnpm test:integration  # needs DATABASE_URL
pnpm test:e2e    # needs BASE_URL + Playwright browsers
```

**Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore: add test output paths to gitignore"
```

**Step 4: Final commit — all test infrastructure**

Verify `pnpm test:unit` passes (the only layer with no external dependencies), then:

```bash
git add -A
git commit -m "feat: complete multi-layer testing infrastructure (vitest + playwright)"
```
