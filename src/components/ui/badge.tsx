import type { FC } from "hono/jsx";
import type { BadgeProps } from "./types";
import { BADGE_VARIANTS, BADGE_SIZES } from "./tokens";

export const Badge: FC<BadgeProps> = ({
  variant = "neutral",
  size = "md",
  class: className,
  children,
}) => {
  const classes = [
    "inline-flex items-center rounded-full font-medium",
    BADGE_VARIANTS[variant],
    BADGE_SIZES[size],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <span class={classes}>{children}</span>;
};
