import type { UserRepository } from "../../infrastructure/repositories/user.repository";
import { hashPassword } from "../../infrastructure/security/crypto";
import { validatePasswordStrength } from "../../domain/identity/password.vo";
import { isTokenValid } from "../../domain/identity/password-reset-token.entity";
import { ValidationError, ExpiredError } from "../../shared/errors";

export class ResetPasswordUseCase {
  constructor(private userRepo: UserRepository) {}

  async execute(input: { token: string; password: string }): Promise<{ success: true }> {
    const tokenRecord = await this.userRepo.findPasswordResetToken(input.token);
    if (!tokenRecord) {
      throw new ValidationError("Invalid or expired reset token");
    }

    if (!isTokenValid(tokenRecord)) {
      throw new ExpiredError("Reset token has expired or already been used");
    }

    validatePasswordStrength(input.password);

    const passwordHash = await hashPassword(input.password);
    await this.userRepo.updatePassword(tokenRecord.userId, passwordHash);
    await this.userRepo.markPasswordResetTokenUsed(tokenRecord.id);

    return { success: true };
  }
}
