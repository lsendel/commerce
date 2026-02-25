import type { VenueRepository } from "../../infrastructure/repositories/venue.repository";

export class SearchNearbyUseCase {
  constructor(private venueRepo: VenueRepository) {}

  async execute(lat: number, lng: number, radiusKm: number = 25) {
    return this.venueRepo.findNearby(lat, lng, radiusKm);
  }
}
