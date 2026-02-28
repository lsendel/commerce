import type { StoreRepository } from "../../infrastructure/repositories/store.repository";
import { NotFoundError, ForbiddenError, ConflictError } from "../../shared/errors";

export class ChangeMemberRoleUseCase {
  constructor(private storeRepo: StoreRepository) {}

  async execute(input: {
    storeId: string;
    targetUserId: string;
    newRole: "admin" | "staff";
    requesterId: string;
  }) {
    // Verify requester is owner
    const requester = await this.storeRepo.findMembership(
      input.storeId,
      input.requesterId,
    );
    if (!requester || requester.role !== "owner") {
      throw new ForbiddenError("Only the store owner can change member roles");
    }

    // Verify target is a member
    const target = await this.storeRepo.findMembership(
      input.storeId,
      input.targetUserId,
    );
    if (!target) {
      throw new NotFoundError("StoreMember", input.targetUserId);
    }

    if (target.role === "owner") {
      throw new ConflictError("Cannot change the owner's role");
    }

    return this.storeRepo.updateMemberRole(
      input.storeId,
      input.targetUserId,
      input.newRole,
    );
  }
}
