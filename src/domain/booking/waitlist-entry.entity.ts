export type WaitlistStatus = "waiting" | "notified" | "expired" | "converted";

export interface WaitlistEntry {
  id: string;
  storeId: string;
  userId: string;
  availabilityId: string;
  position: number;
  status: WaitlistStatus;
  notifiedAt: Date | null;
  expiredAt: Date | null;
  createdAt: Date;
}

/** How long a notified user has to claim the spot (minutes). */
export const WAITLIST_CLAIM_WINDOW_MINUTES = 30;

export function canNotify(entry: WaitlistEntry): boolean {
  return entry.status === "waiting";
}

export function canConvert(entry: WaitlistEntry): boolean {
  if (entry.status !== "notified") return false;
  if (!entry.notifiedAt) return false;
  const deadline = new Date(
    entry.notifiedAt.getTime() + WAITLIST_CLAIM_WINDOW_MINUTES * 60 * 1000,
  );
  return new Date() < deadline;
}

export function isExpired(entry: WaitlistEntry): boolean {
  if (entry.status === "expired") return true;
  if (entry.status !== "notified" || !entry.notifiedAt) return false;
  const deadline = new Date(
    entry.notifiedAt.getTime() + WAITLIST_CLAIM_WINDOW_MINUTES * 60 * 1000,
  );
  return new Date() >= deadline;
}
