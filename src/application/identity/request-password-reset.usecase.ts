import type { UserRepository } from "../../infrastructure/repositories/user.repository";

interface NotificationsQueue {
  send(message: Record<string, unknown>): Promise<void>;
}

export class RequestPasswordResetUseCase {
  constructor(
    private userRepo: UserRepository,
    private notificationsQueue?: NotificationsQueue,
  ) {}

  async execute(input: { email: string }): Promise<{ success: true }> {
    const user = await this.userRepo.findByEmail(input.email.toLowerCase().trim());

    // Always return success to prevent email enumeration
    if (!user) return { success: true };

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.userRepo.createPasswordResetToken(user.id, token, expiresAt);

    // Queue email notification
    if (this.notificationsQueue) {
      await this.notificationsQueue.send({
        type: "password_reset",
        userId: user.id,
        email: user.email,
        name: user.name,
        token,
      });
    }

    return { success: true };
  }
}
