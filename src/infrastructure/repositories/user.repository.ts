import { and, eq } from "drizzle-orm";
import type { Database } from "../db/client";
import { users, addresses, passwordResetTokens, emailVerificationTokens } from "../db/schema";

export class UserRepository {
  constructor(private db: Database) {}

  async findById(id: string) {
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0] ?? null;
  }

  async findByEmail(email: string) {
    const result = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0] ?? null;
  }

  async findByGoogleSub(googleSub: string) {
    const result = await this.db.select().from(users).where(eq(users.googleSub, googleSub)).limit(1);
    return result[0] ?? null;
  }

  async findByAppleSub(appleSub: string) {
    const result = await this.db.select().from(users).where(eq(users.appleSub, appleSub)).limit(1);
    return result[0] ?? null;
  }

  async findByMetaSub(metaSub: string) {
    const result = await this.db.select().from(users).where(eq(users.metaSub, metaSub)).limit(1);
    return result[0] ?? null;
  }

  async create(data: {
    email: string;
    passwordHash: string;
    name: string;
    googleSub?: string;
    appleSub?: string;
    metaSub?: string;
    emailVerifiedAt?: Date;
  }) {
    const result = await this.db.insert(users).values({
      email: data.email,
      passwordHash: data.passwordHash,
      name: data.name,
      googleSub: data.googleSub,
      appleSub: data.appleSub,
      metaSub: data.metaSub,
      emailVerifiedAt: data.emailVerifiedAt,
    }).returning();
    const created = result[0];
    if (!created) {
      throw new Error("Failed to create user");
    }
    return created;
  }

  async findByStripeCustomerId(stripeCustomerId: string) {
    const result = await this.db.select().from(users).where(eq(users.stripeCustomerId, stripeCustomerId)).limit(1);
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
    avatarUrl: string | null;
    locale: string;
    timezone: string;
    marketingOptIn: boolean;
  }>) {
    await this.db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, userId));
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
}
