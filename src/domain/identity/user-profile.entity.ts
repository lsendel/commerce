export interface UserProfile {
  name: string;
  email: string;
  avatarUrl: string | null;
  locale: string;
  timezone: string;
  marketingOptIn: boolean;
  emailVerifiedAt: Date | null;
}

export function isProfileComplete(profile: UserProfile): boolean {
  return profile.name.trim().length > 0 && profile.emailVerifiedAt !== null;
}
