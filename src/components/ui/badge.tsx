import type { FC } from "hono/jsx";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

interface BadgeProps {
  variant?: BadgeVariant;
  class?: string;
  children: any;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300",
  success: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  warning: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
  danger: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
  info: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
};

export const Badge: FC<BadgeProps> = ({
  variant = "default",
  class: className,
  children,
}) => {
  const classes = [
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
    variantClasses[variant],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <span class={classes}>{children}</span>;
};
