import { and, eq, isNull, sql } from "drizzle-orm";
import type { Database } from "../db/client";
import { users, addresses, passwordResetTokens, emailVerificationTokens } from "../db/schema";

const userSelectionBase = {
  id: users.id,
  email: users.email,
  passwordHash: users.passwordHash,
  googleSub: users.googleSub,
  appleSub: users.appleSub,
  metaSub: users.metaSub,
  name: users.name,
  platformRole: users.platformRole,
  stripeCustomerId: users.stripeCustomerId,
  emailVerifiedAt: users.emailVerifiedAt,
  avatarUrl: users.avatarUrl,
  locale: users.locale,
  timezone: users.timezone,
  marketingOptIn: users.marketingOptIn,
  lastLoginAt: users.lastLoginAt,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
} as const;

const userSelectionWithPhone = {
  ...userSelectionBase,
  phone: users.phone,
} as const;

const userSelectionWithoutPhone = {
  ...userSelectionBase,
  phone: sql<string | null>`NULL`.as("phone"),
} as const;

export class UserRepository {
  private phoneColumnAvailable: boolean | null = null;

  constructor(private db: Database) {}

  private async hasPhoneColumn() {
    if (this.phoneColumnAvailable !== null) return this.phoneColumnAvailable;

    try {
      const result = await this.db.execute(sql`
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'users'
            AND column_name = 'phone'
        ) AS exists
      `);
      const row = result.rows[0] as { exists?: boolean | string | number } | undefined;
      this.phoneColumnAvailable =
        row?.exists === true ||
        row?.exists === "true" ||
        row?.exists === "t" ||
        row?.exists === 1 ||
        row?.exists === "1";
    } catch {
      this.phoneColumnAvailable = true;
    }

    return this.phoneColumnAvailable;
  }

  private async getUserSelection() {
    return (await this.hasPhoneColumn()) ? userSelectionWithPhone : userSelectionWithoutPhone;
  }

  async findById(id: string) {
    const result = await this.db
      .select(await this.getUserSelection())
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return result[0] ?? null;
  }

  async findByEmail(email: string) {
    const candidates = await this.findEmailCandidates(email, 1);
    return candidates[0] ?? null;
  }

  async findEmailCandidates(email: string, limit = 5) {
    const normalizedEmail = email.toLowerCase().trim();
    if (!normalizedEmail) return [];
    return this.db
      .select(await this.getUserSelection())
      .from(users)
      .where(sql`lower(${users.email}) = ${normalizedEmail}`)
      .limit(Math.max(1, Math.min(limit, 20)));
  }

  async findByGoogleSub(googleSub: string) {
    const result = await this.db
      .select(await this.getUserSelection())
      .from(users)
      .where(eq(users.googleSub, googleSub))
      .limit(1);
    return result[0] ?? null;
  }

  async findByAppleSub(appleSub: string) {
    const result = await this.db
      .select(await this.getUserSelection())
      .from(users)
      .where(eq(users.appleSub, appleSub))
      .limit(1);
    return result[0] ?? null;
  }

  async findByMetaSub(metaSub: string) {
    const result = await this.db
      .select(await this.getUserSelection())
      .from(users)
      .where(eq(users.metaSub, metaSub))
      .limit(1);
    return result[0] ?? null;
  }

  async create(data: {
    email: string;
    passwordHash: string;
    name: string;
    phone?: string | null;
    googleSub?: string;
    appleSub?: string;
    metaSub?: string;
    emailVerifiedAt?: Date;
  }) {
    const normalizedEmail = data.email.toLowerCase().trim();
    const values = {
      email: normalizedEmail,
      passwordHash: data.passwordHash,
      name: data.name,
      googleSub: data.googleSub,
      appleSub: data.appleSub,
      metaSub: data.metaSub,
      emailVerifiedAt: data.emailVerifiedAt,
    };
    const result = await ((await this.hasPhoneColumn())
      ? this.db
          .insert(users)
          .values({
            ...values,
            phone: data.phone ?? null,
          })
          .returning(userSelectionWithPhone)
      : this.db
          .insert(users)
          .values(values)
          .returning(userSelectionWithoutPhone));
    const created = result[0];
    if (!created) {
      throw new Error("Failed to create user");
    }
    return created;
  }

  async findByStripeCustomerId(stripeCustomerId: string) {
    const result = await this.db
      .select(await this.getUserSelection())
      .from(users)
      .where(eq(users.stripeCustomerId, stripeCustomerId))
      .limit(1);
    return result[0] ?? null;
  }

  async updateStripeCustomerId(userId: string, stripeCustomerId: string) {
    await this.db.update(users).set({ stripeCustomerId }).where(eq(users.id, userId));
  }

  async updatePassword(userId: string, passwordHash: string) {
    await this.db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, userId));
  }

  async updateProfile(userId: string, data: Partial<{
    name: string;
    phone: string | null;
    avatarUrl: string | null;
    locale: string;
    timezone: string;
    marketingOptIn: boolean;
  }>) {
    const patch: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) patch.name = data.name;
    if (data.avatarUrl !== undefined) patch.avatarUrl = data.avatarUrl;
    if (data.locale !== undefined) patch.locale = data.locale;
    if (data.timezone !== undefined) patch.timezone = data.timezone;
    if (data.marketingOptIn !== undefined) patch.marketingOptIn = data.marketingOptIn;
    if (await this.hasPhoneColumn()) {
      if ("phone" in data) patch.phone = data.phone ?? null;
    }

    await this.db.update(users).set(patch).where(eq(users.id, userId));
  }

  async setEmailVerified(userId: string) {
    await this.db.update(users).set({ emailVerifiedAt: new Date(), updatedAt: new Date() }).where(eq(users.id, userId));
  }

  async linkGoogleSub(userId: string, googleSub: string) {
    await this.db.update(users).set({ googleSub, updatedAt: new Date() }).where(eq(users.id, userId));
  }

  async linkAppleSub(userId: string, appleSub: string) {
    await this.db.update(users).set({ appleSub, updatedAt: new Date() }).where(eq(users.id, userId));
  }

  async linkMetaSub(userId: string, metaSub: string) {
    await this.db.update(users).set({ metaSub, updatedAt: new Date() }).where(eq(users.id, userId));
  }

  async updateLastLogin(userId: string) {
    await this.db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, userId));
  }

  // Password reset tokens
  async createPasswordResetToken(userId: string, token: string, expiresAt: Date) {
    const result = await this.db.insert(passwordResetTokens).values({ userId, token, expiresAt }).returning();
    return result[0];
  }

  async findPasswordResetToken(token: string) {
    const result = await this.db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token)).limit(1);
    return result[0] ?? null;
  }

  async markPasswordResetTokenUsed(id: string) {
    await this.db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, id));
  }

  async invalidateActivePasswordResetTokens(userId: string) {
    await this.db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(passwordResetTokens.userId, userId),
          isNull(passwordResetTokens.usedAt),
        ),
      );
  }

  // Email verification tokens
  async createEmailVerificationToken(userId: string, token: string, expiresAt: Date) {
    const result = await this.db.insert(emailVerificationTokens).values({ userId, token, expiresAt }).returning();
    return result[0];
  }

  async findEmailVerificationToken(token: string) {
    const result = await this.db.select().from(emailVerificationTokens).where(eq(emailVerificationTokens.token, token)).limit(1);
    return result[0] ?? null;
  }

  async markEmailVerificationTokenUsed(id: string) {
    await this.db.update(emailVerificationTokens).set({ usedAt: new Date() }).where(eq(emailVerificationTokens.id, id));
  }

  async invalidateActiveEmailVerificationTokens(userId: string) {
    await this.db
      .update(emailVerificationTokens)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(emailVerificationTokens.userId, userId),
          isNull(emailVerificationTokens.usedAt),
        ),
      );
  }

  // Address methods
  async findAddresses(userId: string) {
    return this.db.select().from(addresses).where(eq(addresses.userId, userId));
  }

  async findAddressById(id: string, userId: string) {
    const result = await this.db.select().from(addresses)
      .where(eq(addresses.id, id))
      .limit(1);
    const addr = result[0];
    if (addr && addr.userId !== userId) return null;
    return addr ?? null;
  }

  async createAddress(userId: string, data: { label?: string; street: string; city: string; state?: string; zip: string; country: string; isDefault?: boolean }) {
    // If setting as default, unset other defaults first
    if (data.isDefault) {
      await this.db.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, userId));
    }
    const result = await this.db.insert(addresses).values({ ...data, userId }).returning();
    return result[0];
  }

  async updateAddress(id: string, userId: string, data: Partial<{ label: string; street: string; city: string; state: string; zip: string; country: string; isDefault: boolean }>) {
    if (data.isDefault) {
      await this.db.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, userId));
    }
    const result = await this.db.update(addresses).set(data).where(eq(addresses.id, id)).returning();
    return result[0] ?? null;
  }

  async deleteAddress(id: string, userId: string) {
    const result = await this.db.delete(addresses).where(eq(addresses.id, id)).returning();
    return (result[0] && result[0].userId === userId) ? result[0] : null;
  }

  async anonymizeAccount(userId: string, replacementEmail: string, replacementPasswordHash: string) {
    await this.db.delete(addresses).where(eq(addresses.userId, userId));
    await this.db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
    await this.db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, userId));

    const patch: Record<string, unknown> = {
      email: replacementEmail,
      passwordHash: replacementPasswordHash,
      googleSub: null,
      appleSub: null,
      metaSub: null,
      name: "Deleted User",
      stripeCustomerId: null,
      emailVerifiedAt: null,
      avatarUrl: null,
      locale: "en",
      timezone: "UTC",
      marketingOptIn: false,
      updatedAt: new Date(),
    };
    if (await this.hasPhoneColumn()) {
      patch.phone = null;
    }

    const result = await this.db
      .update(users)
      .set(patch)
      .where(eq(users.id, userId))
      .returning(await this.getUserSelection());

    return result[0] ?? null;
  }
}
