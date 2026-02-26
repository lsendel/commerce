// Design token constants — single source of truth for Tailwind class mappings.

export const COLORS = {
  success: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dark: { bg: "dark:bg-emerald-900/20", text: "dark:text-emerald-400", border: "dark:border-emerald-800" },
  },
  warning: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    dark: { bg: "dark:bg-amber-900/20", text: "dark:text-amber-400", border: "dark:border-amber-800" },
  },
  error: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    dark: { bg: "dark:bg-red-900/20", text: "dark:text-red-400", border: "dark:border-red-800" },
  },
  info: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    dark: { bg: "dark:bg-blue-900/20", text: "dark:text-blue-400", border: "dark:border-blue-800" },
  },
  neutral: {
    bg: "bg-gray-100",
    text: "text-gray-700",
    border: "border-gray-200",
    dark: { bg: "dark:bg-gray-700", text: "dark:text-gray-300", border: "dark:border-gray-600" },
  },
} as const;

export const SIZES = {
  sm: { px: "px-3", py: "py-1.5", text: "text-sm", rounded: "rounded-lg" },
  md: { px: "px-5", py: "py-2.5", text: "text-sm", rounded: "rounded-xl" },
  lg: { px: "px-7", py: "py-3", text: "text-base", rounded: "rounded-xl" },
} as const;

export const TYPOGRAPHY = {
  h1: "text-3xl font-bold tracking-tight",
  h2: "text-2xl font-semibold tracking-tight",
  h3: "text-xl font-semibold",
  h4: "text-lg font-semibold",
  body: "text-sm leading-relaxed",
  caption: "text-xs text-gray-500 dark:text-gray-400",
  label: "text-sm font-medium text-gray-700 dark:text-gray-300",
} as const;

export const SHADOWS = {
  sm: "shadow-sm",
  md: "shadow-md",
  lg: "shadow-lg",
  xl: "shadow-xl",
  none: "shadow-none",
} as const;

export const RADII = {
  sm: "rounded-lg",
  md: "rounded-xl",
  lg: "rounded-2xl",
  full: "rounded-full",
} as const;

export const TRANSITIONS = {
  fast: "transition-all duration-150 ease-out",
  default: "transition-all duration-200 ease-out",
  slow: "transition-all duration-300 ease-out",
  colors: "transition-colors duration-150",
} as const;

// Button variant class mappings
export const BUTTON_VARIANTS = {
  primary:
    "bg-brand-500 text-white shadow-sm hover:shadow hover:bg-brand-600 hover:-translate-y-0.5 active:translate-y-0 active:bg-brand-700 focus-visible:ring-brand-500/50 dark:bg-brand-600 dark:hover:bg-brand-500 dark:active:bg-brand-700",
  secondary:
    "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 shadow-sm hover:shadow hover:bg-gray-50 dark:hover:bg-gray-700 hover:-translate-y-0.5 active:translate-y-0 active:bg-gray-100 dark:active:bg-gray-600 focus-visible:ring-gray-300/50",
  outline:
    "border-2 border-brand-500 text-brand-600 dark:text-brand-400 bg-transparent hover:bg-brand-50 dark:hover:bg-brand-900/20 focus-visible:ring-brand-500/30",
  danger:
    "bg-red-500 text-white shadow-sm hover:shadow hover:bg-red-600 hover:-translate-y-0.5 active:translate-y-0 active:bg-red-700 focus-visible:ring-red-500/50",
  ghost:
    "bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 focus-visible:ring-gray-300",
} as const;

export const BUTTON_SIZES = {
  sm: "px-3 py-1.5 text-sm rounded-lg",
  md: "px-5 py-2.5 text-sm rounded-xl",
  lg: "px-7 py-3 text-base rounded-xl",
} as const;

// Badge variant class mappings
export const BADGE_VARIANTS = {
  success: `${COLORS.success.bg} ${COLORS.success.text} ${COLORS.success.dark.bg} ${COLORS.success.dark.text}`,
  warning: `${COLORS.warning.bg} ${COLORS.warning.text} ${COLORS.warning.dark.bg} ${COLORS.warning.dark.text}`,
  error: `${COLORS.error.bg} ${COLORS.error.text} ${COLORS.error.dark.bg} ${COLORS.error.dark.text}`,
  info: `${COLORS.info.bg} ${COLORS.info.text} ${COLORS.info.dark.bg} ${COLORS.info.dark.text}`,
  neutral: `${COLORS.neutral.bg} ${COLORS.neutral.text} ${COLORS.neutral.dark.bg} ${COLORS.neutral.dark.text}`,
} as const;

export const BADGE_SIZES = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-0.5 text-xs",
} as const;

// Card variant class mappings
export const CARD_VARIANTS = {
  default: "bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700",
  elevated: "bg-white dark:bg-gray-800 shadow-lg dark:shadow-gray-900/50",
  outlined: "bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600",
} as const;

export const CARD_PADDINGS = {
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
} as const;

// Trend colors for stat cards
export const TREND_COLORS = {
  up: "text-emerald-600 dark:text-emerald-400",
  down: "text-red-600 dark:text-red-400",
  neutral: "text-gray-500 dark:text-gray-400",
} as const;

export const TREND_ICONS = {
  up: "M5 10l7-7m0 0l7 7m-7-7v18",
  down: "M19 14l-7 7m0 0l-7-7m7 7V3",
  neutral: "M5 12h14",
} as const;
