export type DomainVerificationStatus = "pending" | "verified" | "failed";

export interface StoreDomain {
  id: string;
  storeId: string;
  domain: string;
  verificationStatus: DomainVerificationStatus;
  verificationToken: string | null;
  isPrimary: boolean;
  createdAt: Date;
}

export function createStoreDomain(
  params: Omit<StoreDomain, "createdAt" | "verificationStatus"> & {
    verificationStatus?: DomainVerificationStatus;
  },
): StoreDomain {
  return {
    ...params,
    verificationStatus: params.verificationStatus ?? "pending",
    createdAt: new Date(),
  };
}
