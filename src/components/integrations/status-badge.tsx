import type { FC } from "hono/jsx";

interface StatusBadgeProps {
  status: string;
  message?: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  connected: "bg-green-500",
  disconnected: "bg-gray-400",
  error: "bg-red-500",
  pending_verification: "bg-yellow-500",
};

const STATUS_LABELS: Record<string, string> = {
  connected: "Connected",
  disconnected: "Disconnected",
  error: "Error",
  pending_verification: "Verifying...",
};

export const StatusBadge: FC<StatusBadgeProps> = ({ status, message }) => (
  <div class="flex items-center gap-2">
    <span
      class={`w-2 h-2 rounded-full ${STATUS_STYLES[status] ?? "bg-gray-400"}`}
    />
    <span class="text-sm font-medium dark:text-gray-200">
      {STATUS_LABELS[status] ?? status}
    </span>
    {message && <span class="text-xs text-red-600 dark:text-red-400">({message})</span>}
  </div>
);
