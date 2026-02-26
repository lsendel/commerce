import type { UserRepository } from "../../infrastructure/repositories/user.repository";
import { hashPassword } from "../../infrastructure/security/crypto";
import { createEmail } from "../../domain/identity/email.vo";
import { validatePasswordStrength } from "../../domain/identity/password.vo";
import { ConflictError } from "../../shared/errors";

interface NotificationsQueue {
  send(message: Record<string, unknown>): Promise<void>;
}

export class RegisterUseCase {
  constructor(
    private userRepo: UserRepository,
    private notificationsQueue?: NotificationsQueue,
  ) {}

  async execute(input: { email: string; password: string; name: string }) {
    const email = createEmail(input.email);
    validatePasswordStrength(input.password);

    const existing = await this.userRepo.findByEmail(email);
    if (existing) {
      throw new ConflictError("Email already registered");
    }

    const passwordHash = await hashPassword(input.password);
    const user = await this.userRepo.create({ email, passwordHash, name: input.name.trim() });
    if (!user) {
      throw new Error("Failed to create user");
    }

    // Generate email verification token and enqueue notification
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
    await this.userRepo.createEmailVerificationToken(user.id, token, expiresAt);

    if (this.notificationsQueue) {
      await this.notificationsQueue.send({
        type: "email_verification",
        userId: user.id,
        email: user.email,
        token,
      });
    }

    return { id: user.id, email: user.email, name: user.name };
  }
}
