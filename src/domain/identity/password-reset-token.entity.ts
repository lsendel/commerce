export interface PasswordResetToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export function isTokenExpired(token: PasswordResetToken): boolean {
  return new Date() > token.expiresAt;
}

export function isTokenUsed(token: PasswordResetToken): boolean {
  return token.usedAt !== null;
}

export function isTokenValid(token: PasswordResetToken): boolean {
  return !isTokenExpired(token) && !isTokenUsed(token);
}
