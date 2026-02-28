import type { StoreRepository } from "../../infrastructure/repositories/store.repository";
import { NotFoundError, ExpiredError, ConflictError } from "../../shared/errors";

export class AcceptInvitationUseCase {
  constructor(private storeRepo: StoreRepository) {}

  async execute(token: string, userId: string) {
    const invitation = await this.storeRepo.findInvitationByToken(token);
    if (!invitation) {
      throw new NotFoundError("Invitation", token);
    }

    if (invitation.status !== "pending") {
      throw new ConflictError("This invitation has already been used or expired");
    }

    if (new Date() > invitation.expiresAt) {
      await this.storeRepo.updateInvitationStatus(invitation.id, "expired");
      throw new ExpiredError("Invitation has expired");
    }

    // Check if user is already a member
    const existing = await this.storeRepo.findMembership(invitation.storeId, userId);
    if (existing) {
      throw new ConflictError("You are already a member of this store");
    }

    // Add as member and mark invitation accepted
    const member = await this.storeRepo.addMember(
      invitation.storeId,
      userId,
      invitation.role,
    );

    await this.storeRepo.updateInvitationStatus(invitation.id, "accepted");

    return { member, storeId: invitation.storeId };
  }
}
