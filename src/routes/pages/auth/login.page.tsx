import type { FC } from "hono/jsx";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";

interface LoginPageProps {
  error?: string;
}

export const LoginPage: FC<LoginPageProps> = ({ error }) => {
  return (
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4 py-12">
      <div class="w-full max-w-md">
        {/* Logo / Title */}
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-500 text-white text-2xl font-bold mb-4 shadow-lg shadow-brand-200">
            p8
          </div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Welcome back</h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Sign in to your petm8 account</p>
        </div>

        {/* Card */}
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg shadow-gray-200/60 dark:shadow-none border border-gray-100 dark:border-gray-700 p-8">
          {/* Error message */}
          <div
            id="login-error"
            class={`mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 ${
              error ? "" : "hidden"
            }`}
            role="alert"
          >
            {error || ""}
          </div>

          <form id="login-form" class="space-y-5" onsubmit="return false;">
            <Input
              label="Email address"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              autocomplete="email"
            />

            <Input
              label="Password"
              name="password"
              type="password"
              placeholder="Enter your password"
              required
              autocomplete="current-password"
            />

            <div class="flex items-center justify-between">
              <label class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  name="remember"
                  class="rounded border-gray-300 text-brand-500 focus:ring-brand-300"
                />
                Remember me
              </label>
              <a href="/auth/forgot-password" class="text-sm text-brand-600 hover:text-brand-700 font-medium">
                Forgot password?
              </a>
            </div>

            <Button type="submit" variant="primary" size="lg" class="w-full" id="login-btn">
              Sign In
            </Button>
          </form>

          <div class="my-6 flex items-center gap-3">
            <div class="h-px flex-1 bg-gray-200 dark:bg-gray-700"></div>
            <span class="text-xs uppercase tracking-wide text-gray-400">Or continue with</span>
            <div class="h-px flex-1 bg-gray-200 dark:bg-gray-700"></div>
          </div>

          <div class="space-y-3">
            <a
              id="oauth-google"
              href="/api/auth/oauth/google/start?source=login"
              class="flex w-full items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Continue with Google
            </a>
            <a
              id="oauth-apple"
              href="/api/auth/oauth/apple/start?source=login"
              class="flex w-full items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Continue with Apple
            </a>
            <a
              id="oauth-meta"
              href="/api/auth/oauth/meta/start?source=login"
              class="flex w-full items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Continue with Meta
            </a>
          </div>

          <div class="mt-6 text-center">
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Don't have an account?{" "}
              <a href="/auth/register" class="text-brand-600 hover:text-brand-700 font-semibold">
                Register
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Client-side form handler */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            function getAnalyticsSessionId() {
              var key = 'petm8-analytics-session';
              try {
                return sessionStorage.getItem(key) || localStorage.getItem(key) || '';
              } catch (_) {
                return '';
              }
            }

            function getSafeRedirect() {
              var params = new URLSearchParams(window.location.search);
              var redirect = params.get('redirect');
              if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) {
                return redirect;
              }
              return '';
            }

            (function setupOAuthLinks() {
              var redirect = getSafeRedirect();
              if (!redirect) return;
              ['oauth-google', 'oauth-apple', 'oauth-meta'].forEach(function(id) {
                var link = document.getElementById(id);
                if (!link) return;
                var url = new URL(link.getAttribute('href'), window.location.origin);
                url.searchParams.set('redirect', redirect);
                link.setAttribute('href', url.pathname + url.search);
              });
            })();

            document.getElementById('login-form').addEventListener('submit', async function(e) {
              e.preventDefault();
              var btn = document.getElementById('login-btn');
              var errorEl = document.getElementById('login-error');
              btn.disabled = true;
              btn.textContent = 'Signing in...';
              errorEl.classList.add('hidden');

              try {
                var formData = new FormData(this);
                var sessionId = getAnalyticsSessionId();
                var res = await fetch('/api/auth/login', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    ...(sessionId ? { 'x-session-id': sessionId } : {}),
                  },
                  body: JSON.stringify({
                    email: formData.get('email'),
                    password: formData.get('password'),
                    rememberMe: !!formData.get('remember'),
                  }),
                });

                if (!res.ok) {
                  var data = await res.json().catch(function() { return {}; });
                  throw new Error(data.message || 'Invalid email or password');
                }

                window.location.href = '/account';
              } catch (err) {
                errorEl.textContent = err.message;
                errorEl.classList.remove('hidden');
                var announcer = document.getElementById('announcer');
                if (announcer) announcer.textContent = 'Sign in failed: ' + err.message;
                btn.disabled = false;
                btn.textContent = 'Sign In';
              }
            });
          `,
        }}
      />
    </div>
  );
};
