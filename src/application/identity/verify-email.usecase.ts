import type { UserRepository } from "../../infrastructure/repositories/user.repository";
import { isVerificationTokenValid } from "../../domain/identity/email-verification-token.entity";
import { ValidationError, ExpiredError } from "../../shared/errors";

export class VerifyEmailUseCase {
  constructor(private userRepo: UserRepository) {}

  async execute(input: { token: string }): Promise<{ success: true }> {
    const tokenRecord = await this.userRepo.findEmailVerificationToken(input.token);
    if (!tokenRecord) {
      throw new ValidationError("Invalid verification token");
    }

    if (!isVerificationTokenValid(tokenRecord)) {
      throw new ExpiredError("Verification token has expired or already been used");
    }

    await this.userRepo.setEmailVerified(tokenRecord.userId);
    await this.userRepo.markEmailVerificationTokenUsed(tokenRecord.id);

    return { success: true };
  }
}
