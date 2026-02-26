import type { FC } from "hono/jsx";
import type { SelectProps } from "./types";

export const Select: FC<SelectProps> = ({
  label,
  helperText,
  name,
  options,
  value,
  error,
  required = false,
  disabled = false,
  class: className,
  id,
  ...rest
}) => {
  const selectId = id || `select-${name}`;
  const errorId = error ? `${selectId}-error` : undefined;
  const helperId = helperText && !error ? `${selectId}-helper` : undefined;
  const describedBy = errorId || helperId;

  return (
    <div class={`flex flex-col gap-1.5 ${className || ""}`}>
      {label && (
        <label for={selectId} class="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
          {required && <span class="ml-0.5 text-red-500" aria-hidden="true">*</span>}
        </label>
      )}
      <select
        id={selectId}
        name={name}
        required={required}
        disabled={disabled}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={describedBy}
        class={`block w-full rounded-xl border px-4 py-2.5 text-sm shadow-sm transition-all duration-200 ease-out focus:outline-none focus:ring-4 focus:border-brand-500 disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-100 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22%236b7280%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20d%3D%22M5.293%207.293a1%201%200%20011.414%200L10%2010.586l3.293-3.293a1%201%200%20111.414%201.414l-4%204a1%201%200%2001-1.414%200l-4-4a1%201%200%20010-1.414z%22%20clip-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem] bg-[right_0.75rem_center] bg-no-repeat pr-10 ${error
            ? "border-red-300 dark:border-red-600 focus:ring-red-500/20"
            : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 focus:ring-brand-500/20"
          }`}
        {...rest}
      >
        {!value && <option value="">Select...</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} selected={value === opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={errorId} class="text-xs text-red-500 mt-0.5" role="alert">{error}</p>
      )}
      {helperText && !error && (
        <p id={helperId} class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{helperText}</p>
      )}
    </div>
  );
};
