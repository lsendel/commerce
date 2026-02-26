# Admin Integration Management — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a full admin integration management system with encrypted secret storage, env-first resolution, per-store overrides, verification on save, periodic health checks, and a tabbed admin UI.

**Architecture:** DDD bounded context in Platform domain. Two new DB tables (`platform_integrations`, `integration_secrets`). AES-256-GCM encryption via Web Crypto. Env-first secret resolution (env var → DB store override → DB platform global). Hono JSX server-rendered admin pages with Tailwind. Backward-compatible adapter migration — env vars still work if no DB config exists.

**Tech Stack:** Hono JSX, Drizzle ORM, Web Crypto (SubtleCrypto), Tailwind CSS, vanilla JS

---

## Task 1: Database Schema — New Enums and Tables

**Files:**
- Modify: `src/infrastructure/db/schema.ts:139-144` (after existing enums, before Platform Context at line 153)

**Step 1: Add new enums after `fulfillmentProviderTypeEnum` (line 144)**

Add these enums after line 151 (after `storeBillingStatusEnum`):

```typescript
export const integrationProviderEnum = pgEnum("integration_provider", [
  "stripe",
  "printful",
  "gemini",
  "resend",
  "gooten",
  "prodigi",
  "shapeways",
]);

export const integrationStatusEnum = pgEnum("integration_status", [
  "connected",
  "disconnected",
  "error",
  "pending_verification",
]);
```

**Step 2: Add `platform_integrations` and `integration_secrets` tables**

Add after the last table in schema.ts (after `venuesRelations` at line ~1433):

```typescript
// ─── Integration Management Context ─────────────────────────────────────────

export const platformIntegrations = pgTable(
  "platform_integrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id").references(() => stores.id),
    provider: integrationProviderEnum("provider").notNull(),
    enabled: boolean("enabled").default(true),
    config: jsonb("config").default({}),
    status: integrationStatusEnum("status").default("disconnected"),
    statusMessage: text("status_message"),
    lastVerifiedAt: timestamp("last_verified_at"),
    lastSyncAt: timestamp("last_sync_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    storeProviderIdx: uniqueIndex("platform_integrations_store_provider_idx").on(
      table.storeId,
      table.provider,
    ),
  }),
);

export const platformIntegrationsRelations = relations(
  platformIntegrations,
  ({ one, many }) => ({
    store: one(stores, {
      fields: [platformIntegrations.storeId],
      references: [stores.id],
    }),
    secrets: many(integrationSecrets),
  }),
);

export const integrationSecrets = pgTable(
  "integration_secrets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    integrationId: uuid("integration_id")
      .notNull()
      .references(() => platformIntegrations.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    encryptedValue: text("encrypted_value").notNull(),
    iv: text("iv").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    integrationKeyIdx: uniqueIndex("integration_secrets_integration_key_idx").on(
      table.integrationId,
      table.key,
    ),
  }),
);

export const integrationSecretsRelations = relations(
  integrationSecrets,
  ({ one }) => ({
    integration: one(platformIntegrations, {
      fields: [integrationSecrets.integrationId],
      references: [platformIntegrations.id],
    }),
  }),
);
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: PASS (no new errors)

**Step 4: Commit**

```bash
git add src/infrastructure/db/schema.ts
git commit -m "feat(schema): add platform_integrations and integration_secrets tables"
```

---

## Task 2: Domain Entities and Repository Ports

**Files:**
- Create: `src/domain/platform/integration.entity.ts`
- Create: `src/domain/platform/integration.repository.ts`

**Step 1: Create domain entity types**

```typescript
// src/domain/platform/integration.entity.ts

export type IntegrationProvider =
  | "stripe"
  | "printful"
  | "gemini"
  | "resend"
  | "gooten"
  | "prodigi"
  | "shapeways";

export type IntegrationStatus =
  | "connected"
  | "disconnected"
  | "error"
  | "pending_verification";

export interface PlatformIntegration {
  id: string;
  storeId: string | null;
  provider: IntegrationProvider;
  enabled: boolean;
  config: Record<string, unknown>;
  status: IntegrationStatus;
  statusMessage: string | null;
  lastVerifiedAt: Date | null;
  lastSyncAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IntegrationSecret {
  id: string;
  integrationId: string;
  key: string;
  encryptedValue: string;
  iv: string;
  createdAt: Date;
  updatedAt: Date;
}

/** Map of provider → env var names for env-first resolution */
export const PROVIDER_ENV_MAP: Record<IntegrationProvider, Record<string, string>> = {
  stripe: {
    api_key: "STRIPE_SECRET_KEY",
    webhook_secret: "STRIPE_WEBHOOK_SECRET",
    publishable_key: "STRIPE_PUBLISHABLE_KEY",
  },
  printful: {
    api_key: "PRINTFUL_API_KEY",
    webhook_secret: "PRINTFUL_WEBHOOK_SECRET",
  },
  gemini: {
    api_key: "GEMINI_API_KEY",
  },
  resend: {
    api_key: "RESEND_API_KEY",
  },
  gooten: {},
  prodigi: {},
  shapeways: {},
};
```

**Step 2: Create repository port**

```typescript
// src/domain/platform/integration.repository.ts

import type {
  PlatformIntegration,
  IntegrationProvider,
  IntegrationStatus,
  IntegrationSecret,
} from "./integration.entity";

export interface IntegrationRepository {
  findByProvider(
    provider: IntegrationProvider,
    storeId?: string | null,
  ): Promise<PlatformIntegration | null>;
  findAllByStore(storeId?: string | null): Promise<PlatformIntegration[]>;
  findAllEnabled(): Promise<PlatformIntegration[]>;
  upsert(
    data: Omit<PlatformIntegration, "id" | "createdAt" | "updatedAt">,
  ): Promise<PlatformIntegration>;
  delete(provider: IntegrationProvider, storeId?: string | null): Promise<void>;
  updateStatus(
    id: string,
    status: IntegrationStatus,
    message?: string | null,
  ): Promise<void>;
  updateLastVerified(id: string): Promise<void>;
  updateLastSync(id: string): Promise<void>;
}

export interface IntegrationSecretRepository {
  findByIntegrationAndKey(
    integrationId: string,
    key: string,
  ): Promise<IntegrationSecret | null>;
  findAllByIntegration(integrationId: string): Promise<IntegrationSecret[]>;
  upsert(
    data: Omit<IntegrationSecret, "id" | "createdAt" | "updatedAt">,
  ): Promise<IntegrationSecret>;
  deleteByIntegration(integrationId: string): Promise<void>;
}
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```bash
git add src/domain/platform/
git commit -m "feat(domain): add integration entity types and repository ports"
```

---

## Task 3: Encryption Service

**Files:**
- Create: `src/infrastructure/crypto/secrets.service.ts`
- Modify: `src/env.ts` (add `ENCRYPTION_KEY`)
- Modify: `.env.example` (add `ENCRYPTION_KEY`)

**Step 1: Create the encryption service**

```typescript
// src/infrastructure/crypto/secrets.service.ts

export interface EncryptedSecret {
  encryptedValue: string; // base64
  iv: string;             // base64
}

export async function encryptSecret(
  plaintext: string,
  encryptionKey: string,
): Promise<EncryptedSecret> {
  const keyBytes = base64ToBytes(encryptionKey);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    encoded,
  );

  return {
    encryptedValue: bytesToBase64(new Uint8Array(ciphertext)),
    iv: bytesToBase64(iv),
  };
}

export async function decryptSecret(
  encryptedValue: string,
  iv: string,
  encryptionKey: string,
): Promise<string> {
  const keyBytes = base64ToBytes(encryptionKey);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );

  const cipherBytes = base64ToBytes(encryptedValue);
  const ivBytes = base64ToBytes(iv);

  const plainBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBytes },
    cryptoKey,
    cipherBytes,
  );

  return new TextDecoder().decode(plainBuffer);
}

export function generateEncryptionKey(): string {
  const key = crypto.getRandomValues(new Uint8Array(32));
  return bytesToBase64(key);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
```

**Step 2: Add `ENCRYPTION_KEY` to `src/env.ts:1-37`**

After line 29 (`RESEND_API_KEY?: string;`), add:

```typescript
  // Encryption
  ENCRYPTION_KEY?: string;
```

**Step 3: Add `ENCRYPTION_KEY` to `.env.example`**

At the end of the file, add:

```
# Encryption (for admin integration secrets — generate with: npx tsx scripts/generate-encryption-key.ts)
ENCRYPTION_KEY=
```

**Step 4: Create key generation helper script**

```typescript
// scripts/generate-encryption-key.ts
const key = crypto.getRandomValues(new Uint8Array(32));
let binary = "";
for (let i = 0; i < key.length; i++) {
  binary += String.fromCharCode(key[i]);
}
console.log("ENCRYPTION_KEY=" + btoa(binary));
```

**Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 6: Commit**

```bash
git add src/infrastructure/crypto/ src/env.ts .env.example scripts/generate-encryption-key.ts
git commit -m "feat(crypto): add AES-256-GCM encryption service for integration secrets"
```

---

## Task 4: Infrastructure — Repository Implementations

**Files:**
- Create: `src/infrastructure/repositories/integration.repository.ts`

**Step 1: Implement Drizzle repositories**

```typescript
// src/infrastructure/repositories/integration.repository.ts

import { eq, and, isNull } from "drizzle-orm";
import type { Database } from "../db/client";
import {
  platformIntegrations,
  integrationSecrets,
} from "../db/schema";
import type {
  IntegrationRepository,
  IntegrationSecretRepository,
} from "../../domain/platform/integration.repository";
import type {
  PlatformIntegration,
  IntegrationProvider,
  IntegrationStatus,
  IntegrationSecret,
} from "../../domain/platform/integration.entity";

export class DrizzleIntegrationRepository implements IntegrationRepository {
  constructor(private db: Database) {}

  async findByProvider(
    provider: IntegrationProvider,
    storeId?: string | null,
  ): Promise<PlatformIntegration | null> {
    const condition = storeId
      ? and(
          eq(platformIntegrations.provider, provider),
          eq(platformIntegrations.storeId, storeId),
        )
      : and(
          eq(platformIntegrations.provider, provider),
          isNull(platformIntegrations.storeId),
        );

    const rows = await this.db
      .select()
      .from(platformIntegrations)
      .where(condition)
      .limit(1);

    return rows[0] ? this.toDomain(rows[0]) : null;
  }

  async findAllByStore(storeId?: string | null): Promise<PlatformIntegration[]> {
    const condition = storeId
      ? eq(platformIntegrations.storeId, storeId)
      : isNull(platformIntegrations.storeId);

    const rows = await this.db
      .select()
      .from(platformIntegrations)
      .where(condition);

    return rows.map((r) => this.toDomain(r));
  }

  async findAllEnabled(): Promise<PlatformIntegration[]> {
    const rows = await this.db
      .select()
      .from(platformIntegrations)
      .where(eq(platformIntegrations.enabled, true));

    return rows.map((r) => this.toDomain(r));
  }

  async upsert(
    data: Omit<PlatformIntegration, "id" | "createdAt" | "updatedAt">,
  ): Promise<PlatformIntegration> {
    const rows = await this.db
      .insert(platformIntegrations)
      .values({
        storeId: data.storeId,
        provider: data.provider,
        enabled: data.enabled,
        config: data.config,
        status: data.status,
        statusMessage: data.statusMessage,
        lastVerifiedAt: data.lastVerifiedAt,
        lastSyncAt: data.lastSyncAt,
      })
      .onConflictDoUpdate({
        target: [platformIntegrations.storeId, platformIntegrations.provider],
        set: {
          enabled: data.enabled,
          config: data.config,
          status: data.status,
          statusMessage: data.statusMessage,
          updatedAt: new Date(),
        },
      })
      .returning();

    return this.toDomain(rows[0]);
  }

  async delete(provider: IntegrationProvider, storeId?: string | null): Promise<void> {
    const condition = storeId
      ? and(
          eq(platformIntegrations.provider, provider),
          eq(platformIntegrations.storeId, storeId),
        )
      : and(
          eq(platformIntegrations.provider, provider),
          isNull(platformIntegrations.storeId),
        );

    await this.db.delete(platformIntegrations).where(condition);
  }

  async updateStatus(
    id: string,
    status: IntegrationStatus,
    message?: string | null,
  ): Promise<void> {
    await this.db
      .update(platformIntegrations)
      .set({
        status,
        statusMessage: message ?? null,
        updatedAt: new Date(),
      })
      .where(eq(platformIntegrations.id, id));
  }

  async updateLastVerified(id: string): Promise<void> {
    await this.db
      .update(platformIntegrations)
      .set({ lastVerifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(platformIntegrations.id, id));
  }

  async updateLastSync(id: string): Promise<void> {
    await this.db
      .update(platformIntegrations)
      .set({ lastSyncAt: new Date(), updatedAt: new Date() })
      .where(eq(platformIntegrations.id, id));
  }

  private toDomain(row: any): PlatformIntegration {
    return {
      id: row.id,
      storeId: row.storeId,
      provider: row.provider,
      enabled: row.enabled,
      config: (row.config ?? {}) as Record<string, unknown>,
      status: row.status,
      statusMessage: row.statusMessage,
      lastVerifiedAt: row.lastVerifiedAt,
      lastSyncAt: row.lastSyncAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

export class DrizzleIntegrationSecretRepository
  implements IntegrationSecretRepository
{
  constructor(private db: Database) {}

  async findByIntegrationAndKey(
    integrationId: string,
    key: string,
  ): Promise<IntegrationSecret | null> {
    const rows = await this.db
      .select()
      .from(integrationSecrets)
      .where(
        and(
          eq(integrationSecrets.integrationId, integrationId),
          eq(integrationSecrets.key, key),
        ),
      )
      .limit(1);

    return rows[0] ? this.toDomain(rows[0]) : null;
  }

  async findAllByIntegration(integrationId: string): Promise<IntegrationSecret[]> {
    const rows = await this.db
      .select()
      .from(integrationSecrets)
      .where(eq(integrationSecrets.integrationId, integrationId));

    return rows.map((r) => this.toDomain(r));
  }

  async upsert(
    data: Omit<IntegrationSecret, "id" | "createdAt" | "updatedAt">,
  ): Promise<IntegrationSecret> {
    const rows = await this.db
      .insert(integrationSecrets)
      .values({
        integrationId: data.integrationId,
        key: data.key,
        encryptedValue: data.encryptedValue,
        iv: data.iv,
      })
      .onConflictDoUpdate({
        target: [integrationSecrets.integrationId, integrationSecrets.key],
        set: {
          encryptedValue: data.encryptedValue,
          iv: data.iv,
          updatedAt: new Date(),
        },
      })
      .returning();

    return this.toDomain(rows[0]);
  }

  async deleteByIntegration(integrationId: string): Promise<void> {
    await this.db
      .delete(integrationSecrets)
      .where(eq(integrationSecrets.integrationId, integrationId));
  }

  private toDomain(row: any): IntegrationSecret {
    return {
      id: row.id,
      integrationId: row.integrationId,
      key: row.key,
      encryptedValue: row.encryptedValue,
      iv: row.iv,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add src/infrastructure/repositories/integration.repository.ts
git commit -m "feat(infra): add Drizzle integration repository implementations"
```

---

## Task 5: Application Layer — Secret Resolution Use Case

**Files:**
- Create: `src/application/platform/resolve-secret.usecase.ts`

This is the core use case that every adapter will call. Env-first resolution.

**Step 1: Implement resolve-secret use case**

```typescript
// src/application/platform/resolve-secret.usecase.ts

import type { IntegrationProvider, PROVIDER_ENV_MAP } from "../../domain/platform/integration.entity";
import { PROVIDER_ENV_MAP as envMap } from "../../domain/platform/integration.entity";
import type { IntegrationRepository, IntegrationSecretRepository } from "../../domain/platform/integration.repository";
import { decryptSecret } from "../../infrastructure/crypto/secrets.service";
import type { Env } from "../../env";

export class ResolveSecretUseCase {
  constructor(
    private integrationRepo: IntegrationRepository,
    private secretRepo: IntegrationSecretRepository,
  ) {}

  /**
   * Resolve a secret for a given provider and key.
   * Order: env var → DB store override → DB platform global → null
   */
  async execute(
    provider: IntegrationProvider,
    key: string,
    env: Env,
    storeId?: string,
  ): Promise<string | null> {
    // 1. Check env var first (cheapest, no I/O)
    const envVarName = envMap[provider]?.[key];
    if (envVarName) {
      const envValue = (env as Record<string, unknown>)[envVarName];
      if (typeof envValue === "string" && envValue.length > 0) {
        return envValue;
      }
    }

    // 2. Check DB store override (if storeId provided)
    if (storeId) {
      const storeValue = await this.resolveFromDb(provider, key, storeId, env);
      if (storeValue) return storeValue;
    }

    // 3. Check DB platform global (storeId = null)
    const globalValue = await this.resolveFromDb(provider, key, null, env);
    if (globalValue) return globalValue;

    return null;
  }

  private async resolveFromDb(
    provider: IntegrationProvider,
    key: string,
    storeId: string | null,
    env: Env,
  ): Promise<string | null> {
    if (!env.ENCRYPTION_KEY) return null;

    const integration = await this.integrationRepo.findByProvider(provider, storeId);
    if (!integration || !integration.enabled) return null;

    const secret = await this.secretRepo.findByIntegrationAndKey(integration.id, key);
    if (!secret) return null;

    return decryptSecret(secret.encryptedValue, secret.iv, env.ENCRYPTION_KEY);
  }
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add src/application/platform/resolve-secret.usecase.ts
git commit -m "feat(usecase): add env-first secret resolution use case"
```

---

## Task 6: Application Layer — Integration CRUD Use Cases

**Files:**
- Create: `src/application/platform/upsert-integration.usecase.ts`
- Create: `src/application/platform/delete-integration.usecase.ts`
- Create: `src/application/platform/list-integrations.usecase.ts`

**Step 1: Upsert integration use case**

```typescript
// src/application/platform/upsert-integration.usecase.ts

import type { IntegrationProvider, IntegrationStatus } from "../../domain/platform/integration.entity";
import type { IntegrationRepository, IntegrationSecretRepository } from "../../domain/platform/integration.repository";
import { encryptSecret } from "../../infrastructure/crypto/secrets.service";

interface UpsertInput {
  provider: IntegrationProvider;
  storeId?: string | null;
  enabled: boolean;
  config: Record<string, unknown>;
  secrets: Record<string, string>; // key → plaintext value
}

export class UpsertIntegrationUseCase {
  constructor(
    private integrationRepo: IntegrationRepository,
    private secretRepo: IntegrationSecretRepository,
  ) {}

  async execute(input: UpsertInput, encryptionKey: string) {
    const integration = await this.integrationRepo.upsert({
      storeId: input.storeId ?? null,
      provider: input.provider,
      enabled: input.enabled,
      config: input.config,
      status: "pending_verification" as IntegrationStatus,
      statusMessage: null,
      lastVerifiedAt: null,
      lastSyncAt: null,
    });

    // Encrypt and store each secret
    for (const [key, plaintext] of Object.entries(input.secrets)) {
      if (!plaintext) continue;
      const encrypted = await encryptSecret(plaintext, encryptionKey);
      await this.secretRepo.upsert({
        integrationId: integration.id,
        key,
        encryptedValue: encrypted.encryptedValue,
        iv: encrypted.iv,
      });
    }

    return integration;
  }
}
```

**Step 2: Delete integration use case**

```typescript
// src/application/platform/delete-integration.usecase.ts

import type { IntegrationProvider } from "../../domain/platform/integration.entity";
import type { IntegrationRepository } from "../../domain/platform/integration.repository";

export class DeleteIntegrationUseCase {
  constructor(private integrationRepo: IntegrationRepository) {}

  async execute(provider: IntegrationProvider, storeId?: string | null) {
    // Secrets are cascade-deleted via FK
    await this.integrationRepo.delete(provider, storeId);
  }
}
```

**Step 3: List integrations use case**

```typescript
// src/application/platform/list-integrations.usecase.ts

import type { PlatformIntegration } from "../../domain/platform/integration.entity";
import type { IntegrationRepository, IntegrationSecretRepository } from "../../domain/platform/integration.repository";
import { decryptSecret } from "../../infrastructure/crypto/secrets.service";

interface IntegrationView extends PlatformIntegration {
  secrets: Record<string, string>; // key → masked value (last 4 chars)
  source: "platform" | "store_override";
}

export class ListIntegrationsUseCase {
  constructor(
    private integrationRepo: IntegrationRepository,
    private secretRepo: IntegrationSecretRepository,
  ) {}

  /** List integrations for platform admin (storeId = null) */
  async listPlatform(): Promise<IntegrationView[]> {
    const integrations = await this.integrationRepo.findAllByStore(null);
    return this.enrichWithMaskedSecrets(integrations, "platform");
  }

  /** List integrations for a store — merges store overrides with platform globals */
  async listForStore(storeId: string, encryptionKey?: string): Promise<IntegrationView[]> {
    const storeIntegrations = await this.integrationRepo.findAllByStore(storeId);
    const platformIntegrations = await this.integrationRepo.findAllByStore(null);

    const result: IntegrationView[] = [];
    const storeProviders = new Set(storeIntegrations.map((i) => i.provider));

    // Store overrides first
    for (const integration of storeIntegrations) {
      const views = await this.enrichWithMaskedSecrets([integration], "store_override");
      result.push(...views);
    }

    // Platform globals for providers the store hasn't overridden
    for (const integration of platformIntegrations) {
      if (!storeProviders.has(integration.provider)) {
        const views = await this.enrichWithMaskedSecrets([integration], "platform");
        result.push(...views);
      }
    }

    return result;
  }

  private async enrichWithMaskedSecrets(
    integrations: PlatformIntegration[],
    source: "platform" | "store_override",
  ): Promise<IntegrationView[]> {
    const views: IntegrationView[] = [];

    for (const integration of integrations) {
      const secrets = await this.secretRepo.findAllByIntegration(integration.id);
      const maskedSecrets: Record<string, string> = {};

      for (const secret of secrets) {
        // Mask: show only last 4 chars
        const lastFour = secret.encryptedValue.slice(-4);
        maskedSecrets[secret.key] = `••••${lastFour}`;
      }

      views.push({ ...integration, secrets: maskedSecrets, source });
    }

    return views;
  }
}
```

**Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 5: Commit**

```bash
git add src/application/platform/upsert-integration.usecase.ts src/application/platform/delete-integration.usecase.ts src/application/platform/list-integrations.usecase.ts
git commit -m "feat(usecase): add integration CRUD use cases"
```

---

## Task 7: Application Layer — Verification Use Cases

**Files:**
- Create: `src/application/platform/verify-integration.usecase.ts`
- Create: `src/application/platform/check-infrastructure.usecase.ts`

**Step 1: Provider verification use case**

```typescript
// src/application/platform/verify-integration.usecase.ts

import type { IntegrationProvider } from "../../domain/platform/integration.entity";
import type { IntegrationRepository, IntegrationSecretRepository } from "../../domain/platform/integration.repository";
import { decryptSecret } from "../../infrastructure/crypto/secrets.service";
import type { Env } from "../../env";
import { ResolveSecretUseCase } from "./resolve-secret.usecase";

interface VerifyResult {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}

type VerifierFn = (apiKey: string) => Promise<VerifyResult>;

const VERIFIERS: Record<IntegrationProvider, VerifierFn> = {
  stripe: async (apiKey) => {
    const res = await fetch("https://api.stripe.com/v1/balance", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return { success: false, message: `Stripe: ${res.status} ${await res.text()}` };
    const data = await res.json() as Record<string, unknown>;
    return { success: true, message: "Stripe connected", details: { livemode: data.livemode } };
  },

  printful: async (apiKey) => {
    const res = await fetch("https://api.printful.com/store", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return { success: false, message: `Printful: ${res.status} ${await res.text()}` };
    const data = await res.json() as { result?: { name?: string } };
    return { success: true, message: "Printful connected", details: { storeName: data.result?.name } };
  },

  gemini: async (apiKey) => {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
    );
    if (!res.ok) return { success: false, message: `Gemini: ${res.status} ${await res.text()}` };
    return { success: true, message: "Gemini connected" };
  },

  resend: async (apiKey) => {
    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return { success: false, message: `Resend: ${res.status} ${await res.text()}` };
    return { success: true, message: "Resend connected" };
  },

  gooten: async (apiKey) => {
    const res = await fetch(`https://api.gooten.com/v1/source/partners?recipeid=${apiKey}`);
    if (!res.ok) return { success: false, message: `Gooten: ${res.status}` };
    return { success: true, message: "Gooten connected" };
  },

  prodigi: async (apiKey) => {
    const res = await fetch("https://api.prodigi.com/v4.0/orders?limit=1", {
      headers: { "X-API-Key": apiKey },
    });
    if (!res.ok) return { success: false, message: `Prodigi: ${res.status}` };
    return { success: true, message: "Prodigi connected" };
  },

  shapeways: async (apiKey) => {
    const res = await fetch("https://api.shapeways.com/oauth2/token_info", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return { success: false, message: `Shapeways: ${res.status}` };
    return { success: true, message: "Shapeways connected" };
  },
};

export class VerifyIntegrationUseCase {
  constructor(
    private integrationRepo: IntegrationRepository,
    private secretRepo: IntegrationSecretRepository,
  ) {}

  async execute(
    provider: IntegrationProvider,
    env: Env,
    storeId?: string,
  ): Promise<VerifyResult> {
    const resolver = new ResolveSecretUseCase(this.integrationRepo, this.secretRepo);
    const apiKey = await resolver.execute(provider, "api_key", env, storeId);

    if (!apiKey) {
      return { success: false, message: "No API key configured" };
    }

    const verifier = VERIFIERS[provider];
    try {
      const result = await verifier(apiKey);

      // Update integration status in DB
      const integration = await this.integrationRepo.findByProvider(
        provider,
        storeId ?? null,
      );
      if (integration) {
        await this.integrationRepo.updateStatus(
          integration.id,
          result.success ? "connected" : "error",
          result.success ? null : result.message,
        );
        if (result.success) {
          await this.integrationRepo.updateLastVerified(integration.id);
        }
      }

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Verification failed";

      const integration = await this.integrationRepo.findByProvider(
        provider,
        storeId ?? null,
      );
      if (integration) {
        await this.integrationRepo.updateStatus(integration.id, "error", message);
      }

      return { success: false, message };
    }
  }
}
```

**Step 2: Infrastructure health check use case**

```typescript
// src/application/platform/check-infrastructure.usecase.ts

import type { Env } from "../../env";
import type { Database } from "../../infrastructure/db/client";

interface InfraHealthResult {
  service: string;
  status: "healthy" | "unhealthy" | "unavailable";
  message: string;
  latencyMs?: number;
}

export class CheckInfrastructureUseCase {
  async execute(env: Env, db: Database): Promise<InfraHealthResult[]> {
    const results: InfraHealthResult[] = [];

    // Neon PostgreSQL
    const neonStart = Date.now();
    try {
      await db.execute(new (await import("drizzle-orm")).sql`SELECT 1`);
      results.push({
        service: "neon",
        status: "healthy",
        message: "Database responding",
        latencyMs: Date.now() - neonStart,
      });
    } catch (err) {
      results.push({
        service: "neon",
        status: "unhealthy",
        message: err instanceof Error ? err.message : "Connection failed",
        latencyMs: Date.now() - neonStart,
      });
    }

    // R2 bucket
    try {
      if (env.IMAGES) {
        await env.IMAGES.head("health-check");
        results.push({ service: "r2", status: "healthy", message: "R2 bucket accessible" });
      } else {
        results.push({ service: "r2", status: "unavailable", message: "IMAGES binding not configured" });
      }
    } catch {
      // head() throws on missing key — that's fine, binding works
      results.push({ service: "r2", status: "healthy", message: "R2 bucket accessible" });
    }

    // Queues
    for (const [name, binding] of [
      ["ai-queue", env.AI_QUEUE],
      ["fulfillment-queue", env.FULFILLMENT_QUEUE],
      ["notification-queue", env.NOTIFICATION_QUEUE],
    ] as const) {
      results.push({
        service: name,
        status: binding ? "healthy" : "unavailable",
        message: binding ? "Queue binding available" : `${name} binding not configured`,
      });
    }

    // Workers AI
    results.push({
      service: "workers-ai",
      status: env.AI ? "healthy" : "unavailable",
      message: env.AI ? "AI binding available" : "AI binding not configured",
    });

    return results;
  }
}
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```bash
git add src/application/platform/verify-integration.usecase.ts src/application/platform/check-infrastructure.usecase.ts
git commit -m "feat(usecase): add integration verification and infrastructure health checks"
```

---

## Task 8: Health Check Scheduled Job

**Files:**
- Create: `src/scheduled/integration-health.job.ts`
- Modify: `src/scheduled/handler.ts:1-40` (add health check to `*/15` cron)

**Step 1: Create integration health job**

```typescript
// src/scheduled/integration-health.job.ts

import type { Env } from "../env";
import { createDb } from "../infrastructure/db/client";
import { DrizzleIntegrationRepository, DrizzleIntegrationSecretRepository } from "../infrastructure/repositories/integration.repository";
import { VerifyIntegrationUseCase } from "../application/platform/verify-integration.usecase";

export async function runIntegrationHealthChecks(env: Env): Promise<void> {
  const db = createDb(env.DATABASE_URL);
  const integrationRepo = new DrizzleIntegrationRepository(db);
  const secretRepo = new DrizzleIntegrationSecretRepository(db);
  const verifier = new VerifyIntegrationUseCase(integrationRepo, secretRepo);

  const integrations = await integrationRepo.findAllEnabled();

  for (const integration of integrations) {
    try {
      await verifier.execute(integration.provider, env, integration.storeId ?? undefined);
    } catch (err) {
      console.error(
        `[integration-health] Failed to verify ${integration.provider}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }
}
```

**Step 2: Add to scheduled handler**

In `src/scheduled/handler.ts`, add import at top:

```typescript
import { runIntegrationHealthChecks } from "./integration-health.job";
```

In the `*/15 * * * *` case (line 37), add alongside stock check:

```typescript
    case "*/15 * * * *": // Every 15 minutes
      ctx.waitUntil(runStockCheck(env));
      ctx.waitUntil(runIntegrationHealthChecks(env));
      break;
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```bash
git add src/scheduled/integration-health.job.ts src/scheduled/handler.ts
git commit -m "feat(cron): add 15-min integration health check job"
```

---

## Task 9: Auth Middleware — Role Guards

**Files:**
- Create: `src/middleware/role.middleware.ts`

The platform admin page needs `super_admin` role check. Store pages need store membership check. Currently `requireAuth()` exists but no role guard.

**Step 1: Create role middleware**

```typescript
// src/middleware/role.middleware.ts

import type { Context, Next } from "hono";
import type { Env } from "../env";
import { createDb } from "../infrastructure/db/client";
import { eq, and } from "drizzle-orm";
import { users, storeMembers } from "../infrastructure/db/schema";

export function requireRole(role: string) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const userId = c.get("userId");
    if (!userId) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const db = createDb(c.env.DATABASE_URL);
    const userRows = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (userRows.length === 0 || userRows[0].platformRole !== role) {
      return c.json({ error: "Insufficient permissions" }, 403);
    }

    await next();
  };
}

export function requireStoreMember(roles: string[] = ["owner", "admin"]) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const userId = c.get("userId");
    const storeId = c.req.param("storeId");

    if (!userId || !storeId) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const db = createDb(c.env.DATABASE_URL);
    const memberRows = await db
      .select()
      .from(storeMembers)
      .where(
        and(
          eq(storeMembers.storeId, storeId),
          eq(storeMembers.userId, userId),
        ),
      )
      .limit(1);

    if (memberRows.length === 0 || !roles.includes(memberRows[0].role ?? "")) {
      return c.json({ error: "Insufficient store permissions" }, 403);
    }

    await next();
  };
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add src/middleware/role.middleware.ts
git commit -m "feat(middleware): add role guard and store member guard"
```

---

## Task 10: API Routes — Integration Management

**Files:**
- Create: `src/routes/api/integrations.routes.ts`
- Modify: `src/index.tsx:130-143` (mount new route)

**Step 1: Create integration routes**

```typescript
// src/routes/api/integrations.routes.ts

import { Hono } from "hono";
import type { Env } from "../../env";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRole, requireStoreMember } from "../../middleware/role.middleware";
import { createDb } from "../../infrastructure/db/client";
import {
  DrizzleIntegrationRepository,
  DrizzleIntegrationSecretRepository,
} from "../../infrastructure/repositories/integration.repository";
import { UpsertIntegrationUseCase } from "../../application/platform/upsert-integration.usecase";
import { DeleteIntegrationUseCase } from "../../application/platform/delete-integration.usecase";
import { ListIntegrationsUseCase } from "../../application/platform/list-integrations.usecase";
import { VerifyIntegrationUseCase } from "../../application/platform/verify-integration.usecase";
import { CheckInfrastructureUseCase } from "../../application/platform/check-infrastructure.usecase";
import type { IntegrationProvider } from "../../domain/platform/integration.entity";

const integrationRoutes = new Hono<{ Bindings: Env }>();

// ─── Platform Admin Endpoints (super_admin) ──────────────────────────────────

integrationRoutes.get("/", requireAuth(), requireRole("super_admin"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const integrationRepo = new DrizzleIntegrationRepository(db);
  const secretRepo = new DrizzleIntegrationSecretRepository(db);
  const listUseCase = new ListIntegrationsUseCase(integrationRepo, secretRepo);

  const integrations = await listUseCase.listPlatform();
  return c.json({ integrations });
});

integrationRoutes.put("/:provider", requireAuth(), requireRole("super_admin"), async (c) => {
  const provider = c.req.param("provider") as IntegrationProvider;
  const body = await c.req.json<{
    enabled: boolean;
    secrets: Record<string, string>;
    config: Record<string, unknown>;
  }>();

  if (!c.env.ENCRYPTION_KEY) {
    return c.json({ error: "ENCRYPTION_KEY not configured" }, 500);
  }

  const db = createDb(c.env.DATABASE_URL);
  const integrationRepo = new DrizzleIntegrationRepository(db);
  const secretRepo = new DrizzleIntegrationSecretRepository(db);

  const upsertUseCase = new UpsertIntegrationUseCase(integrationRepo, secretRepo);
  const integration = await upsertUseCase.execute(
    {
      provider,
      storeId: null,
      enabled: body.enabled,
      config: body.config ?? {},
      secrets: body.secrets ?? {},
    },
    c.env.ENCRYPTION_KEY,
  );

  // Verify immediately
  const verifyUseCase = new VerifyIntegrationUseCase(integrationRepo, secretRepo);
  const verifyResult = await verifyUseCase.execute(provider, c.env);

  return c.json({ integration, verification: verifyResult });
});

integrationRoutes.delete("/:provider", requireAuth(), requireRole("super_admin"), async (c) => {
  const provider = c.req.param("provider") as IntegrationProvider;
  const db = createDb(c.env.DATABASE_URL);
  const integrationRepo = new DrizzleIntegrationRepository(db);
  const deleteUseCase = new DeleteIntegrationUseCase(integrationRepo);
  await deleteUseCase.execute(provider, null);
  return c.json({ ok: true });
});

integrationRoutes.post("/:provider/verify", requireAuth(), requireRole("super_admin"), async (c) => {
  const provider = c.req.param("provider") as IntegrationProvider;
  const db = createDb(c.env.DATABASE_URL);
  const integrationRepo = new DrizzleIntegrationRepository(db);
  const secretRepo = new DrizzleIntegrationSecretRepository(db);
  const verifyUseCase = new VerifyIntegrationUseCase(integrationRepo, secretRepo);
  const result = await verifyUseCase.execute(provider, c.env);
  return c.json(result);
});

integrationRoutes.get("/health", requireAuth(), requireRole("super_admin"), async (c) => {
  const db = createDb(c.env.DATABASE_URL);
  const checkUseCase = new CheckInfrastructureUseCase();
  const results = await checkUseCase.execute(c.env, db);
  return c.json({ results });
});

// ─── Per-Store Endpoints (store owner/admin) ─────────────────────────────────

integrationRoutes.get("/store/:storeId", requireAuth(), requireStoreMember(), async (c) => {
  const storeId = c.req.param("storeId");
  const db = createDb(c.env.DATABASE_URL);
  const integrationRepo = new DrizzleIntegrationRepository(db);
  const secretRepo = new DrizzleIntegrationSecretRepository(db);
  const listUseCase = new ListIntegrationsUseCase(integrationRepo, secretRepo);

  const integrations = await listUseCase.listForStore(storeId, c.env.ENCRYPTION_KEY);
  return c.json({ integrations });
});

integrationRoutes.put("/store/:storeId/:provider", requireAuth(), requireStoreMember(), async (c) => {
  const storeId = c.req.param("storeId");
  const provider = c.req.param("provider") as IntegrationProvider;
  const body = await c.req.json<{
    enabled: boolean;
    secrets: Record<string, string>;
    config: Record<string, unknown>;
  }>();

  if (!c.env.ENCRYPTION_KEY) {
    return c.json({ error: "ENCRYPTION_KEY not configured" }, 500);
  }

  const db = createDb(c.env.DATABASE_URL);
  const integrationRepo = new DrizzleIntegrationRepository(db);
  const secretRepo = new DrizzleIntegrationSecretRepository(db);

  const upsertUseCase = new UpsertIntegrationUseCase(integrationRepo, secretRepo);
  const integration = await upsertUseCase.execute(
    {
      provider,
      storeId,
      enabled: body.enabled,
      config: body.config ?? {},
      secrets: body.secrets ?? {},
    },
    c.env.ENCRYPTION_KEY,
  );

  // Verify immediately
  const verifyUseCase = new VerifyIntegrationUseCase(integrationRepo, secretRepo);
  const verifyResult = await verifyUseCase.execute(provider, c.env, storeId);

  return c.json({ integration, verification: verifyResult });
});

integrationRoutes.delete("/store/:storeId/:provider", requireAuth(), requireStoreMember(), async (c) => {
  const storeId = c.req.param("storeId");
  const provider = c.req.param("provider") as IntegrationProvider;
  const db = createDb(c.env.DATABASE_URL);
  const integrationRepo = new DrizzleIntegrationRepository(db);
  const deleteUseCase = new DeleteIntegrationUseCase(integrationRepo);
  await deleteUseCase.execute(provider, storeId);
  return c.json({ ok: true });
});

integrationRoutes.post("/store/:storeId/:provider/verify", requireAuth(), requireStoreMember(), async (c) => {
  const storeId = c.req.param("storeId");
  const provider = c.req.param("provider") as IntegrationProvider;
  const db = createDb(c.env.DATABASE_URL);
  const integrationRepo = new DrizzleIntegrationRepository(db);
  const secretRepo = new DrizzleIntegrationSecretRepository(db);
  const verifyUseCase = new VerifyIntegrationUseCase(integrationRepo, secretRepo);
  const result = await verifyUseCase.execute(provider, c.env, storeId);
  return c.json(result);
});

export { integrationRoutes };
```

**Step 2: Mount in `src/index.tsx`**

Add import after line 27 (`import affiliateRoutes...`):

```typescript
import { integrationRoutes } from "./routes/api/integrations.routes";
```

Add route mount after line 142 (`app.route("/api/affiliates"...`):

```typescript
app.route("/api/integrations", integrationRoutes);
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```bash
git add src/routes/api/integrations.routes.ts src/index.tsx
git commit -m "feat(routes): add integration management API endpoints"
```

---

## Task 11: UI Components — Shared Integration Components

**Files:**
- Create: `src/components/integrations/status-badge.tsx`
- Create: `src/components/integrations/integration-tabs.tsx`
- Create: `src/components/integrations/integration-card.tsx`

**Step 1: Status badge component**

```tsx
// src/components/integrations/status-badge.tsx
import type { FC } from "hono/jsx";

interface StatusBadgeProps {
  status: string;
  message?: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  connected: "bg-green-500",
  disconnected: "bg-gray-400",
  error: "bg-red-500",
  pending_verification: "bg-yellow-500",
};

const STATUS_LABELS: Record<string, string> = {
  connected: "Connected",
  disconnected: "Disconnected",
  error: "Error",
  pending_verification: "Verifying...",
};

export const StatusBadge: FC<StatusBadgeProps> = ({ status, message }) => (
  <div class="flex items-center gap-2">
    <span class={`w-2 h-2 rounded-full ${STATUS_STYLES[status] ?? "bg-gray-400"}`} />
    <span class="text-sm font-medium">{STATUS_LABELS[status] ?? status}</span>
    {message && <span class="text-xs text-red-600">({message})</span>}
  </div>
);
```

**Step 2: Integration tabs component**

```tsx
// src/components/integrations/integration-tabs.tsx
import type { FC } from "hono/jsx";

interface TabsProps {
  tabs: string[];
  activeTab: string;
  prefix: string; // CSS id prefix for JS tab switching
}

export const IntegrationTabs: FC<TabsProps> = ({ tabs, activeTab, prefix }) => (
  <div class="border-b mb-6">
    <nav class="flex gap-4" role="tablist">
      {tabs.map((tab) => (
        <button
          type="button"
          role="tab"
          data-tab-target={`${prefix}-${tab.toLowerCase()}`}
          class={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === activeTab
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          {tab}
        </button>
      ))}
    </nav>
  </div>
);
```

**Step 3: Integration card component**

```tsx
// src/components/integrations/integration-card.tsx
import type { FC } from "hono/jsx";
import { StatusBadge } from "./status-badge";

interface IntegrationCardProps {
  provider: string;
  label: string;
  status: string;
  statusMessage?: string | null;
  enabled: boolean;
  secrets: Record<string, string>; // masked values
  config: Record<string, unknown>;
  lastVerifiedAt?: string | null;
  lastSyncAt?: string | null;
  source: "platform" | "store_override";
  secretFields: { key: string; label: string; placeholder: string }[];
  configFields?: { key: string; label: string; type: string }[];
  actions?: { label: string; action: string }[];
  storeId?: string;
  readOnly?: boolean;
}

export const IntegrationCard: FC<IntegrationCardProps> = ({
  provider,
  label,
  status,
  statusMessage,
  enabled,
  secrets,
  config,
  lastVerifiedAt,
  lastSyncAt,
  source,
  secretFields,
  configFields,
  actions,
  storeId,
  readOnly,
}) => (
  <div class="bg-white border rounded-lg p-6 mb-4" data-provider={provider} data-store-id={storeId ?? ""}>
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-3">
        <StatusBadge status={status} message={statusMessage} />
        <h3 class="text-lg font-semibold">{label}</h3>
      </div>
      {!readOnly && (
        <label class="flex items-center gap-2">
          <input
            type="checkbox"
            checked={enabled}
            class="toggle-integration rounded"
            data-provider={provider}
          />
          <span class="text-sm text-gray-600">Enabled</span>
        </label>
      )}
    </div>

    <div class="text-xs mb-4">
      <span class={`px-2 py-0.5 rounded ${
        source === "store_override"
          ? "bg-blue-100 text-blue-800"
          : "bg-gray-100 text-gray-800"
      }`}>
        Using: {source === "store_override" ? "Store override" : "Platform default"}
      </span>
    </div>

    {!readOnly && (
      <form class="integration-form space-y-3" data-provider={provider} data-store-id={storeId ?? ""}>
        {secretFields.map((field) => (
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
            <div class="flex gap-2">
              <input
                type="password"
                name={field.key}
                placeholder={secrets[field.key] || field.placeholder}
                class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                autocomplete="off"
              />
              <button
                type="button"
                class="toggle-visibility px-2 py-1 text-xs border rounded text-gray-500 hover:bg-gray-50"
              >
                Show
              </button>
            </div>
          </div>
        ))}

        {configFields && configFields.length > 0 && (
          <details class="mt-3">
            <summary class="text-sm font-medium text-gray-600 cursor-pointer">Advanced Settings</summary>
            <div class="mt-2 space-y-2">
              {configFields.map((field) => (
                <div>
                  <label class="block text-xs font-medium text-gray-600 mb-1">{field.label}</label>
                  <input
                    type={field.type}
                    name={`config_${field.key}`}
                    value={String(config[field.key] ?? "")}
                    class="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                  />
                </div>
              ))}
            </div>
          </details>
        )}

        <div class="flex items-center gap-3 pt-2">
          <button
            type="submit"
            class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700"
          >
            Save Changes
          </button>
          <button
            type="button"
            class="verify-btn border border-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
            data-provider={provider}
          >
            Verify Connection
          </button>
          {actions?.map((a) => (
            <button
              type="button"
              class="action-btn border border-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
              data-provider={provider}
              data-action={a.action}
            >
              {a.label}
            </button>
          ))}
        </div>
      </form>
    )}

    <div class="mt-3 flex gap-4 text-xs text-gray-500">
      {lastVerifiedAt && <span>Last verified: {lastVerifiedAt}</span>}
      {lastSyncAt && <span>Last sync: {lastSyncAt}</span>}
    </div>
  </div>
);
```

**Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/integrations/
git commit -m "feat(ui): add integration card, tabs, and status badge components"
```

---

## Task 12: Platform Admin Page

**Files:**
- Create: `src/routes/pages/admin/integrations.page.tsx`

**Step 1: Create the platform admin integrations page**

This page renders the tabbed view with cards for all 7 managed providers + infrastructure status. Provider-specific `secretFields`, `configFields`, and `actions` are defined inline per card since they're static metadata.

```tsx
// src/routes/pages/admin/integrations.page.tsx
import type { FC } from "hono/jsx";
import { IntegrationTabs } from "../../../components/integrations/integration-tabs";
import { IntegrationCard } from "../../../components/integrations/integration-card";
import { StatusBadge } from "../../../components/integrations/status-badge";

interface AdminIntegrationsProps {
  integrations: any[];
  infraHealth: any[];
}

const TABS = ["Payments", "Fulfillment", "AI", "Email", "Infrastructure"];

const PROVIDER_META: Record<string, {
  tab: string;
  label: string;
  secretFields: { key: string; label: string; placeholder: string }[];
  configFields?: { key: string; label: string; type: string }[];
  actions?: { label: string; action: string }[];
}> = {
  stripe: {
    tab: "Payments",
    label: "Stripe",
    secretFields: [
      { key: "api_key", label: "Secret Key", placeholder: "sk_test_..." },
      { key: "publishable_key", label: "Publishable Key", placeholder: "pk_test_..." },
      { key: "webhook_secret", label: "Webhook Secret", placeholder: "whsec_..." },
    ],
    configFields: [
      { key: "webhookUrl", label: "Webhook URL", type: "text" },
    ],
    actions: [{ label: "Test Connection", action: "verify" }],
  },
  printful: {
    tab: "Fulfillment",
    label: "Printful",
    secretFields: [
      { key: "api_key", label: "API Key", placeholder: "Bearer token" },
      { key: "webhook_secret", label: "Webhook Secret", placeholder: "HMAC secret" },
    ],
    actions: [
      { label: "Sync Catalog", action: "sync_catalog" },
      { label: "Test Connection", action: "verify" },
    ],
  },
  gooten: {
    tab: "Fulfillment",
    label: "Gooten",
    secretFields: [
      { key: "api_key", label: "Recipe ID", placeholder: "Partner recipe ID" },
    ],
  },
  prodigi: {
    tab: "Fulfillment",
    label: "Prodigi",
    secretFields: [
      { key: "api_key", label: "API Key", placeholder: "X-API-Key value" },
    ],
  },
  shapeways: {
    tab: "Fulfillment",
    label: "Shapeways",
    secretFields: [
      { key: "api_key", label: "OAuth Token", placeholder: "Bearer token" },
    ],
  },
  gemini: {
    tab: "AI",
    label: "Google Gemini",
    secretFields: [
      { key: "api_key", label: "API Key", placeholder: "AI Studio key" },
    ],
    actions: [{ label: "Test Connection", action: "verify" }],
  },
  resend: {
    tab: "Email",
    label: "Resend",
    secretFields: [
      { key: "api_key", label: "API Key", placeholder: "re_..." },
    ],
    configFields: [
      { key: "senderName", label: "Sender Name", type: "text" },
    ],
    actions: [
      { label: "Send Test Email", action: "test_email" },
      { label: "Test Connection", action: "verify" },
    ],
  },
};

export const AdminIntegrationsPage: FC<AdminIntegrationsProps> = ({
  integrations,
  infraHealth,
}) => {
  const integrationMap = new Map(integrations.map((i: any) => [i.provider, i]));

  return (
    <div class="max-w-5xl mx-auto py-8 px-4">
      <h1 class="text-3xl font-bold mb-2">Platform Integrations</h1>
      <p class="text-gray-500 mb-8">Manage API keys, verify connections, and monitor service health.</p>

      <IntegrationTabs tabs={TABS} activeTab="Payments" prefix="admin" />

      {TABS.map((tab) => (
        <div
          id={`admin-${tab.toLowerCase()}`}
          class={`tab-panel ${tab === "Payments" ? "" : "hidden"}`}
        >
          {tab === "Infrastructure" ? (
            <div class="space-y-3">
              {(infraHealth ?? []).map((item: any) => (
                <div class="bg-white border rounded-lg p-4 flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <StatusBadge
                      status={item.status === "healthy" ? "connected" : item.status === "unhealthy" ? "error" : "disconnected"}
                    />
                    <span class="font-medium">{item.service}</span>
                  </div>
                  <div class="text-sm text-gray-500">
                    {item.message}
                    {item.latencyMs != null && <span class="ml-2">({item.latencyMs}ms)</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            Object.entries(PROVIDER_META)
              .filter(([, meta]) => meta.tab === tab)
              .map(([provider, meta]) => {
                const integration = integrationMap.get(provider);
                return (
                  <IntegrationCard
                    provider={provider}
                    label={meta.label}
                    status={integration?.status ?? "disconnected"}
                    statusMessage={integration?.statusMessage}
                    enabled={integration?.enabled ?? false}
                    secrets={integration?.secrets ?? {}}
                    config={integration?.config ?? {}}
                    lastVerifiedAt={integration?.lastVerifiedAt}
                    lastSyncAt={integration?.lastSyncAt}
                    source="platform"
                    secretFields={meta.secretFields}
                    configFields={meta.configFields}
                    actions={meta.actions}
                  />
                );
              })
          )}
        </div>
      ))}

      <script src="/scripts/admin-integrations.js" />
    </div>
  );
};
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add src/routes/pages/admin/integrations.page.tsx
git commit -m "feat(ui): add platform admin integrations page"
```

---

## Task 13: Per-Store Integrations Page

**Files:**
- Create: `src/routes/pages/platform/store-integrations.page.tsx`

**Step 1: Create the per-store integrations page**

Very similar to admin page but shows store context, "Using: Platform default" / "Override" badges, and a "Revert to Platform Default" button per override.

```tsx
// src/routes/pages/platform/store-integrations.page.tsx
import type { FC } from "hono/jsx";
import { IntegrationTabs } from "../../../components/integrations/integration-tabs";
import { IntegrationCard } from "../../../components/integrations/integration-card";

interface StoreIntegrationsProps {
  store: any;
  integrations: any[];
}

const TABS = ["Payments", "Fulfillment", "AI", "Email"];

const PROVIDER_TAB: Record<string, string> = {
  stripe: "Payments",
  printful: "Fulfillment",
  gooten: "Fulfillment",
  prodigi: "Fulfillment",
  shapeways: "Fulfillment",
  gemini: "AI",
  resend: "Email",
};

const PROVIDER_LABELS: Record<string, string> = {
  stripe: "Stripe",
  printful: "Printful",
  gooten: "Gooten",
  prodigi: "Prodigi",
  shapeways: "Shapeways",
  gemini: "Google Gemini",
  resend: "Resend",
};

const PROVIDER_SECRETS: Record<string, { key: string; label: string; placeholder: string }[]> = {
  stripe: [
    { key: "api_key", label: "Secret Key", placeholder: "sk_test_..." },
    { key: "publishable_key", label: "Publishable Key", placeholder: "pk_test_..." },
    { key: "webhook_secret", label: "Webhook Secret", placeholder: "whsec_..." },
  ],
  printful: [
    { key: "api_key", label: "API Key", placeholder: "Bearer token" },
    { key: "webhook_secret", label: "Webhook Secret", placeholder: "HMAC secret" },
  ],
  gooten: [{ key: "api_key", label: "Recipe ID", placeholder: "Partner recipe ID" }],
  prodigi: [{ key: "api_key", label: "API Key", placeholder: "X-API-Key value" }],
  shapeways: [{ key: "api_key", label: "OAuth Token", placeholder: "Bearer token" }],
  gemini: [{ key: "api_key", label: "API Key", placeholder: "AI Studio key" }],
  resend: [{ key: "api_key", label: "API Key", placeholder: "re_..." }],
};

export const StoreIntegrationsPage: FC<StoreIntegrationsProps> = ({
  store,
  integrations,
}) => (
  <div class="max-w-5xl mx-auto py-8 px-4">
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-3xl font-bold">Integrations</h1>
        <p class="text-gray-500">{store.name} — {store.slug}.petm8.io</p>
      </div>
      <a
        href={`/platform/stores/${store.id}/dashboard`}
        class="text-sm text-indigo-600 hover:underline"
      >
        Back to Dashboard
      </a>
    </div>

    <IntegrationTabs tabs={TABS} activeTab="Payments" prefix="store" />

    {TABS.map((tab) => (
      <div
        id={`store-${tab.toLowerCase()}`}
        class={`tab-panel ${tab === "Payments" ? "" : "hidden"}`}
      >
        {integrations
          .filter((i: any) => PROVIDER_TAB[i.provider] === tab)
          .map((integration: any) => (
            <div>
              <IntegrationCard
                provider={integration.provider}
                label={PROVIDER_LABELS[integration.provider] ?? integration.provider}
                status={integration.status}
                statusMessage={integration.statusMessage}
                enabled={integration.enabled}
                secrets={integration.secrets ?? {}}
                config={integration.config ?? {}}
                lastVerifiedAt={integration.lastVerifiedAt}
                lastSyncAt={integration.lastSyncAt}
                source={integration.source}
                secretFields={PROVIDER_SECRETS[integration.provider] ?? []}
                storeId={store.id}
                readOnly={integration.source === "platform"}
              />
              {integration.source === "platform" && (
                <div class="text-center mb-4">
                  <button
                    type="button"
                    class="override-btn text-sm text-indigo-600 hover:underline"
                    data-provider={integration.provider}
                    data-store-id={store.id}
                  >
                    Use your own {PROVIDER_LABELS[integration.provider]} account
                  </button>
                </div>
              )}
              {integration.source === "store_override" && (
                <div class="text-center mb-4">
                  <button
                    type="button"
                    class="revert-btn text-sm text-red-600 hover:underline"
                    data-provider={integration.provider}
                    data-store-id={store.id}
                  >
                    Revert to Platform Default
                  </button>
                </div>
              )}
            </div>
          ))}

        {integrations.filter((i: any) => PROVIDER_TAB[i.provider] === tab).length === 0 && (
          <p class="text-gray-400 text-center py-8">No integrations configured for this category.</p>
        )}
      </div>
    ))}

    <script src="/scripts/admin-integrations.js" />
  </div>
);
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add src/routes/pages/platform/store-integrations.page.tsx
git commit -m "feat(ui): add per-store integrations page"
```

---

## Task 14: Page Routes — Wire Pages to Index

**Files:**
- Modify: `src/index.tsx` (add page imports and routes)

**Step 1: Add page imports**

After the existing platform page imports (around line 58), add:

```typescript
import { AdminIntegrationsPage as _AdminIntegrationsPage } from "./routes/pages/admin/integrations.page";
import { StoreIntegrationsPage as _StoreIntegrationsPage } from "./routes/pages/platform/store-integrations.page";
```

In the type-erasure section (around line 91), add:

```typescript
const AdminIntegrationsPage = _AdminIntegrationsPage as any;
const StoreIntegrationsPage = _StoreIntegrationsPage as any;
```

**Step 2: Add page routes**

Add the platform admin page route (after the existing platform pages section in index.tsx). The exact location depends on where the other `app.get("/platform/...")` routes are. Add these routes:

```typescript
// ─── Admin Integrations Page ──────────────────────────────────
app.get("/admin/integrations", async (c) => {
  const token = getCookie(c, AUTH_COOKIE_NAME);
  if (!token) return c.redirect("/auth/login");
  const payload = await verifyJwt(token, c.env.JWT_SECRET);
  if (!payload) return c.redirect("/auth/login");

  const db = createDb(c.env.DATABASE_URL);
  const { DrizzleIntegrationRepository, DrizzleIntegrationSecretRepository } = await import("./infrastructure/repositories/integration.repository");
  const { ListIntegrationsUseCase } = await import("./application/platform/list-integrations.usecase");
  const { CheckInfrastructureUseCase } = await import("./application/platform/check-infrastructure.usecase");

  const integrationRepo = new DrizzleIntegrationRepository(db);
  const secretRepo = new DrizzleIntegrationSecretRepository(db);
  const listUseCase = new ListIntegrationsUseCase(integrationRepo, secretRepo);
  const checkUseCase = new CheckInfrastructureUseCase();

  const integrations = await listUseCase.listPlatform();
  const infraHealth = await checkUseCase.execute(c.env, db);

  return c.html(
    <Layout title="Platform Integrations" isAuthenticated={true} activePath="/admin/integrations">
      <AdminIntegrationsPage integrations={integrations} infraHealth={infraHealth} />
    </Layout>,
  );
});

// ─── Store Integrations Page ──────────────────────────────────
app.get("/platform/stores/:id/integrations", async (c) => {
  const token = getCookie(c, AUTH_COOKIE_NAME);
  if (!token) return c.redirect("/auth/login");
  const payload = await verifyJwt(token, c.env.JWT_SECRET);
  if (!payload) return c.redirect("/auth/login");

  const storeId = c.req.param("id");
  const db = createDb(c.env.DATABASE_URL);
  const storeRepo = new StoreRepository(db);
  const store = await storeRepo.findById(storeId);
  if (!store) return c.notFound();

  const { DrizzleIntegrationRepository, DrizzleIntegrationSecretRepository } = await import("./infrastructure/repositories/integration.repository");
  const { ListIntegrationsUseCase } = await import("./application/platform/list-integrations.usecase");

  const integrationRepo = new DrizzleIntegrationRepository(db);
  const secretRepo = new DrizzleIntegrationSecretRepository(db);
  const listUseCase = new ListIntegrationsUseCase(integrationRepo, secretRepo);

  const integrations = await listUseCase.listForStore(storeId, c.env.ENCRYPTION_KEY);

  return c.html(
    <Layout title="Store Integrations" isAuthenticated={true} activePath="/platform">
      <StoreIntegrationsPage store={store} integrations={integrations} />
    </Layout>,
  );
});
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```bash
git add src/index.tsx
git commit -m "feat(pages): wire admin and store integration pages to router"
```

---

## Task 15: Client-Side JavaScript

**Files:**
- Create: `public/scripts/admin-integrations.js`

**Step 1: Create client-side JS for tab switching, form submission, verify, override, revert**

```javascript
// public/scripts/admin-integrations.js
(function () {
  "use strict";

  // ─── Tab Switching ──────────────────────────────────────────
  document.querySelectorAll("[data-tab-target]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var target = btn.getAttribute("data-tab-target");
      var panels = document.querySelectorAll(".tab-panel");
      panels.forEach(function (p) { p.classList.add("hidden"); });
      var panel = document.getElementById(target);
      if (panel) panel.classList.remove("hidden");

      // Update active tab style
      btn.closest("nav").querySelectorAll("[role=tab]").forEach(function (t) {
        t.classList.remove("border-indigo-600", "text-indigo-600");
        t.classList.add("border-transparent", "text-gray-500");
      });
      btn.classList.add("border-indigo-600", "text-indigo-600");
      btn.classList.remove("border-transparent", "text-gray-500");
    });
  });

  // ─── Toggle Secret Visibility ───────────────────────────────
  document.querySelectorAll(".toggle-visibility").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var input = btn.previousElementSibling;
      if (input.type === "password") {
        input.type = "text";
        btn.textContent = "Hide";
      } else {
        input.type = "password";
        btn.textContent = "Show";
      }
    });
  });

  // ─── Form Submission ────────────────────────────────────────
  document.querySelectorAll(".integration-form").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var provider = form.getAttribute("data-provider");
      var storeId = form.getAttribute("data-store-id");
      var formData = new FormData(form);
      var secrets = {};
      var config = {};

      formData.forEach(function (value, key) {
        if (key.startsWith("config_")) {
          config[key.replace("config_", "")] = value;
        } else if (value) {
          secrets[key] = value;
        }
      });

      var url = storeId
        ? "/api/integrations/store/" + storeId + "/" + provider
        : "/api/integrations/" + provider;

      var card = form.closest("[data-provider]");
      var toggle = card ? card.querySelector(".toggle-integration") : null;

      fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: toggle ? toggle.checked : true,
          secrets: secrets,
          config: config,
        }),
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.verification && data.verification.success) {
            alert(data.verification.message || "Connected successfully!");
          } else if (data.verification) {
            alert("Saved but verification failed: " + data.verification.message);
          } else {
            alert("Saved!");
          }
          window.location.reload();
        })
        .catch(function (err) {
          alert("Error: " + err.message);
        });
    });
  });

  // ─── Verify Button ─────────────────────────────────────────
  document.querySelectorAll(".verify-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var provider = btn.getAttribute("data-provider");
      var card = btn.closest("[data-provider]");
      var storeId = card ? card.getAttribute("data-store-id") : "";

      var url = storeId
        ? "/api/integrations/store/" + storeId + "/" + provider + "/verify"
        : "/api/integrations/" + provider + "/verify";

      btn.textContent = "Verifying...";
      btn.disabled = true;

      fetch(url, { method: "POST" })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          alert(data.success ? data.message : "Verification failed: " + data.message);
          window.location.reload();
        })
        .catch(function (err) {
          alert("Error: " + err.message);
          btn.textContent = "Verify Connection";
          btn.disabled = false;
        });
    });
  });

  // ─── Revert to Platform Default ─────────────────────────────
  document.querySelectorAll(".revert-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (!confirm("Revert to platform default? Your store-specific key will be deleted.")) return;

      var provider = btn.getAttribute("data-provider");
      var storeId = btn.getAttribute("data-store-id");

      fetch("/api/integrations/store/" + storeId + "/" + provider, {
        method: "DELETE",
      })
        .then(function () { window.location.reload(); })
        .catch(function (err) { alert("Error: " + err.message); });
    });
  });

  // ─── Override Button (switch from platform to store key) ────
  document.querySelectorAll(".override-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var provider = btn.getAttribute("data-provider");
      var storeId = btn.getAttribute("data-store-id");
      // Find the card and show the form (currently readOnly cards hide forms)
      // Reload with override mode — simplest: POST an empty override to create the record
      fetch("/api/integrations/store/" + storeId + "/" + provider, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: true, secrets: {}, config: {} }),
      })
        .then(function () { window.location.reload(); })
        .catch(function (err) { alert("Error: " + err.message); });
    });
  });
})();
```

**Step 2: Commit**

```bash
git add public/scripts/admin-integrations.js
git commit -m "feat(ui): add client-side JS for integration management"
```

---

## Task 16: Add Navigation Links

**Files:**
- Modify: `src/routes/pages/platform/store-dashboard.page.tsx:117-146` (add Integrations quick link)

**Step 1: Add Integrations link to store dashboard quick links**

In the quick links grid section of `store-dashboard.page.tsx` (around line 117-146), add a new quick link card:

```tsx
<a
  href={`/platform/stores/${store.id}/integrations`}
  class="block bg-white border rounded-lg p-4 hover:shadow-md transition-shadow text-center"
>
  <div class="text-2xl mb-1">🔌</div>
  <span class="text-sm font-medium">Integrations</span>
</a>
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add src/routes/pages/platform/store-dashboard.page.tsx
git commit -m "feat(ui): add integrations link to store dashboard"
```

---

## Task 17: SQL Migration Script

**Files:**
- Create: `scripts/sql/add-integration-tables.sql`

This is the raw SQL migration for creating the tables in Neon.

**Step 1: Write migration SQL**

```sql
-- Migration: Add integration management tables
-- Run against Neon database

-- Enums
DO $$ BEGIN
  CREATE TYPE integration_provider AS ENUM (
    'stripe', 'printful', 'gemini', 'resend',
    'gooten', 'prodigi', 'shapeways'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE integration_status AS ENUM (
    'connected', 'disconnected', 'error', 'pending_verification'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tables
CREATE TABLE IF NOT EXISTS platform_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id),
  provider integration_provider NOT NULL,
  enabled BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  status integration_status DEFAULT 'disconnected',
  status_message TEXT,
  last_verified_at TIMESTAMP,
  last_sync_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS platform_integrations_store_provider_idx
  ON platform_integrations (store_id, provider);

CREATE TABLE IF NOT EXISTS integration_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES platform_integrations(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  encrypted_value TEXT NOT NULL,
  iv TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS integration_secrets_integration_key_idx
  ON integration_secrets (integration_id, key);
```

**Step 2: Commit**

```bash
git add scripts/sql/add-integration-tables.sql
git commit -m "feat(migration): add SQL migration for integration tables"
```

---

## Task 18: TypeScript Compilation Check + Final Verification

**Step 1: Run full TypeScript check**

Run: `npx tsc --noEmit`
Expected: PASS (0 errors)

**Step 2: Verify all new files exist**

Run: `find src/domain/platform src/infrastructure/crypto src/application/platform src/components/integrations src/routes/pages/admin src/routes/api/integrations.routes.ts src/middleware/role.middleware.ts src/scheduled/integration-health.job.ts public/scripts/admin-integrations.js scripts/sql/add-integration-tables.sql scripts/generate-encryption-key.ts -type f 2>/dev/null | sort`

Expected output should list all 17+ new files.

**Step 3: Verify dev server starts**

Run: `npx wrangler dev --local 2>&1 | head -20`
Expected: Server starts without import errors.

---

## Summary of All Tasks

| # | Task | Files | Description |
|---|---|---|---|
| 1 | Schema | `schema.ts` | Add enums + 2 tables |
| 2 | Domain | 2 new files | Entity types + repository ports |
| 3 | Crypto | 4 files | AES-GCM service + env + helper |
| 4 | Repositories | 1 new file | Drizzle implementations |
| 5 | Resolve Secret | 1 new file | Env-first resolution use case |
| 6 | CRUD Use Cases | 3 new files | Upsert, delete, list |
| 7 | Verification | 2 new files | Provider verify + infra health |
| 8 | Health Cron | 1 new + 1 modify | 15-min scheduled job |
| 9 | Auth Guards | 1 new file | Role + store member middleware |
| 10 | API Routes | 1 new + 1 modify | 10 REST endpoints |
| 11 | UI Components | 3 new files | Card, tabs, badge |
| 12 | Admin Page | 1 new file | Platform admin integrations |
| 13 | Store Page | 1 new file | Per-store integrations |
| 14 | Page Wiring | 1 modify | Mount pages in index.tsx |
| 15 | Client JS | 1 new file | Tab switching, forms, verify |
| 16 | Navigation | 1 modify | Dashboard quick link |
| 17 | SQL Migration | 1 new file | Raw SQL for Neon |
| 18 | Final Check | — | tsc + dev server verify |
