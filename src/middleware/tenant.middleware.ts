import type { Context, Next } from "hono";
import { eq, ne, or } from "drizzle-orm";
import { stores, storeDomains } from "../infrastructure/db/schema";
import { createDb } from "../infrastructure/db/client";
import type { Env } from "../env";

declare module "hono" {
  interface ContextVariableMap {
    store: {
      id: string;
      name: string;
      slug: string;
      logo: string | null;
      primaryColor: string | null;
      secondaryColor: string | null;
      status: string;
      stripeConnectAccountId: string | null;
    };
    storeId: string;
    isPlatformDomain: boolean;
  }
}

export function tenantMiddleware() {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const host = c.req.header("host") ?? "";
    const platformDomains = (c.env.PLATFORM_DOMAINS ?? "")
      .split(",")
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean);
    const db = createDb(c.env.DATABASE_URL);

    const setStoreContext = (store: typeof stores.$inferSelect) => {
      c.set("storeId", store.id);
      c.set("store", {
        id: store.id,
        name: store.name,
        slug: store.slug,
        logo: store.logo,
        primaryColor: store.primaryColor,
        secondaryColor: store.secondaryColor,
        status: store.status ?? "active",
        stripeConnectAccountId: store.stripeConnectAccountId,
      });
    };

    const resolveDefaultStore = async () => {
      const configuredDefaultStoreId = c.env.DEFAULT_STORE_ID?.trim();
      if (configuredDefaultStoreId) {
        const [configuredDefaultStore] = await db
          .select()
          .from(stores)
          .where(eq(stores.id, configuredDefaultStoreId))
          .limit(1);
        if (configuredDefaultStore) return configuredDefaultStore;
      }

      const [firstActiveStore] = await db
        .select()
        .from(stores)
        .where(ne(stores.status, "deactivated"))
        .orderBy(stores.createdAt)
        .limit(1);
      if (firstActiveStore) return firstActiveStore;

      const [anyStore] = await db
        .select()
        .from(stores)
        .orderBy(stores.createdAt)
        .limit(1);
      return anyStore ?? null;
    };

    // Check if this is a platform-level domain (landing pages, store creation)
    const hostWithoutPort = (host.split(":")[0] ?? host).toLowerCase();
    if (platformDomains.includes(hostWithoutPort)) {
      c.set("isPlatformDomain", true);
      const defaultStore = await resolveDefaultStore();
      if (!defaultStore) {
        return c.json({ error: "No store configured for this tenant" }, 503);
      }
      setStoreContext(defaultStore);
      await next();
      return;
    }

    c.set("isPlatformDomain", false);

    // Try subdomain match: {slug}.{platform-domain}
    for (const pd of platformDomains) {
      if (hostWithoutPort.endsWith(`.${pd}`)) {
        const subdomain = hostWithoutPort.replace(`.${pd}`, "");
        const [store] = await db
          .select()
          .from(stores)
          .where(
            or(eq(stores.subdomain, subdomain), eq(stores.slug, subdomain)),
          )
          .limit(1);

        if (store && store.status !== "deactivated") {
          setStoreContext(store);
          await next();
          return;
        }
      }
    }

    // Try custom domain match
    const [domainRecord] = await db
      .select()
      .from(storeDomains)
      .where(eq(storeDomains.domain, hostWithoutPort))
      .limit(1);

    if (domainRecord && domainRecord.verificationStatus === "verified") {
      const [store] = await db
        .select()
        .from(stores)
        .where(eq(stores.id, domainRecord.storeId))
        .limit(1);

      if (store && store.status !== "deactivated") {
        setStoreContext(store);
        await next();
        return;
      }
    }

    // Fallback to default store (dev/local)
    const defaultStore = await resolveDefaultStore();
    if (!defaultStore) {
      return c.json({ error: "No store configured for this tenant" }, 503);
    }
    setStoreContext(defaultStore);
    await next();
  };
}
