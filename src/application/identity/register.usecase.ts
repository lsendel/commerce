import type { UserRepository } from "../../infrastructure/repositories/user.repository";
import { hashPassword } from "../../infrastructure/security/crypto";
import { createEmail } from "../../domain/identity/email.vo";
import { validatePasswordStrength } from "../../domain/identity/password.vo";
import { ConflictError } from "../../shared/errors";

export class RegisterUseCase {
  constructor(private userRepo: UserRepository) {}

  async execute(input: { email: string; password: string; name: string }) {
    const email = createEmail(input.email);
    validatePasswordStrength(input.password);

    const existing = await this.userRepo.findByEmail(email);
    if (existing) {
      throw new ConflictError("Email already registered");
    }

    const passwordHash = await hashPassword(input.password);
    const user = await this.userRepo.create({ email, passwordHash, name: input.name.trim() });
    return { id: user.id, email: user.email, name: user.name };
  }
}
