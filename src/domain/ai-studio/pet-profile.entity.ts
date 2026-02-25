export interface PetProfile {
  id: string;
  userId: string;
  name: string;
  species: string;
  breed: string;
  photoUrl: string;
}

export function createPetProfile(params: PetProfile): PetProfile {
  return { ...params };
}
