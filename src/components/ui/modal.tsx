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
  const titleId = `${id}-title`;

  return (
    <div
      id={id}
      class="fixed inset-0 z-50 hidden items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      tabindex={-1}
    >
      {/* Overlay */}
      <div
        class="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm"
        data-modal-close={id}
        aria-hidden="true"
      />

      {/* Card */}
      <div
        class={`relative w-full ${sizeClasses[size]} mx-4 rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-xl dark:shadow-gray-900/50`}
      >
        {/* Close button */}
        <button
          type="button"
          class="absolute right-4 top-4 rounded-lg p-1 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          data-modal-close={id}
          aria-label="Close dialog"
        >
          <svg
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {title && (
          <h3 id={titleId} class="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        )}

        {children}
      </div>

      {html`
        <script>
          (function () {
            const modal = document.getElementById("${id}");
            if (!modal) return;

            var triggerElement = null;
            var FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

            function trapFocus(e) {
              if (e.key !== "Tab") return;
              var focusable = modal.querySelectorAll(FOCUSABLE);
              if (focusable.length === 0) return;
              var first = focusable[0];
              var last = focusable[focusable.length - 1];
              if (e.shiftKey) {
                if (document.activeElement === first) {
                  e.preventDefault();
                  last.focus();
                }
              } else {
                if (document.activeElement === last) {
                  e.preventDefault();
                  first.focus();
                }
              }
            }

            function openModal(trigger) {
              triggerElement = trigger || document.activeElement;
              modal.classList.remove("hidden");
              modal.classList.add("flex");
              modal.focus();
              document.addEventListener("keydown", trapFocus);
              // Announce for screen readers
              var announcer = document.getElementById("announcer");
              if (announcer) announcer.textContent = "Dialog opened";
            }

            function closeModal() {
              modal.classList.add("hidden");
              modal.classList.remove("flex");
              document.removeEventListener("keydown", trapFocus);
              if (triggerElement && triggerElement.focus) {
                triggerElement.focus();
              }
              triggerElement = null;
              var announcer = document.getElementById("announcer");
              if (announcer) announcer.textContent = "Dialog closed";
            }

            // Open
            document.querySelectorAll('[data-modal-open="${id}"]').forEach(function (btn) {
              btn.addEventListener("click", function () {
                openModal(this);
              });
            });

            // Close
            modal.querySelectorAll('[data-modal-close="${id}"]').forEach(function (btn) {
              btn.addEventListener("click", function () {
                closeModal();
              });
            });

            // Escape key
            document.addEventListener("keydown", function (e) {
              if (e.key === "Escape" && !modal.classList.contains("hidden")) {
                closeModal();
              }
            });
          })();
        </script>
      `}
    </div>
  );
};
