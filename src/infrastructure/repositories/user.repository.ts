import { eq } from "drizzle-orm";
import type { Database } from "../db/client";
import { users, addresses } from "../db/schema";

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

  async create(data: { email: string; passwordHash: string; name: string }) {
    const result = await this.db.insert(users).values({
      email: data.email,
      passwordHash: data.passwordHash,
      name: data.name,
    }).returning();
    return result[0];
  }

  async findByStripeCustomerId(stripeCustomerId: string) {
    const result = await this.db.select().from(users).where(eq(users.stripeCustomerId, stripeCustomerId)).limit(1);
    return result[0] ?? null;
  }

  async updateStripeCustomerId(userId: string, stripeCustomerId: string) {
    await this.db.update(users).set({ stripeCustomerId }).where(eq(users.id, userId));
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
