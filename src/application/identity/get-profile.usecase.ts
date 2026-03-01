import type { UserRepository } from "../../infrastructure/repositories/user.repository";
import { NotFoundError } from "../../shared/errors";

export class GetProfileUseCase {
  constructor(private userRepo: UserRepository) {}

  async execute(userId: string) {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new NotFoundError("User", userId);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone ?? null,
      stripeCustomerId: user.stripeCustomerId ?? null,
    };
  }
}
