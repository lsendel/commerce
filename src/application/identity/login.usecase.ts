import type { UserRepository } from "../../infrastructure/repositories/user.repository";
import { verifyPassword } from "../../infrastructure/security/crypto";
import { AuthError } from "../../shared/errors";

export class LoginUseCase {
  constructor(private userRepo: UserRepository) {}

  async execute(input: { email: string; password: string; rememberMe?: boolean }) {
    const user = await this.userRepo.findByEmail(input.email.toLowerCase().trim());
    if (!user) {
      throw new AuthError("Invalid email or password");
    }

    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) {
      throw new AuthError("Invalid email or password");
    }

    // Update last login timestamp
    await this.userRepo.updateLastLogin(user.id);

    const expiresInHours = input.rememberMe ? 7 * 24 : 24; // 7 days or 24 hours

    return { id: user.id, email: user.email, name: user.name, expiresInHours };
  }
}
