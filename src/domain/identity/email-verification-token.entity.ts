export interface EmailVerificationToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export function isVerificationTokenExpired(token: EmailVerificationToken): boolean {
  return new Date() > token.expiresAt;
}

export function isVerificationTokenUsed(token: EmailVerificationToken): boolean {
  return token.usedAt !== null;
}

export function isVerificationTokenValid(token: EmailVerificationToken): boolean {
  return !isVerificationTokenExpired(token) && !isVerificationTokenUsed(token);
}
