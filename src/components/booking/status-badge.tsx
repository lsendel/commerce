import type { FC } from "hono/jsx";

type BookingStatus =
  | "confirmed"
  | "checked_in"
  | "cancelled"
  | "no_show"
  | "available"
  | "full"
  | "closed";

interface StatusBadgeProps {
  status: BookingStatus;
  class?: string;
}

const statusConfig: Record<BookingStatus, { label: string; classes: string }> = {
  confirmed: {
    label: "Confirmed",
    classes: "bg-green-100 text-green-700 border-green-200",
  },
  checked_in: {
    label: "Checked In",
    classes: "bg-blue-100 text-blue-700 border-blue-200",
  },
  cancelled: {
    label: "Cancelled",
    classes: "bg-red-100 text-red-700 border-red-200",
  },
  no_show: {
    label: "No Show",
    classes: "bg-gray-100 text-gray-600 border-gray-200",
  },
  available: {
    label: "Available",
    classes: "bg-green-100 text-green-700 border-green-200",
  },
  full: {
    label: "Full",
    classes: "bg-amber-100 text-amber-700 border-amber-200",
  },
  closed: {
    label: "Closed",
    classes: "bg-gray-100 text-gray-500 border-gray-200",
  },
};

export const StatusBadge: FC<StatusBadgeProps> = ({ status, class: className }) => {
  const config = statusConfig[status] || statusConfig.closed;

  const classes = [
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
    config.classes,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <span class={classes}>{config.label}</span>;
};
