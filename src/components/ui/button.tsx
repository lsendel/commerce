import type { FC } from "hono/jsx";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  href?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  class?: string;
  id?: string;
  children: any;
  [key: string]: any;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-500 text-white shadow-sm hover:shadow hover:bg-brand-600 hover:-translate-y-0.5 active:translate-y-0 active:bg-brand-700 focus-visible:ring-brand-500/50 dark:bg-brand-600 dark:hover:bg-brand-500 dark:active:bg-brand-700",
  secondary:
    "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 shadow-sm hover:shadow hover:bg-gray-50 dark:hover:bg-gray-700 hover:-translate-y-0.5 active:translate-y-0 active:bg-gray-100 dark:active:bg-gray-600 focus-visible:ring-gray-300/50",
  outline:
    "border-2 border-brand-500 text-brand-600 dark:text-brand-400 bg-transparent hover:bg-brand-50 dark:hover:bg-brand-900/20 focus-visible:ring-brand-500/30",
  ghost:
    "bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 focus-visible:ring-gray-300",
  danger:
    "bg-red-500 text-white shadow-sm hover:shadow hover:bg-red-600 hover:-translate-y-0.5 active:translate-y-0 active:bg-red-700 focus-visible:ring-red-500/50",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm rounded-lg",
  md: "px-5 py-2.5 text-sm rounded-xl",
  lg: "px-7 py-3 text-base rounded-xl",
};

export const Button: FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  href,
  type = "button",
  disabled = false,
  class: className,
  children,
  ...rest
}) => {
  const base =
    "inline-flex items-center justify-center font-semibold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none";

  const classes = [base, variantClasses[variant], sizeClasses[size], className]
    .filter(Boolean)
    .join(" ");

  if (href && !disabled) {
    return (
      <a href={href} class={classes} {...rest}>
        {children}
      </a>
    );
  }

  return (
    <button type={type} class={classes} disabled={disabled} {...rest}>
      {children}
    </button>
  );
};
