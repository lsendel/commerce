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

  return (
    <div class={`flex flex-col gap-1.5 ${className || ""}`}>
      {label && (
        <label for={inputId} class="text-sm font-medium text-gray-700">
          {label}
          {required && <span class="ml-0.5 text-red-500">*</span>}
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
        class={`block w-full rounded-xl border px-4 py-2.5 text-sm transition-colors duration-150 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 disabled:bg-gray-100 disabled:cursor-not-allowed ${
          error
            ? "border-red-400 focus:ring-red-300 focus:border-red-400"
            : "border-gray-300 hover:border-gray-400"
        }`}
        {...rest}
      />
      {error && (
        <p class="text-xs text-red-500 mt-0.5">{error}</p>
      )}
    </div>
  );
};
