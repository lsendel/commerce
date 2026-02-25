import type { Context, Next } from "hono";
import { eq, or } from "drizzle-orm";
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
    const platformDomains = (c.env.PLATFORM_DOMAINS ?? "").split(",").map((d) => d.trim().toLowerCase());

    // Check if this is a platform-level domain (landing pages, store creation)
    const hostWithoutPort = host.split(":")[0].toLowerCase();
    if (platformDomains.includes(hostWithoutPort)) {
      c.set("isPlatformDomain", true);
      c.set("storeId", c.env.DEFAULT_STORE_ID);
      // Load default store for platform pages
      const db = createDb(c.env.DATABASE_URL);
      const [store] = await db
        .select()
        .from(stores)
        .where(eq(stores.id, c.env.DEFAULT_STORE_ID))
        .limit(1);
      if (store) {
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
      }
      await next();
      return;
    }

    c.set("isPlatformDomain", false);
    const db = createDb(c.env.DATABASE_URL);

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
          c.set("storeId", store.id);
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
        c.set("storeId", store.id);
        await next();
        return;
      }
    }

    // Fallback to default store (dev/local)
    c.set("storeId", c.env.DEFAULT_STORE_ID);
    const [defaultStore] = await db
      .select()
      .from(stores)
      .where(eq(stores.id, c.env.DEFAULT_STORE_ID))
      .limit(1);
    if (defaultStore) {
      c.set("store", {
        id: defaultStore.id,
        name: defaultStore.name,
        slug: defaultStore.slug,
        logo: defaultStore.logo,
        primaryColor: defaultStore.primaryColor,
        secondaryColor: defaultStore.secondaryColor,
        status: defaultStore.status ?? "active",
        stripeConnectAccountId: defaultStore.stripeConnectAccountId,
      });
    }
    await next();
  };
}
