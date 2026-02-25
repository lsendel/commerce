export type DurationUnit = "minutes" | "hours" | "days";
export type CapacityType = "per_slot" | "per_day" | "unlimited";
export type TimeUnit = "minutes" | "hours" | "days";

export interface BookingSettings {
  duration: number;
  durationUnit: DurationUnit;
  capacityType: CapacityType;
  capacityPerSlot: number;
  cutOffTime: number;
  cutOffUnit: TimeUnit;
  maxAdvanceTime: number;
  maxAdvanceUnit: TimeUnit;
  minParticipants: number;
  enableWaitlist: boolean;
  enablePrivateEvent: boolean;
  minPrivateSize: number;
  maxPrivateSize: number;
}

export function createBookingSettings(
  params: Partial<BookingSettings>
): BookingSettings {
  return {
    duration: params.duration ?? 60,
    durationUnit: params.durationUnit ?? "minutes",
    capacityType: params.capacityType ?? "per_slot",
    capacityPerSlot: params.capacityPerSlot ?? 10,
    cutOffTime: params.cutOffTime ?? 24,
    cutOffUnit: params.cutOffUnit ?? "hours",
    maxAdvanceTime: params.maxAdvanceTime ?? 90,
    maxAdvanceUnit: params.maxAdvanceUnit ?? "days",
    minParticipants: params.minParticipants ?? 1,
    enableWaitlist: params.enableWaitlist ?? false,
    enablePrivateEvent: params.enablePrivateEvent ?? false,
    minPrivateSize: params.minPrivateSize ?? 1,
    maxPrivateSize: params.maxPrivateSize ?? 20,
  };
}
