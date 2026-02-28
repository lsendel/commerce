import { eq, and, desc } from "drizzle-orm";
import type { Database } from "../db/client";
import {
  stores,
  storeMembers,
  storeDomains,
  storeSettings,
  storeBilling,
  platformPlans,
  storeInvitations,
  users,
} from "../db/schema";

export class StoreRepository {
  constructor(private db: Database) {}

  async create(data: {
    name: string;
    slug: string;
    subdomain?: string;
    planId?: string;
  }) {
    const [store] = await this.db.insert(stores).values(data).returning();
    return store;
  }

  async findById(id: string) {
    const [store] = await this.db
      .select()
      .from(stores)
      .where(eq(stores.id, id))
      .limit(1);
    return store ?? null;
  }

  async findBySlug(slug: string) {
    const [store] = await this.db
      .select()
      .from(stores)
      .where(eq(stores.slug, slug))
      .limit(1);
    return store ?? null;
  }

  async findBySubdomain(subdomain: string) {
    const [store] = await this.db
      .select()
      .from(stores)
      .where(eq(stores.subdomain, subdomain))
      .limit(1);
    return store ?? null;
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      slug: string;
      subdomain: string;
      customDomain: string;
      logo: string;
      primaryColor: string;
      secondaryColor: string;
      status: "trial" | "active" | "suspended" | "deactivated";
      planId: string;
      stripeConnectAccountId: string;
    }>,
  ) {
    const [store] = await this.db
      .update(stores)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(stores.id, id))
      .returning();
    return store;
  }

  async listAll(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const rows = await this.db
      .select()
      .from(stores)
      .orderBy(desc(stores.createdAt))
      .limit(limit)
      .offset(offset);
    return rows;
  }

  // Members
  async addMember(storeId: string, userId: string, role: "owner" | "admin" | "staff") {
    const [member] = await this.db
      .insert(storeMembers)
      .values({ storeId, userId, role })
      .returning();
    return member;
  }

  async findMembers(storeId: string) {
    return this.db
      .select()
      .from(storeMembers)
      .where(eq(storeMembers.storeId, storeId));
  }

  async updateMemberRole(storeId: string, userId: string, role: "owner" | "admin" | "staff") {
    const [member] = await this.db
      .update(storeMembers)
      .set({ role })
      .where(
        and(
          eq(storeMembers.storeId, storeId),
          eq(storeMembers.userId, userId),
        ),
      )
      .returning();
    return member;
  }

  async removeMember(storeId: string, userId: string) {
    await this.db
      .delete(storeMembers)
      .where(
        and(
          eq(storeMembers.storeId, storeId),
          eq(storeMembers.userId, userId),
        ),
      );
  }

  async findMembersWithUsers(storeId: string) {
    return this.db
      .select({
        id: storeMembers.id,
        userId: storeMembers.userId,
        role: storeMembers.role,
        createdAt: storeMembers.createdAt,
        userName: users.name,
        userEmail: users.email,
        avatarUrl: users.avatarUrl,
      })
      .from(storeMembers)
      .innerJoin(users, eq(storeMembers.userId, users.id))
      .where(eq(storeMembers.storeId, storeId));
  }

  async findMembership(storeId: string, userId: string) {
    const [member] = await this.db
      .select()
      .from(storeMembers)
      .where(
        and(
          eq(storeMembers.storeId, storeId),
          eq(storeMembers.userId, userId),
        ),
      )
      .limit(1);
    return member ?? null;
  }

  // Domains
  async addDomain(storeId: string, domain: string, verificationToken: string) {
    const [record] = await this.db
      .insert(storeDomains)
      .values({ storeId, domain, verificationToken })
      .returning();
    return record;
  }

  async findDomains(storeId: string) {
    return this.db
      .select()
      .from(storeDomains)
      .where(eq(storeDomains.storeId, storeId));
  }

  async verifyDomain(domainId: string) {
    const [record] = await this.db
      .update(storeDomains)
      .set({ verificationStatus: "verified", isPrimary: true })
      .where(eq(storeDomains.id, domainId))
      .returning();
    return record;
  }

  async findDomainByDomain(domain: string) {
    const [record] = await this.db
      .select()
      .from(storeDomains)
      .where(eq(storeDomains.domain, domain))
      .limit(1);
    return record ?? null;
  }

  // Settings
  async getSetting(storeId: string, key: string) {
    const [setting] = await this.db
      .select()
      .from(storeSettings)
      .where(
        and(eq(storeSettings.storeId, storeId), eq(storeSettings.key, key)),
      )
      .limit(1);
    return setting?.value ?? null;
  }

  async setSetting(storeId: string, key: string, value: string) {
    const existing = await this.getSetting(storeId, key);
    if (existing !== null) {
      await this.db
        .update(storeSettings)
        .set({ value })
        .where(
          and(eq(storeSettings.storeId, storeId), eq(storeSettings.key, key)),
        );
    } else {
      await this.db.insert(storeSettings).values({ storeId, key, value });
    }
  }

  async getSettings(storeId: string) {
    return this.db
      .select()
      .from(storeSettings)
      .where(eq(storeSettings.storeId, storeId));
  }

  // Billing
  async getBilling(storeId: string) {
    const [billing] = await this.db
      .select()
      .from(storeBilling)
      .where(eq(storeBilling.storeId, storeId))
      .limit(1);
    return billing ?? null;
  }

  async createBilling(data: {
    storeId: string;
    platformPlanId: string;
    stripeSubscriptionId?: string;
    stripeCustomerId?: string;
  }) {
    const [billing] = await this.db
      .insert(storeBilling)
      .values(data)
      .returning();
    return billing;
  }

  async updateBilling(
    storeId: string,
    data: Partial<{
      platformPlanId: string;
      stripeSubscriptionId: string;
      stripeCustomerId: string;
      status: "active" | "past_due" | "cancelled" | "trialing";
      currentPeriodStart: Date;
      currentPeriodEnd: Date;
    }>,
  ) {
    const [billing] = await this.db
      .update(storeBilling)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(storeBilling.storeId, storeId))
      .returning();
    return billing;
  }

  // Plans
  async findPlanById(id: string) {
    const [plan] = await this.db
      .select()
      .from(platformPlans)
      .where(eq(platformPlans.id, id))
      .limit(1);
    return plan ?? null;
  }

  async findAllPlans() {
    return this.db.select().from(platformPlans);
  }

  // Invitations
  async createInvitation(data: {
    storeId: string;
    email: string;
    role: "owner" | "admin" | "staff";
    token: string;
    invitedBy: string;
    expiresAt: Date;
  }) {
    const [invitation] = await this.db
      .insert(storeInvitations)
      .values(data)
      .returning();
    return invitation;
  }

  async findInvitationByToken(token: string) {
    const [invitation] = await this.db
      .select()
      .from(storeInvitations)
      .where(eq(storeInvitations.token, token))
      .limit(1);
    return invitation ?? null;
  }

  async findPendingInvitations(storeId: string) {
    return this.db
      .select()
      .from(storeInvitations)
      .where(
        and(
          eq(storeInvitations.storeId, storeId),
          eq(storeInvitations.status, "pending"),
        ),
      );
  }

  async updateInvitationStatus(id: string, status: "accepted" | "expired") {
    const [invitation] = await this.db
      .update(storeInvitations)
      .set({ status })
      .where(eq(storeInvitations.id, id))
      .returning();
    return invitation;
  }
}
