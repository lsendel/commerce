import "dotenv/config";
import { sql } from "drizzle-orm";
import { createDb } from "../src/infrastructure/db/client";
import { hashPassword } from "../src/infrastructure/security/crypto";

type PlatformRole = "user" | "group_admin" | "super_admin";

interface SmokeAccountSpec {
  label: string;
  emailEnv: string;
  passwordEnv: string;
  nameEnv: string;
  defaultName: string;
  platformRole: PlatformRole;
}

const SMOKE_ACCOUNT_SPECS: SmokeAccountSpec[] = [
  {
    label: "storefront smoke",
    emailEnv: "SMOKE_USER_EMAIL",
    passwordEnv: "SMOKE_USER_PASSWORD",
    nameEnv: "SMOKE_USER_NAME",
    defaultName: "Storefront Smoke",
    platformRole: "user",
  },
  {
    label: "admin smoke",
    emailEnv: "SMOKE_ADMIN_EMAIL",
    passwordEnv: "SMOKE_ADMIN_PASSWORD",
    nameEnv: "SMOKE_ADMIN_NAME",
    defaultName: "Admin Smoke",
    platformRole: "group_admin",
  },
];

function readEnv(key: string) {
  return (process.env[key] ?? "").trim();
}

function roleRank(role: string | null | undefined) {
  if (role === "super_admin") return 3;
  if (role === "group_admin") return 2;
  return 1;
}

function pickHighestRole(current: string | null | undefined, target: PlatformRole): PlatformRole {
  return roleRank(current) > roleRank(target) ? (current as PlatformRole) : target;
}

function redactEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const safeLocal = local.length <= 2 ? `${local[0] ?? "*"}*` : `${local.slice(0, 2)}***`;
  return `${safeLocal}@${domain}`;
}

async function provisionAccount(spec: SmokeAccountSpec) {
  const email = readEnv(spec.emailEnv).toLowerCase();
  const password = readEnv(spec.passwordEnv);

  if (!email || !password) {
    console.log(`Skipping ${spec.label}: ${spec.emailEnv} / ${spec.passwordEnv} not configured.`);
    return;
  }

  const databaseUrl = readEnv("DATABASE_URL");
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to provision smoke users.");
  }

  const db = createDb(databaseUrl);
  const name = readEnv(spec.nameEnv) || spec.defaultName;
  const passwordHash = await hashPassword(password);
  const now = new Date();

  const existingRows = await db.execute(sql`
    SELECT id, email, platform_role
    FROM users
    WHERE lower(email) = ${email}
    LIMIT 1
  `);

  const existing = existingRows.rows[0] as
    | { id: string; email: string; platform_role: PlatformRole | null }
    | undefined;
  if (!existing) {
    await db.execute(sql`
      INSERT INTO users (
        email,
        password_hash,
        name,
        platform_role,
        email_verified_at,
        locale,
        timezone,
        marketing_opt_in,
        created_at,
        updated_at
      )
      VALUES (
        ${email},
        ${passwordHash},
        ${name},
        ${spec.platformRole},
        ${now},
        'en',
        'UTC',
        false,
        ${now},
        ${now}
      )
    `);
    console.log(`Created ${spec.label} account ${redactEmail(email)} with role ${spec.platformRole}.`);
    return;
  }

  const nextRole = pickHighestRole(existing.platform_role, spec.platformRole);
  await db.execute(sql`
    UPDATE users
    SET password_hash = ${passwordHash},
        name = ${name},
        platform_role = ${nextRole},
        email_verified_at = ${now},
        updated_at = ${now}
    WHERE id = ${existing.id}
  `);

  console.log(`Updated ${spec.label} account ${redactEmail(email)} with role ${nextRole}.`);
}

async function main() {
  for (const spec of SMOKE_ACCOUNT_SPECS) {
    await provisionAccount(spec);
  }
}

main().catch((error) => {
  const detail = error instanceof Error ? error.message : String(error);
  console.error(`Smoke user provisioning failed: ${detail}`);
  process.exitCode = 1;
});
