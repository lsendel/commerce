export type StoreStatus = "trial" | "active" | "suspended" | "deactivated";

export interface Store {
  id: string;
  name: string;
  slug: string;
  subdomain: string | null;
  customDomain: string | null;
  logo: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  status: StoreStatus;
  planId: string | null;
  stripeConnectAccountId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function createStore(
  params: Omit<Store, "createdAt" | "updatedAt" | "status"> & {
    status?: StoreStatus;
  },
): Store {
  const now = new Date();
  return {
    ...params,
    status: params.status ?? "trial",
    createdAt: now,
    updatedAt: now,
  };
}
