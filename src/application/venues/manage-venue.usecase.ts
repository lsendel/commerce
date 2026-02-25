import type { VenueRepository } from "../../infrastructure/repositories/venue.repository";
import { NotFoundError, ConflictError } from "../../shared/errors";

interface CreateVenueInput {
  name: string;
  slug: string;
  address: string;
  city: string;
  state?: string;
  country: string;
  postalCode: string;
  latitude?: string;
  longitude?: string;
  amenities?: string[];
  capacity?: number;
  description?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export class ManageVenueUseCase {
  constructor(private venueRepo: VenueRepository) {}

  async create(input: CreateVenueInput) {
    const existing = await this.venueRepo.findBySlug(input.slug);
    if (existing) {
      throw new ConflictError(`Venue with slug "${input.slug}" already exists`);
    }
    return this.venueRepo.create(input);
  }

  async update(id: string, data: Partial<CreateVenueInput>) {
    const venue = await this.venueRepo.findById(id);
    if (!venue) {
      throw new NotFoundError("Venue", id);
    }
    return this.venueRepo.update(id, data);
  }

  async delete(id: string) {
    const venue = await this.venueRepo.findById(id);
    if (!venue) {
      throw new NotFoundError("Venue", id);
    }
    return this.venueRepo.delete(id);
  }

  async getById(id: string) {
    const venue = await this.venueRepo.findById(id);
    if (!venue) {
      throw new NotFoundError("Venue", id);
    }
    return venue;
  }

  async list() {
    return this.venueRepo.findAll();
  }
}
