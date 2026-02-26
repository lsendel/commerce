# Admin Integration Management — Design Document

## Overview

Full admin integration management system for petm8.io: platform-global config with per-store overrides, encrypted secret storage (AES-256-GCM), verification on save, and periodic health checks. DDD architecture with bounded context in Platform domain.

## Architecture Decisions

1. **Tabbed Integration Hub** — two pages (platform admin + per-store), 5 tabs: Payments, Fulfillment, AI, Email, Infrastructure
2. **AES-256-GCM** via Web Crypto SubtleCrypto — `ENCRYPTION_KEY` in `.dev.vars` / CF Worker Secrets
3. **Env-first secret resolution** — check env vars first (cheapest), then DB store override, then DB platform global
4. **Platform globals + store overrides** — DB layer for stores that bring their own keys
5. **Verify on save + 15-min health cron** — immediate feedback + drift detection
5. **Infrastructure bindings** (Neon, R2, Queues, Workers AI) — read-only status cards, no DB storage
6. **Backward-compatible migration** — adapters fall back to env vars if no DB config exists

## Domain Model (Platform Bounded Context)

### Entities

```typescript
// src/domain/platform/integration.entity.ts
interface PlatformIntegration {
  id: string;
  storeId: string | null;          // null = platform global
  provider: IntegrationProvider;
  enabled: boolean;
  config: Record<string, unknown>;  // non-secret settings (jsonb)
  status: IntegrationStatus;
  statusMessage: string | null;
  lastVerifiedAt: Date | null;
  lastSyncAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface IntegrationSecret {
  id: string;
  integrationId: string;
  key: string;                      // "api_key", "webhook_secret", "publishable_key"
  encryptedValue: string;           // AES-256-GCM ciphertext, base64
  iv: string;                       // 12-byte IV, base64
  createdAt: Date;
  updatedAt: Date;
}

type IntegrationProvider =
  | 'stripe' | 'printful' | 'gemini' | 'resend'
  | 'gooten' | 'prodigi' | 'shapeways';

type IntegrationStatus =
  | 'connected' | 'disconnected' | 'error' | 'pending_verification';
```

### Repository Port

```typescript
// src/domain/platform/integration.repository.ts
interface IntegrationRepository {
  findByProvider(provider: IntegrationProvider, storeId?: string | null): Promise<PlatformIntegration | null>;
  findAllByStore(storeId?: string | null): Promise<PlatformIntegration[]>;
  upsert(integration: Omit<PlatformIntegration, 'id' | 'createdAt' | 'updatedAt'>): Promise<PlatformIntegration>;
  delete(provider: IntegrationProvider, storeId?: string | null): Promise<void>;
  updateStatus(id: string, status: IntegrationStatus, message?: string | null): Promise<void>;
  findAllEnabled(): Promise<PlatformIntegration[]>;
}

interface IntegrationSecretRepository {
  findByIntegrationAndKey(integrationId: string, key: string): Promise<IntegrationSecret | null>;
  findAllByIntegration(integrationId: string): Promise<IntegrationSecret[]>;
  upsert(secret: Omit<IntegrationSecret, 'id' | 'createdAt' | 'updatedAt'>): Promise<IntegrationSecret>;
  deleteByIntegration(integrationId: string): Promise<void>;
}
```

## Database Schema

Two new tables in `src/infrastructure/db/schema.ts`:

```sql
-- platform_integrations
id               uuid PK DEFAULT gen_random_uuid()
store_id         uuid FK NULLABLE → stores.id
provider         text NOT NULL     -- enum enforced in app
enabled          boolean DEFAULT true
config           jsonb DEFAULT '{}'
status           text DEFAULT 'disconnected'
status_message   text NULLABLE
last_verified_at timestamp NULLABLE
last_sync_at     timestamp NULLABLE
created_at       timestamp DEFAULT now()
updated_at       timestamp DEFAULT now()
UNIQUE(store_id, provider)  -- one config per provider per store

-- integration_secrets
id               uuid PK DEFAULT gen_random_uuid()
integration_id   uuid FK → platform_integrations.id ON DELETE CASCADE
key              text NOT NULL
encrypted_value  text NOT NULL
iv               text NOT NULL
created_at       timestamp DEFAULT now()
updated_at       timestamp DEFAULT now()
UNIQUE(integration_id, key)
```

### Resolution Query

```sql
SELECT * FROM platform_integrations
WHERE provider = $1 AND (store_id = $2 OR store_id IS NULL)
ORDER BY store_id NULLS LAST
LIMIT 1;
```

## Encryption Service

`src/infrastructure/crypto/secrets.service.ts`

- AES-256-GCM via `crypto.subtle`
- `ENCRYPTION_KEY`: 32-byte key, base64-encoded, from env
- 12-byte random IV per encryption, never reused
- Functions: `encryptSecret()`, `decryptSecret()`, `generateEncryptionKey()`

### Secret Resolution Order

```
resolveSecret(provider, key, storeId, env):
  1. Check env var (e.g., env.STRIPE_SECRET_KEY) — cheapest, no I/O
     Note: CF Worker Secrets merge into env at runtime, so this covers both
  2. If env var absent AND storeId provided:
     Check DB for store override (provider, key, storeId) → decrypt
  3. If still absent:
     Check DB for platform global (provider, key, storeId=null) → decrypt
  4. Return null if nothing found
```

Env vars are the primary source. DB is the override layer for multi-tenant key management.

## Use Cases (Application Layer)

All in `src/application/platform/`:

| Use Case | Responsibility |
|---|---|
| `upsert-integration.usecase.ts` | Create/update integration config + secrets, trigger verify |
| `delete-integration.usecase.ts` | Remove integration (store override or global) |
| `verify-integration.usecase.ts` | Run provider-specific verification call |
| `resolve-secret.usecase.ts` | Env var → DB store override → DB platform global |
| `list-integrations.usecase.ts` | List integrations for a store or platform |
| `run-health-checks.usecase.ts` | Verify all enabled integrations, update status |
| `check-infrastructure.usecase.ts` | Runtime health check for Neon, R2, Queues, Workers AI |

## Provider Verification

`src/domain/platform/integration-verifier.port.ts` — port
`src/infrastructure/integrations/verifiers/` — adapters per provider

| Provider | Verify Call |
|---|---|
| Stripe | `GET /v1/balance` |
| Printful | `GET /store` |
| Gemini | `GET /v1beta/models` |
| Resend | `GET /domains` |
| Gooten | `GET /v1/source/partners` |
| Prodigi | `GET /v4.0/orders?limit=1` |
| Shapeways | `GET /oauth2/token_info` |

## API Routes

`src/routes/api/integrations.routes.ts`

### Platform Admin (super_admin)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/integrations` | List all platform globals |
| PUT | `/api/integrations/:provider` | Upsert platform global |
| DELETE | `/api/integrations/:provider` | Remove platform global |
| POST | `/api/integrations/:provider/verify` | Trigger verification |
| POST | `/api/integrations/:provider/action` | Manual trigger (sync, test email) |
| GET | `/api/integrations/health` | Infrastructure health checks |

### Per-Store (store owner/admin)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/integrations/store/:storeId` | List with inherited globals |
| PUT | `/api/integrations/store/:storeId/:provider` | Upsert store override |
| DELETE | `/api/integrations/store/:storeId/:provider` | Remove override |
| POST | `/api/integrations/store/:storeId/:provider/verify` | Verify store key |

## UI Pages

### Platform Admin: `/admin/integrations`

`src/routes/pages/admin/integrations.page.tsx` — super_admin only

Tabs: Payments | Fulfillment | AI | Email | Infrastructure

### Per-Store: `/platform/stores/:id/integrations`

`src/routes/pages/platform/store-integrations.page.tsx`

Tabs: Payments | Fulfillment | AI | Email

### Shared Components (`src/components/integrations/`)

- `integration-tabs.tsx` — tab bar
- `integration-card.tsx` — status, masked keys, config, actions
- `secret-input.tsx` — masked input with show/hide
- `status-badge.tsx` — green/yellow/red dot + label
- `config-form.tsx` — per-provider non-secret settings

### Client JS

`public/scripts/admin-integrations.js` — tab switching, form submit, verify/test actions

## Scheduled Job

`src/scheduled/integration-health.job.ts` — every 15 minutes

Queries all enabled integrations, runs provider verify, updates status. Enqueues notification if status changes from connected to error.

## Adapter Migration

Existing adapters updated to use `resolveSecret()` with env-first resolution:

Resolution: env var (+ CF Worker Secrets) → DB store override → DB platform global → null

| Adapter File | Current | New |
|---|---|---|
| `stripe/stripe.client.ts` | `env.STRIPE_SECRET_KEY` | `resolveSecret('stripe', 'api_key', storeId, env)` |
| `stripe/webhook.handler.ts` | `env.STRIPE_WEBHOOK_SECRET` | `resolveSecret('stripe', 'webhook_secret', storeId, env)` |
| `printful/printful.client.ts` | `env.PRINTFUL_API_KEY` | `resolveSecret('printful', 'api_key', storeId, env)` |
| `printful/webhook.handler.ts` | `env.PRINTFUL_WEBHOOK_SECRET` | `resolveSecret('printful', 'webhook_secret', storeId, env)` |
| `ai/gemini.client.ts` | `env.GEMINI_API_KEY` | `resolveSecret('gemini', 'api_key', storeId, env)` |
| `notifications/email.adapter.ts` | `env.RESEND_API_KEY` | `resolveSecret('resend', 'api_key', storeId, env)` |
| `fulfillment/*.provider.ts` | runtime param | `resolveSecret(providerType, 'api_key', storeId, env)` |

If env var exists, no DB query is made — zero overhead for the common case.

## Config Changes

- `.env.example` — add `ENCRYPTION_KEY`
- `wrangler.toml` — add 15-min cron trigger
- `src/env.ts` — add `ENCRYPTION_KEY` to env type
