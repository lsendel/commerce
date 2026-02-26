import type { UserRepository } from "../../infrastructure/repositories/user.repository";
import { hashPassword, verifyPassword } from "../../infrastructure/security/crypto";
import { validatePasswordStrength } from "../../domain/identity/password.vo";
import { AuthError, NotFoundError } from "../../shared/errors";

export class ChangePasswordUseCase {
  constructor(private userRepo: UserRepository) {}

  async execute(input: {
    userId: string;
    currentPassword: string;
    newPassword: string;
  }): Promise<{ success: true }> {
    const user = await this.userRepo.findById(input.userId);
    if (!user) {
      throw new NotFoundError("User", input.userId);
    }

    const valid = await verifyPassword(input.currentPassword, user.passwordHash);
    if (!valid) {
      throw new AuthError("Current password is incorrect");
    }

    validatePasswordStrength(input.newPassword);

    const passwordHash = await hashPassword(input.newPassword);
    await this.userRepo.updatePassword(input.userId, passwordHash);

    return { success: true };
  }
}
