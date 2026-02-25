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
    "bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700 focus-visible:ring-brand-300",
  secondary:
    "bg-gray-200 text-gray-800 hover:bg-gray-300 active:bg-gray-400 focus-visible:ring-gray-300",
  outline:
    "border-2 border-brand-500 text-brand-600 bg-transparent hover:bg-brand-50 active:bg-brand-100 focus-visible:ring-brand-300",
  ghost:
    "bg-transparent text-gray-700 hover:bg-gray-100 active:bg-gray-200 focus-visible:ring-gray-300",
  danger:
    "bg-red-500 text-white hover:bg-red-600 active:bg-red-700 focus-visible:ring-red-300",
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
    "inline-flex items-center justify-center font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

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
