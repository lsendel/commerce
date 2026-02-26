import type { FC } from "hono/jsx";

interface ErrorPageProps {
  status?: number;
  title?: string;
  message?: string;
}

const errorContent: Record<number, { icon: string; title: string; message: string }> = {
  400: {
    icon: "paw-confused",
    title: "Bad Request",
    message: "Something about that request didn't quite make sense. Please check and try again.",
  },
  401: {
    icon: "paw-locked",
    title: "Sign In Required",
    message: "You need to be signed in to view this page. Please log in and try again.",
  },
  403: {
    icon: "paw-forbidden",
    title: "Access Denied",
    message: "You don't have permission to view this page.",
  },
  404: {
    icon: "paw-lost",
    title: "Page Not Found",
    message: "Looks like this page wandered off. Let's get you back on track.",
  },
  500: {
    icon: "paw-error",
    title: "Something Went Wrong",
    message: "We hit an unexpected snag. Please try again.",
  },
};

function PawIcon({ variant }: { variant: string }) {
  const baseColor = variant === "paw-locked" || variant === "paw-forbidden"
    ? "text-amber-400"
    : variant === "paw-error"
      ? "text-red-400"
      : "text-brand-400";

  return (
    <div class={`relative mb-6 ${baseColor}`}>
      <svg class="w-24 h-24 mx-auto" viewBox="0 0 100 100" fill="currentColor">
        <circle cx="35" cy="25" r="8" />
        <circle cx="65" cy="25" r="8" />
        <circle cx="22" cy="45" r="7" />
        <circle cx="78" cy="45" r="7" />
        <ellipse cx="50" cy="65" rx="18" ry="15" />
      </svg>
      {variant === "paw-locked" && (
        <div class="absolute -bottom-1 -right-1 text-3xl">
          <svg class="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
      )}
      {variant === "paw-lost" && (
        <div class="absolute -bottom-1 -right-1">
          <svg class="w-8 h-8 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      )}
      {variant === "paw-error" && (
        <div class="absolute -bottom-1 -right-1">
          <svg class="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
      )}
    </div>
  );
}

export const ErrorPage: FC<ErrorPageProps> = ({
  status = 500,
  title,
  message,
}) => {
  const content = errorContent[status] ?? errorContent[500];
  if (!content) {
    return (
      <div class="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Error</h1>
        <p class="text-gray-500 dark:text-gray-400 mb-8">An unexpected error occurred.</p>
        <a href="/" class="inline-flex items-center px-6 py-3 bg-brand-500 text-white font-medium rounded-xl hover:bg-brand-600 transition-colors">
          Back to Home
        </a>
      </div>
    );
  }

  const displayTitle = title ?? content.title;
  const displayMessage = message ?? content.message;
  const statusLabel = status >= 400 && status < 600 ? String(status) : "";

  return (
    <div class="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <PawIcon variant={content.icon} />

      {statusLabel && (
        <span class="text-sm font-mono text-gray-400 mb-2">{statusLabel}</span>
      )}

      <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{displayTitle}</h1>

      <p class="text-gray-500 dark:text-gray-400 mb-8 max-w-md">{displayMessage}</p>

      <div class="flex gap-3">
        <a
          href="/"
          class="inline-flex items-center px-6 py-3 bg-brand-500 text-white font-medium rounded-xl hover:bg-brand-600 transition-colors"
        >
          Back to Home
        </a>
        {status === 401 && (
          <a
            href="/login"
            class="inline-flex items-center px-6 py-3 border border-brand-500 text-brand-600 dark:text-brand-400 font-medium rounded-xl hover:bg-brand-50 dark:hover:bg-brand-900/30 transition-colors"
          >
            Sign In
          </a>
        )}
      </div>
    </div>
  );
};
