import type { FC } from "hono/jsx";
import type { CardProps } from "./types";
import { CARD_VARIANTS, CARD_PADDINGS } from "./tokens";

export const Card: FC<CardProps> = ({
  variant = "default",
  padding = "md",
  class: className,
  children,
}) => {
  const classes = [
    "rounded-2xl",
    CARD_VARIANTS[variant],
    CARD_PADDINGS[padding],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <div class={classes}>{children}</div>;
};
