export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  stripeCustomerId: string | null;
  emailVerifiedAt: Date | null;
  avatarUrl: string | null;
  locale: string;
  timezone: string;
  marketingOptIn: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function isEmailVerified(user: User): boolean {
  return user.emailVerifiedAt !== null;
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
