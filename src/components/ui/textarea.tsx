import type { FC } from "hono/jsx";
import type { TextareaProps } from "./types";

export const Textarea: FC<TextareaProps> = ({
  label,
  helperText,
  name,
  value,
  placeholder,
  error,
  required = false,
  disabled = false,
  class: className,
  id,
  rows = 4,
  maxlength,
  ...rest
}) => {
  const textareaId = id || `textarea-${name}`;
  const errorId = error ? `${textareaId}-error` : undefined;
  const helperId = helperText && !error ? `${textareaId}-helper` : undefined;
  const describedBy = errorId || helperId;

  return (
    <div class={`flex flex-col gap-1.5 ${className || ""}`}>
      {label && (
        <label for={textareaId} class="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
          {required && <span class="ml-0.5 text-red-500" aria-hidden="true">*</span>}
        </label>
      )}
      <textarea
        id={textareaId}
        name={name}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        rows={rows}
        maxlength={maxlength}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={describedBy}
        class={`block w-full rounded-xl border px-4 py-2.5 text-sm shadow-sm transition-all duration-200 ease-out placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-4 focus:border-brand-500 disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-100 resize-y ${error
            ? "border-red-300 dark:border-red-600 focus:ring-red-500/20"
            : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 focus:ring-brand-500/20"
          }`}
        {...rest}
      >
        {value}
      </textarea>
      {error && (
        <p id={errorId} class="text-xs text-red-500 mt-0.5" role="alert">{error}</p>
      )}
      {helperText && !error && (
        <p id={helperId} class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{helperText}</p>
      )}
    </div>
  );
};
