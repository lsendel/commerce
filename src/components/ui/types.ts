import type { Child } from "hono/jsx";

// ── Button ──────────────────────────────────────────

export type ButtonVariant = "primary" | "secondary" | "outline" | "danger" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  href?: string;
  children: Child;
  class?: string;
  id?: string;
  [key: string]: unknown;
}

// ── Card ────────────────────────────────────────────

export type CardVariant = "default" | "elevated" | "outlined";
export type CardPadding = "sm" | "md" | "lg";

export interface CardProps {
  variant?: CardVariant;
  padding?: CardPadding;
  children: Child;
  class?: string;
}

// ── Badge ───────────────────────────────────────────

export type BadgeVariant = "success" | "warning" | "error" | "info" | "neutral";
export type BadgeSize = "sm" | "md";

export interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: Child;
  class?: string;
}

// ── Input ───────────────────────────────────────────

export interface InputProps {
  label?: string;
  helperText?: string;
  error?: string;
  required?: boolean;
  type?: string;
  name: string;
  value?: string;
  placeholder?: string;
  class?: string;
  id?: string;
  disabled?: boolean;
  autocomplete?: string;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  pattern?: string;
  readonly?: boolean;
  [key: string]: unknown;
}

// ── Select ──────────────────────────────────────────

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  label?: string;
  helperText?: string;
  error?: string;
  required?: boolean;
  options: SelectOption[];
  name: string;
  value?: string;
  class?: string;
  id?: string;
  disabled?: boolean;
  [key: string]: unknown;
}

// ── Textarea ────────────────────────────────────────

export interface TextareaProps {
  label?: string;
  helperText?: string;
  error?: string;
  required?: boolean;
  name: string;
  value?: string;
  placeholder?: string;
  class?: string;
  id?: string;
  disabled?: boolean;
  rows?: number;
  maxlength?: number;
  [key: string]: unknown;
}

// ── Modal ───────────────────────────────────────────

export interface ModalProps {
  id: string;
  title?: string;
  size?: "sm" | "md" | "lg";
  children: Child;
  footer?: Child;
}

// ── Table ───────────────────────────────────────────

export interface TableColumn<T = Record<string, unknown>> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => Child;
}

export interface TablePagination {
  page: number;
  limit: number;
  total: number;
}

export interface TableProps<T = Record<string, unknown>> {
  columns: TableColumn<T>[];
  data: T[];
  emptyMessage?: string;
  emptyIcon?: string;
  pagination?: TablePagination;
  baseUrl?: string;
  sortKey?: string;
  sortDir?: "asc" | "desc";
}

// ── StatCard ────────────────────────────────────────

export type TrendDirection = "up" | "down" | "neutral";

export interface StatCardProps {
  icon?: string;
  label: string;
  value: string | number;
  trend?: TrendDirection;
  trendValue?: string;
}

// ── EmptyState ──────────────────────────────────────

export interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}

// ── PageHeader ──────────────────────────────────────

export interface Breadcrumb {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  title: string;
  breadcrumbs?: Breadcrumb[];
  actions?: Child;
}

// ── Tabs ────────────────────────────────────────────

export interface Tab {
  id: string;
  label: string;
  href?: string;
}

export interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  baseUrl?: string;
}

// ── Toast ───────────────────────────────────────────

export type ToastType = "success" | "error" | "warning" | "info";

// ── CopyButton ──────────────────────────────────────

export interface CopyButtonProps {
  text: string;
  label?: string;
  class?: string;
}

// ── Skeleton ────────────────────────────────────────

export type SkeletonVariant = "line" | "card" | "table-row";

export interface SkeletonProps {
  variant?: SkeletonVariant;
  count?: number;
  class?: string;
}
