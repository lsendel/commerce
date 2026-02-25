export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  stripeCustomerId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function createUser(
  params: Omit<User, "id" | "createdAt" | "updatedAt"> & {
    id: string;
  }
): User {
  const now = new Date();
  return {
    ...params,
    createdAt: now,
    updatedAt: now,
  };
}
