import type { FC } from "hono/jsx";
import { html } from "hono/html";

interface ModalProps {
  id: string;
  title?: string;
  size?: "sm" | "md" | "lg";
  children: any;
}

const sizeClasses: Record<string, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

export const Modal: FC<ModalProps> = ({
  id,
  title,
  size = "md",
  children,
}) => {
  return (
    <div
      id={id}
      class="fixed inset-0 z-50 hidden items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      {/* Overlay */}
      <div
        class="absolute inset-0 bg-black/40 backdrop-blur-sm"
        data-modal-close={id}
      />

      {/* Card */}
      <div
        class={`relative w-full ${sizeClasses[size]} mx-4 rounded-2xl bg-white p-6 shadow-xl`}
      >
        {/* Close button */}
        <button
          type="button"
          class="absolute right-4 top-4 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          data-modal-close={id}
          aria-label="Close"
        >
          <svg
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {title && (
          <h3 class="mb-4 text-lg font-semibold text-gray-900">{title}</h3>
        )}

        {children}
      </div>

      {html`
        <script>
          (function () {
            const modal = document.getElementById("${id}");
            if (!modal) return;

            // Open
            document.querySelectorAll('[data-modal-open="${id}"]').forEach(function (btn) {
              btn.addEventListener("click", function () {
                modal.classList.remove("hidden");
                modal.classList.add("flex");
              });
            });

            // Close
            modal.querySelectorAll('[data-modal-close="${id}"]').forEach(function (btn) {
              btn.addEventListener("click", function () {
                modal.classList.add("hidden");
                modal.classList.remove("flex");
              });
            });

            // Escape key
            document.addEventListener("keydown", function (e) {
              if (e.key === "Escape" && !modal.classList.contains("hidden")) {
                modal.classList.add("hidden");
                modal.classList.remove("flex");
              }
            });
          })();
        </script>
      `}
    </div>
  );
};
