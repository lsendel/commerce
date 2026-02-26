export interface SlotAvailability {
  totalCapacity: number;
  reservedCount: number;
  status: "available" | "full" | "in_progress" | "completed" | "closed" | "canceled";
}

export function remainingSpots(slot: SlotAvailability): number {
  return Math.max(0, slot.totalCapacity - slot.reservedCount);
}

export function isFull(slot: SlotAvailability): boolean {
  return remainingSpots(slot) <= 0;
}

export function isBookable(slot: SlotAvailability): boolean {
  return slot.status === "available" && !isFull(slot);
}
