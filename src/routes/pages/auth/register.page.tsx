import type { FC } from "hono/jsx";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";

interface RegisterPageProps {
  error?: string;
}

export const RegisterPage: FC<RegisterPageProps> = ({ error }) => {
  return (
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4 py-12">
      <div class="w-full max-w-md">
        {/* Logo / Title */}
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-500 text-white text-2xl font-bold mb-4 shadow-lg shadow-brand-200">
            p8
          </div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Create your account</h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Join the petm8 community</p>
        </div>

        {/* Card */}
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg shadow-gray-200/60 dark:shadow-none border border-gray-100 dark:border-gray-700 p-8">
          {/* Error message */}
          <div
            id="register-error"
            class={`mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 ${
              error ? "" : "hidden"
            }`}
            role="alert"
          >
            {error || ""}
          </div>

          <form id="register-form" class="space-y-5" onsubmit="return false;">
            <Input
              label="Full name"
              name="name"
              type="text"
              placeholder="Jane Smith"
              required
              autocomplete="name"
            />

            <Input
              label="Email address"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              autocomplete="email"
            />

            <div>
              <Input
                label="Password"
                name="password"
                type="password"
                placeholder="Create a password"
                required
                autocomplete="new-password"
              />
              <ul class="mt-2 space-y-1 text-xs text-gray-400">
                <li id="req-length" class="flex items-center gap-1.5">
                  <span class="inline-block w-1.5 h-1.5 rounded-full bg-gray-300" id="dot-length"></span>
                  At least 8 characters
                </li>
                <li id="req-upper" class="flex items-center gap-1.5">
                  <span class="inline-block w-1.5 h-1.5 rounded-full bg-gray-300" id="dot-upper"></span>
                  One uppercase letter
                </li>
                <li id="req-number" class="flex items-center gap-1.5">
                  <span class="inline-block w-1.5 h-1.5 rounded-full bg-gray-300" id="dot-number"></span>
                  One number
                </li>
              </ul>
            </div>

            <Input
              label="Confirm password"
              name="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              required
              autocomplete="new-password"
            />

            <label class="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                name="tos"
                required
                class="mt-0.5 rounded border-gray-300 text-brand-500 focus:ring-brand-300"
              />
              <span>
                I agree to the{" "}
                <a href="/about" class="text-brand-600 hover:text-brand-700 underline" target="_blank">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="/about" class="text-brand-600 hover:text-brand-700 underline" target="_blank">
                  Privacy Policy
                </a>
              </span>
            </label>

            <Button type="submit" variant="primary" size="lg" class="w-full" id="register-btn">
              Create Account
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
              href="/api/auth/oauth/google/start?source=register"
              class="flex w-full items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Continue with Google
            </a>
            <a
              id="oauth-apple"
              href="/api/auth/oauth/apple/start?source=register"
              class="flex w-full items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Continue with Apple
            </a>
            <a
              id="oauth-meta"
              href="/api/auth/oauth/meta/start?source=register"
              class="flex w-full items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Continue with Meta
            </a>
          </div>

          <div class="mt-6 text-center">
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Already have an account?{" "}
              <a href="/auth/login" class="text-brand-600 hover:text-brand-700 font-semibold">
                Sign In
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Client-side form handler */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
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

              var pwInput = document.querySelector('input[name="password"]');
              if (pwInput) {
                pwInput.addEventListener('input', function() {
                  var pw = this.value;
                  toggleReq('dot-length', 'req-length', pw.length >= 8);
                  toggleReq('dot-upper', 'req-upper', /[A-Z]/.test(pw));
                  toggleReq('dot-number', 'req-number', /[0-9]/.test(pw));
                });
              }

              function toggleReq(dotId, reqId, met) {
                var dot = document.getElementById(dotId);
                var req = document.getElementById(reqId);
                if (met) {
                  dot.className = 'inline-block w-1.5 h-1.5 rounded-full bg-green-500';
                  req.className = 'flex items-center gap-1.5 text-green-600';
                } else {
                  dot.className = 'inline-block w-1.5 h-1.5 rounded-full bg-gray-300';
                  req.className = 'flex items-center gap-1.5';
                }
              }

              document.getElementById('register-form').addEventListener('submit', async function(e) {
                e.preventDefault();
                var btn = document.getElementById('register-btn');
                var errorEl = document.getElementById('register-error');
                btn.disabled = true;
                btn.textContent = 'Creating account...';
                errorEl.classList.add('hidden');

                var formData = new FormData(this);
                var password = formData.get('password');
                var confirmPassword = formData.get('confirmPassword');

                if (password !== confirmPassword) {
                  errorEl.textContent = 'Passwords do not match';
                  errorEl.classList.remove('hidden');
                  btn.disabled = false;
                  btn.textContent = 'Create Account';
                  return;
                }

                if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
                  errorEl.textContent = 'Password does not meet requirements';
                  errorEl.classList.remove('hidden');
                  btn.disabled = false;
                  btn.textContent = 'Create Account';
                  return;
                }

                if (!formData.get('tos')) {
                  errorEl.textContent = 'You must agree to the Terms of Service';
                  errorEl.classList.remove('hidden');
                  btn.disabled = false;
                  btn.textContent = 'Create Account';
                  return;
                }

                try {
                  var sessionId = getAnalyticsSessionId();
                  var res = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      ...(sessionId ? { 'x-session-id': sessionId } : {}),
                    },
                    body: JSON.stringify({
                      name: formData.get('name'),
                      email: formData.get('email'),
                      password: password,
                    }),
                  });

                  if (!res.ok) {
                    var data = await res.json().catch(function() { return {}; });
                    throw new Error(data.message || 'Registration failed. Please try again.');
                  }

                  window.location.href = '/account';
                } catch (err) {
                  errorEl.textContent = err.message;
                  errorEl.classList.remove('hidden');
                  var announcer = document.getElementById('announcer');
                  if (announcer) announcer.textContent = 'Registration failed: ' + err.message;
                  btn.disabled = false;
                  btn.textContent = 'Create Account';
                }
              });
            })();
          `,
        }}
      />
    </div>
  );
};
