import type { FC } from "hono/jsx";
import { html } from "hono/html";
import type { CopyButtonProps } from "./types";

let copyButtonIdCounter = 0;

export const CopyButton: FC<CopyButtonProps> = ({
  text,
  label = "Copy",
  class: className,
}) => {
  const id = `copy-btn-${++copyButtonIdCounter}`;

  return (
    <>
      <button
        type="button"
        id={id}
        data-copy-text={text}
        class={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${className || ""}`}
        aria-label={`Copy ${label}`}
      >
        {/* Copy icon */}
        <svg class="h-3.5 w-3.5" data-copy-icon fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        {/* Check icon (hidden) */}
        <svg class="h-3.5 w-3.5 hidden text-emerald-500" data-check-icon fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <span data-copy-label>{label}</span>
      </button>

      {html`
        <script>
          (function () {
            var btn = document.getElementById("${id}");
            if (!btn) return;
            btn.addEventListener("click", function () {
              var text = btn.getAttribute("data-copy-text");
              if (!text) return;
              navigator.clipboard.writeText(text).then(function () {
                var copyIcon = btn.querySelector("[data-copy-icon]");
                var checkIcon = btn.querySelector("[data-check-icon]");
                var labelEl = btn.querySelector("[data-copy-label]");
                if (copyIcon) copyIcon.classList.add("hidden");
                if (checkIcon) checkIcon.classList.remove("hidden");
                if (labelEl) labelEl.textContent = "Copied!";
                setTimeout(function () {
                  if (copyIcon) copyIcon.classList.remove("hidden");
                  if (checkIcon) checkIcon.classList.add("hidden");
                  if (labelEl) labelEl.textContent = "${label}";
                }, 2000);
              });
            });
          })();
        </script>
      `}
    </>
  );
};
