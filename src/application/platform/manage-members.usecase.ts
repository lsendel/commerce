import type { StoreRepository } from "../../infrastructure/repositories/store.repository";
import { NotFoundError, ConflictError } from "../../shared/errors";

export class ManageMembersUseCase {
  constructor(private storeRepo: StoreRepository) {}

  async addMember(storeId: string, userId: string, role: "admin" | "staff") {
    const existing = await this.storeRepo.findMembership(storeId, userId);
    if (existing) {
      throw new ConflictError("User is already a member of this store");
    }
    return this.storeRepo.addMember(storeId, userId, role);
  }

  async updateRole(storeId: string, userId: string, role: "admin" | "staff") {
    const member = await this.storeRepo.findMembership(storeId, userId);
    if (!member) {
      throw new NotFoundError("StoreMember", userId);
    }
    if (member.role === "owner") {
      throw new ConflictError("Cannot change the owner's role");
    }
    return this.storeRepo.updateMemberRole(storeId, userId, role);
  }

  async removeMember(storeId: string, userId: string) {
    const member = await this.storeRepo.findMembership(storeId, userId);
    if (!member) {
      throw new NotFoundError("StoreMember", userId);
    }
    if (member.role === "owner") {
      throw new ConflictError("Cannot remove the store owner");
    }
    return this.storeRepo.removeMember(storeId, userId);
  }

  async listMembers(storeId: string) {
    return this.storeRepo.findMembers(storeId);
  }
}
