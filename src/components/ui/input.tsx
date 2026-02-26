import type { FC } from "hono/jsx";

interface InputProps {
  label?: string;
  name: string;
  type?: string;
  placeholder?: string;
  value?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  class?: string;
  id?: string;
  autocomplete?: string;
  [key: string]: any;
}

export const Input: FC<InputProps> = ({
  label,
  name,
  type = "text",
  placeholder,
  value,
  error,
  required = false,
  disabled = false,
  class: className,
  id,
  ...rest
}) => {
  const inputId = id || `input-${name}`;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div class={`flex flex-col gap-1.5 ${className || ""}`}>
      {label && (
        <label for={inputId} class="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
          {required && <span class="ml-0.5 text-red-500" aria-hidden="true">*</span>}
        </label>
      )}
      <input
        id={inputId}
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        required={required}
        disabled={disabled}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={errorId}
        class={`block w-full rounded-xl border px-4 py-2.5 text-sm shadow-sm transition-all duration-200 ease-out placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-4 focus:border-brand-500 disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-100 ${error
            ? "border-red-300 dark:border-red-600 focus:ring-red-500/20"
            : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 focus:ring-brand-500/20"
          }`}
        {...rest}
      />
      {error && (
        <p id={errorId} class="text-xs text-red-500 mt-0.5" role="alert">{error}</p>
      )}
    </div>
  );
};
