import type { FC } from "hono/jsx";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

interface BadgeProps {
  variant?: BadgeVariant;
  class?: string;
  children: any;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-gray-100 text-gray-700",
  success: "bg-green-100 text-green-700",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-red-100 text-red-700",
  info: "bg-blue-100 text-blue-700",
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
