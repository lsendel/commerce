import type { FC } from "hono/jsx";
import { StatusBadge } from "./status-badge";

interface PersonTypePrice {
  label: string;
  price: string;
}

interface SlotCardProps {
  id: string;
  time: string;
  remaining: number;
  total: number;
  status: "available" | "full" | "closed";
  prices: PersonTypePrice[];
  onSelectUrl?: string;
  selected?: boolean;
}

function getOccupancyColor(remaining: number, total: number): string {
  if (total === 0) return "bg-gray-200";
  const ratio = remaining / total;
  if (ratio > 0.5) return "bg-green-500";
  if (ratio > 0.2) return "bg-amber-400";
  return "bg-red-500";
}

function getOccupancyBgColor(remaining: number, total: number): string {
  if (total === 0) return "bg-gray-100";
  const ratio = remaining / total;
  if (ratio > 0.5) return "bg-green-100";
  if (ratio > 0.2) return "bg-amber-100";
  return "bg-red-100";
}

export const SlotCard: FC<SlotCardProps> = ({
  id,
  time,
  remaining,
  total,
  status,
  prices,
  onSelectUrl,
  selected,
}) => {
  const occupancyPercent = total > 0 ? Math.round(((total - remaining) / total) * 100) : 100;
  const barColor = getOccupancyColor(remaining, total);
  const barBg = getOccupancyBgColor(remaining, total);
  const isSelectable = status === "available";

  return (
    <div
      class={`bg-white rounded-2xl border shadow-sm p-4 transition-all ${
        selected
          ? "border-brand-400 ring-2 ring-brand-100 shadow-md"
          : "border-gray-100 hover:border-gray-200 hover:shadow-md"
      }`}
    >
      <div class="flex items-center justify-between mb-3">
        <span class="text-lg font-bold text-gray-900">{time}</span>
        <StatusBadge status={status} />
      </div>

      {/* Occupancy bar */}
      <div class="mb-3">
        <div class="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>Capacity</span>
          <span>
            {remaining}/{total} remaining
          </span>
        </div>
        <div class={`h-2 rounded-full ${barBg} overflow-hidden`}>
          <div
            class={`h-full rounded-full ${barColor} transition-all duration-300`}
            style={`width: ${occupancyPercent}%`}
          />
        </div>
      </div>

      {/* Per-person-type prices */}
      <div class="space-y-1 mb-4">
        {prices.map((p) => (
          <div class="flex items-center justify-between text-sm">
            <span class="text-gray-600">{p.label}</span>
            <span class="font-medium text-gray-900">${p.price}</span>
          </div>
        ))}
      </div>

      {/* Select button */}
      {isSelectable && onSelectUrl && (
        <a
          href={onSelectUrl}
          class={`block w-full text-center px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            selected
              ? "bg-brand-600 text-white"
              : "bg-brand-500 text-white hover:bg-brand-600"
          }`}
        >
          {selected ? "Selected" : "Select"}
        </a>
      )}

      {!isSelectable && (
        <div class="block w-full text-center px-4 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-400 cursor-not-allowed">
          Unavailable
        </div>
      )}
    </div>
  );
};
