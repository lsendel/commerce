import type { UserRepository } from "../../infrastructure/repositories/user.repository";
import { NotFoundError } from "../../shared/errors";

export class UpdateProfileUseCase {
  constructor(private userRepo: UserRepository) {}

  async execute(
    userId: string,
    input: Partial<{
      name: string;
      phone: string | null;
      avatarUrl: string | null;
      locale: string;
      timezone: string;
      marketingOptIn: boolean;
    }>,
  ): Promise<{ success: true }> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError("User", userId);
    }

    const updates: Record<string, unknown> = {};
    if (input.name !== undefined) updates.name = input.name.trim();
    if (input.phone !== undefined) {
      const trimmedPhone = input.phone?.trim();
      updates.phone = trimmedPhone ? trimmedPhone : null;
    }
    if (input.avatarUrl !== undefined) updates.avatarUrl = input.avatarUrl;
    if (input.locale !== undefined) updates.locale = input.locale;
    if (input.timezone !== undefined) updates.timezone = input.timezone;
    if (input.marketingOptIn !== undefined) updates.marketingOptIn = input.marketingOptIn;

    if (Object.keys(updates).length > 0) {
      await this.userRepo.updateProfile(userId, updates as Parameters<UserRepository["updateProfile"]>[1]);
    }

    return { success: true };
  }
}
