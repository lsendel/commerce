import type { StoreRepository } from "../../infrastructure/repositories/store.repository";
import { ConflictError, NotFoundError } from "../../shared/errors";

export class InviteMemberUseCase {
  constructor(private storeRepo: StoreRepository) {}

  async execute(input: {
    storeId: string;
    email: string;
    role: "admin" | "staff";
    invitedBy: string;
  }) {
    const store = await this.storeRepo.findById(input.storeId);
    if (!store) {
      throw new NotFoundError("Store", input.storeId);
    }

    // Check for existing pending invitation
    const pending = await this.storeRepo.findPendingInvitations(input.storeId);
    const existing = pending.find((i) => i.email === input.email);
    if (existing) {
      throw new ConflictError("An invitation for this email is already pending");
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await this.storeRepo.createInvitation({
      storeId: input.storeId,
      email: input.email,
      role: input.role,
      token,
      invitedBy: input.invitedBy,
      expiresAt,
    });

    return invitation;
  }
}
