import type { FC } from "hono/jsx";
import { html } from "hono/html";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";

interface ResetPasswordPageProps {
  token: string;
  error?: string;
}

export const ResetPasswordPage: FC<ResetPasswordPageProps> = ({ token, error }) => {
  return (
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4 py-12">
      <div class="w-full max-w-md">
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-500 text-white text-2xl font-bold mb-4 shadow-lg shadow-brand-200">
            p8
          </div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Set new password</h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Choose a strong password for your account
          </p>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg shadow-gray-200/60 dark:shadow-none border border-gray-100 dark:border-gray-700 p-8">
          <div
            id="reset-success"
            class="hidden mb-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-sm px-4 py-3"
            role="status"
          >
            Password reset successfully!{" "}
            <a href="/auth/login" class="font-semibold underline">Sign in with your new password</a>
          </div>

          <div
            id="reset-error"
            class={`mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 ${error ? "" : "hidden"}`}
            role="alert"
          >
            {error || ""}
          </div>

          <form id="reset-form" class="space-y-5" data-reset-form>
            <input type="hidden" name="token" value={token} />

            <Input
              label="New password"
              name="password"
              type="password"
              placeholder="At least 8 characters"
              required
              autocomplete="new-password"
            />

            <Input
              label="Confirm password"
              name="confirmPassword"
              type="password"
              placeholder="Enter password again"
              required
              autocomplete="new-password"
            />

            <Button type="submit" variant="primary" size="lg" class="w-full" id="reset-btn">
              Reset Password
            </Button>
          </form>

          <div class="mt-6 text-center">
            <a href="/auth/login" class="text-sm text-brand-600 hover:text-brand-700 font-semibold">
              Back to sign in
            </a>
          </div>
        </div>
      </div>

      {/* Static trusted script — no user input interpolated */}
      {html`
        <script>
          (function() {
            var form = document.getElementById('reset-form');
            if (!form) return;
            form.addEventListener('submit', async function(e) {
              e.preventDefault();
              var btn = document.getElementById('reset-btn');
              var errorEl = document.getElementById('reset-error');
              var successEl = document.getElementById('reset-success');
              btn.disabled = true;
              btn.textContent = 'Resetting...';
              errorEl.classList.add('hidden');

              var formData = new FormData(this);
              var password = formData.get('password');
              var confirm = formData.get('confirmPassword');

              if (password !== confirm) {
                errorEl.textContent = 'Passwords do not match';
                errorEl.classList.remove('hidden');
                btn.disabled = false;
                btn.textContent = 'Reset Password';
                return;
              }

              try {
                var res = await fetch('/api/auth/reset-password', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    token: formData.get('token'),
                    password: password,
                  }),
                });

                if (!res.ok) {
                  var data = await res.json().catch(function() { return {}; });
                  throw new Error(window.petm8GetApiErrorMessage ? window.petm8GetApiErrorMessage(data, 'Failed to reset password') : (data.error || data.message || 'Failed to reset password'));
                }

                successEl.classList.remove('hidden');
                form.classList.add('hidden');
              } catch (err) {
                errorEl.textContent = err.message;
                errorEl.classList.remove('hidden');
                btn.disabled = false;
                btn.textContent = 'Reset Password';
              }
            });
          })();
        </script>
      `}
    </div>
  );
};
