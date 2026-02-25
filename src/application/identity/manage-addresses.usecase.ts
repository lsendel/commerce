import type { UserRepository } from "../../infrastructure/repositories/user.repository";
import { NotFoundError } from "../../shared/errors";

export class ManageAddressesUseCase {
  constructor(private userRepo: UserRepository) {}

  async list(userId: string) {
    return this.userRepo.findAddresses(userId);
  }

  async create(userId: string, data: { label?: string; street: string; city: string; state?: string; zip: string; country: string; isDefault?: boolean }) {
    return this.userRepo.createAddress(userId, data);
  }

  async update(userId: string, addressId: string, data: Partial<{ label: string; street: string; city: string; state: string; zip: string; country: string; isDefault: boolean }>) {
    const address = await this.userRepo.updateAddress(addressId, userId, data);
    if (!address) throw new NotFoundError("Address", addressId);
    return address;
  }

  async remove(userId: string, addressId: string) {
    const result = await this.userRepo.deleteAddress(addressId, userId);
    if (!result) throw new NotFoundError("Address", addressId);
  }
}
