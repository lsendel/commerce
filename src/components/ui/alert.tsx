import type { FC } from "hono/jsx";

type AlertVariant = "success" | "error" | "warning" | "info";

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  message: string;
  class?: string;
}

const variantStyles: Record<
  AlertVariant,
  { bg: string; border: string; titleColor: string; textColor: string; iconColor: string }
> = {
  success: {
    bg: "bg-green-50 dark:bg-green-900/20",
    border: "border-green-200 dark:border-green-800",
    titleColor: "text-green-800 dark:text-green-300",
    textColor: "text-green-700 dark:text-green-400",
    iconColor: "text-green-500 dark:text-green-400",
  },
  error: {
    bg: "bg-red-50 dark:bg-red-900/20",
    border: "border-red-200 dark:border-red-800",
    titleColor: "text-red-800 dark:text-red-300",
    textColor: "text-red-700 dark:text-red-400",
    iconColor: "text-red-500 dark:text-red-400",
  },
  warning: {
    bg: "bg-amber-50 dark:bg-amber-900/20",
    border: "border-amber-200 dark:border-amber-800",
    titleColor: "text-amber-800 dark:text-amber-300",
    textColor: "text-amber-700 dark:text-amber-400",
    iconColor: "text-amber-500 dark:text-amber-400",
  },
  info: {
    bg: "bg-blue-50 dark:bg-blue-900/20",
    border: "border-blue-200 dark:border-blue-800",
    titleColor: "text-blue-800 dark:text-blue-300",
    textColor: "text-blue-700 dark:text-blue-400",
    iconColor: "text-blue-500 dark:text-blue-400",
  },
};

const SuccessIcon: FC<{ class?: string }> = ({ class: cls }) => (
  <svg class={`h-5 w-5 shrink-0 ${cls || ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ErrorIcon: FC<{ class?: string }> = ({ class: cls }) => (
  <svg class={`h-5 w-5 shrink-0 ${cls || ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const WarningIcon: FC<{ class?: string }> = ({ class: cls }) => (
  <svg class={`h-5 w-5 shrink-0 ${cls || ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
);

const InfoIcon: FC<{ class?: string }> = ({ class: cls }) => (
  <svg class={`h-5 w-5 shrink-0 ${cls || ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const iconMap: Record<AlertVariant, FC<{ class?: string }>> = {
  success: SuccessIcon,
  error: ErrorIcon,
  warning: WarningIcon,
  info: InfoIcon,
};

export const Alert: FC<AlertProps> = ({
  variant = "info",
  title,
  message,
  class: className,
}) => {
  const s = variantStyles[variant];
  const Icon = iconMap[variant];

  return (
    <div
      class={`flex gap-3 rounded-xl border p-4 ${s.bg} ${s.border} ${className || ""}`}
      role="alert"
    >
      <Icon class={s.iconColor} />
      <div class="flex flex-col gap-0.5">
        {title && (
          <p class={`text-sm font-semibold ${s.titleColor}`}>{title}</p>
        )}
        <p class={`text-sm ${s.textColor}`}>{message}</p>
      </div>
    </div>
  );
};
