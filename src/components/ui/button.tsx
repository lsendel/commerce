import type { FC } from "hono/jsx";
import type { ButtonProps } from "./types";
import { BUTTON_VARIANTS, BUTTON_SIZES } from "./tokens";

const LoadingSpinner = () => (
  <svg
    class="animate-spin -ml-1 mr-2 h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

export const Button: FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  href,
  type = "button",
  disabled = false,
  loading = false,
  class: className,
  children,
  ...rest
}) => {
  const base =
    "inline-flex items-center justify-center font-semibold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none gap-2";

  const classes = [base, BUTTON_VARIANTS[variant], BUTTON_SIZES[size], className]
    .filter(Boolean)
    .join(" ");

  const isDisabled = disabled || loading;

  if (href && !isDisabled) {
    return (
      <a href={href} class={classes} {...rest}>
        {children}
      </a>
    );
  }

  return (
    <button type={type} class={classes} disabled={isDisabled} aria-busy={loading || undefined} {...rest}>
      {loading && <LoadingSpinner />}
      {children}
    </button>
  );
};
