import type { FC } from "hono/jsx";
import { html } from "hono/html";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";

export const ForgotPasswordPage: FC = () => {
  return (
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4 py-12">
      <div class="w-full max-w-md">
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-500 text-white text-2xl font-bold mb-4 shadow-lg shadow-brand-200">
            p8
          </div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Reset your password</h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Enter your email and we'll send you a reset link
          </p>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg shadow-gray-200/60 dark:shadow-none border border-gray-100 dark:border-gray-700 p-8">
          <div
            id="forgot-success"
            class="hidden mb-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-sm px-4 py-3"
            role="status"
          >
            Check your email for a password reset link. It may take a few minutes.
          </div>

          <div
            id="forgot-error"
            class="hidden mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3"
            role="alert"
          />

          <form id="forgot-form" class="space-y-5" data-forgot-form>
            <Input
              label="Email address"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              autocomplete="email"
            />

            <Button type="submit" variant="primary" size="lg" class="w-full" id="forgot-btn">
              Send Reset Link
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
            var form = document.getElementById('forgot-form');
            if (!form) return;
            form.addEventListener('submit', async function(e) {
              e.preventDefault();
              var btn = document.getElementById('forgot-btn');
              var errorEl = document.getElementById('forgot-error');
              var successEl = document.getElementById('forgot-success');
              btn.disabled = true;
              btn.textContent = 'Sending...';
              errorEl.classList.add('hidden');
              successEl.classList.add('hidden');

              try {
                var formData = new FormData(this);
                var res = await fetch('/api/auth/forgot-password', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email: formData.get('email') }),
                });

                if (!res.ok) {
                  var data = await res.json().catch(function() { return {}; });
                  throw new Error(data.message || 'Something went wrong');
                }

                successEl.classList.remove('hidden');
                form.classList.add('hidden');
              } catch (err) {
                errorEl.textContent = err.message;
                errorEl.classList.remove('hidden');
                btn.disabled = false;
                btn.textContent = 'Send Reset Link';
              }
            });
          })();
        </script>
      `}
    </div>
  );
};
