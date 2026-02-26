import type { FC } from "hono/jsx";

interface VerifyEmailPageProps {
  success: boolean;
  error?: string;
}

export const VerifyEmailPage: FC<VerifyEmailPageProps> = ({ success, error }) => {
  return (
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4 py-12">
      <div class="w-full max-w-md">
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-500 text-white text-2xl font-bold mb-4 shadow-lg shadow-brand-200">
            p8
          </div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {success ? "Email verified!" : "Verification failed"}
          </h1>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg shadow-gray-200/60 dark:shadow-none border border-gray-100 dark:border-gray-700 p-8 text-center">
          {success ? (
            <div>
              <div class="mx-auto mb-4 flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <svg class="h-6 w-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Your email has been verified. You can now access all features.
              </p>
              <a
                href="/account"
                class="inline-flex items-center justify-center rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 transition-colors"
              >
                Go to your account
              </a>
            </div>
          ) : (
            <div>
              <div class="mx-auto mb-4 flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30">
                <svg class="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <p class="text-sm text-red-600 dark:text-red-400 mb-2 font-medium">
                {error || "This verification link is invalid or has expired."}
              </p>
              <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Please request a new verification email from your account settings.
              </p>
              <a
                href="/auth/login"
                class="inline-flex items-center justify-center rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 transition-colors"
              >
                Sign in
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
