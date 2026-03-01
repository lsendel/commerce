import { HeadlessApiPackRepository } from "../../infrastructure/repositories/headless-api-pack.repository";
import { NotFoundError, ValidationError } from "../../shared/errors";

const ALLOWED_SCOPES = ["catalog:read", "products:read", "collections:read"] as const;
type HeadlessScope = (typeof ALLOWED_SCOPES)[number];

function hexFromBytes(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return hexFromBytes(new Uint8Array(digest));
}

function generateApiKey(): string {
  const random = new Uint8Array(24);
  crypto.getRandomValues(random);
  return `hp_live_${hexFromBytes(random)}`;
}

function normalizeScopes(input: unknown): HeadlessScope[] {
  const values = Array.isArray(input) ? input : [];
  const normalized = values
    .map((value) => String(value).trim().toLowerCase())
    .filter((value): value is HeadlessScope =>
      (ALLOWED_SCOPES as readonly string[]).includes(value),
    );

  if (normalized.length === 0) {
    return ["catalog:read"];
  }

  const unique = Array.from(new Set(normalized));
  if (unique.includes("catalog:read")) {
    return ["catalog:read"];
  }

  return unique;
}

function hasRequiredScope(scopes: HeadlessScope[], requiredScope: HeadlessScope): boolean {
  if (scopes.includes("catalog:read")) return true;
  return scopes.includes(requiredScope);
}

export interface HeadlessApiPackView {
  id: string;
  name: string;
  description: string | null;
  keyPrefix: string;
  scopes: HeadlessScope[];
  status: "active" | "revoked";
  rateLimitPerMinute: number;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
  revokedAt: string | null;
}

interface CreateHeadlessApiPackInput {
  name: string;
  description?: string | null;
  scopes?: string[];
  rateLimitPerMinute?: number;
  userId?: string | null;
}

interface AuthorizeHeadlessKeyResult {
  packId: string;
  storeId: string;
  keyPrefix: string;
  scopes: HeadlessScope[];
  rateLimitPerMinute: number;
}

export class HeadlessApiPackUseCase {
  constructor(private readonly repository: HeadlessApiPackRepository) {}

  async listPacks(limit = 100): Promise<HeadlessApiPackView[]> {
    const packs = await this.repository.list(limit);
    return packs.map((pack) => this.toView(pack));
  }

  async createPack(input: CreateHeadlessApiPackInput): Promise<{
    pack: HeadlessApiPackView;
    apiKey: string;
  }> {
    const name = String(input.name ?? "").trim();
    if (!name) {
      throw new ValidationError("Pack name is required");
    }

    const scopes = normalizeScopes(input.scopes ?? []);
    const rateLimitPerMinute = Math.max(
      10,
      Math.min(10_000, Number(input.rateLimitPerMinute ?? 240) || 240),
    );

    const apiKey = generateApiKey();
    const keyHash = await sha256Hex(apiKey);

    const row = await this.repository.create({
      name,
      description: input.description?.trim() ? input.description.trim() : null,
      keyHash,
      keyPrefix: apiKey.slice(0, 14),
      scopes,
      rateLimitPerMinute,
      createdBy: input.userId ?? null,
    });

    if (!row) {
      throw new ValidationError("Failed to create headless API pack");
    }

    return {
      pack: this.toView(row),
      apiKey,
    };
  }

  async revokePack(id: string, userId?: string | null): Promise<HeadlessApiPackView> {
    const row = await this.repository.revoke(id, userId ?? null);
    if (!row) {
      throw new NotFoundError("Headless API pack", id);
    }

    return this.toView(row);
  }

  async authorizeKey(apiKey: string, requiredScope: HeadlessScope): Promise<AuthorizeHeadlessKeyResult> {
    const normalized = String(apiKey ?? "").trim();
    if (!normalized) {
      throw new ValidationError("API key is required");
    }

    const keyHash = await sha256Hex(normalized);
    const pack = await this.repository.findActiveByKeyHash(keyHash);

    if (!pack) {
      throw new ValidationError("Invalid API key");
    }

    const scopes = normalizeScopes(pack.scopes);
    if (!hasRequiredScope(scopes, requiredScope)) {
      throw new ValidationError(`API key missing scope: ${requiredScope}`);
    }

    await this.repository.markLastUsed(pack.id);

    return {
      packId: pack.id,
      storeId: pack.storeId,
      keyPrefix: pack.keyPrefix,
      scopes,
      rateLimitPerMinute: pack.rateLimitPerMinute ?? 120,
    };
  }

  private toView(row: any): HeadlessApiPackView {
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? null,
      keyPrefix: row.keyPrefix,
      scopes: normalizeScopes(row.scopes),
      status: row.status === "revoked" ? "revoked" : "active",
      rateLimitPerMinute: row.rateLimitPerMinute ?? 120,
      lastUsedAt: row.lastUsedAt ? new Date(row.lastUsedAt).toISOString() : null,
      createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : new Date().toISOString(),
      revokedAt: row.revokedAt ? new Date(row.revokedAt).toISOString() : null,
    };
  }
}
