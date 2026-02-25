export type StoreMemberRole = "owner" | "admin" | "staff";

export interface StoreMember {
  id: string;
  storeId: string;
  userId: string;
  role: StoreMemberRole;
  createdAt: Date;
}

export function createStoreMember(
  params: Omit<StoreMember, "createdAt">,
): StoreMember {
  return { ...params, createdAt: new Date() };
}
