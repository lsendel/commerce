import type { FC } from "hono/jsx";
import { html } from "hono/html";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Select } from "../../../components/ui/select";
import { Badge } from "../../../components/ui/badge";
import { Modal } from "../../../components/ui/modal";

interface SettingsPageProps {
  user: {
    name: string;
    email: string;
    avatarUrl?: string | null;
    emailVerifiedAt?: string | null;
    locale?: string;
    timezone?: string;
    marketingOptIn?: boolean;
  };
}

const LOCALE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "es", label: "Espa\u00f1ol" },
  { value: "fr", label: "Fran\u00e7ais" },
  { value: "de", label: "Deutsch" },
  { value: "pt", label: "Portugu\u00eas" },
  { value: "ja", label: "\u65e5\u672c\u8a9e" },
];

const TIMEZONE_OPTIONS = [
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "Eastern Time (US)" },
  { value: "America/Chicago", label: "Central Time (US)" },
  { value: "America/Denver", label: "Mountain Time (US)" },
  { value: "America/Los_Angeles", label: "Pacific Time (US)" },
  { value: "Europe/London", label: "London" },
  { value: "Europe/Paris", label: "Paris" },
  { value: "Europe/Berlin", label: "Berlin" },
  { value: "Asia/Tokyo", label: "Tokyo" },
  { value: "Asia/Shanghai", label: "Shanghai" },
  { value: "Australia/Sydney", label: "Sydney" },
];

export const SettingsPage: FC<SettingsPageProps> = ({ user }) => {
  const isVerified = !!user.emailVerifiedAt;

  return (
    <div class="max-w-3xl mx-auto px-4 py-8">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage your profile, preferences, and security.
          </p>
        </div>
        <a
          href="/account"
          class="text-sm text-brand-600 hover:text-brand-700 font-medium"
        >
          Back to Account
        </a>
      </div>

      {/* Profile Section */}
      <section class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 mb-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-5">Profile</h2>

        <div id="profile-success" class="hidden mb-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-sm px-4 py-3" role="status" />
        <div id="profile-error" class="hidden mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3" role="alert" />

        <form id="profile-form" class="space-y-5">
          {/* Avatar */}
          <div class="flex items-center gap-4">
            <div class="w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center overflow-hidden ring-2 ring-brand-100">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} class="w-full h-full object-cover" />
              ) : (
                <span class="text-2xl font-bold text-brand-500">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div class="text-sm text-gray-500 dark:text-gray-400">
              Avatar changes coming soon
            </div>
          </div>

          <Input
            label="Full name"
            name="name"
            value={user.name}
            required
            autocomplete="name"
          />

          <div class="flex flex-col gap-1.5">
            <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
            <div class="flex items-center gap-2">
              <span class="text-sm text-gray-900 dark:text-gray-100">{user.email}</span>
              {isVerified ? (
                <Badge variant="success">Verified</Badge>
              ) : (
                <button
                  type="button"
                  id="verify-email-btn"
                  class="text-xs font-semibold text-brand-600 hover:text-brand-700"
                >
                  Verify email
                </button>
              )}
            </div>
          </div>

          <Button type="submit" variant="primary" id="profile-save-btn">
            Save Profile
          </Button>
        </form>
      </section>

      {/* Preferences Section */}
      <section class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 mb-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-5">Preferences</h2>

        <div id="prefs-success" class="hidden mb-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-sm px-4 py-3" role="status" />
        <div id="prefs-error" class="hidden mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3" role="alert" />

        <form id="prefs-form" class="space-y-5">
          <Select
            label="Language"
            name="locale"
            options={LOCALE_OPTIONS}
            value={user.locale || "en"}
          />

          <Select
            label="Timezone"
            name="timezone"
            options={TIMEZONE_OPTIONS}
            value={user.timezone || "UTC"}
          />

          <label class="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="marketingOptIn"
              checked={!!user.marketingOptIn}
              class="rounded border-gray-300 text-brand-500 focus:ring-brand-300 w-4 h-4"
            />
            <div>
              <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Marketing emails</span>
              <p class="text-xs text-gray-500 dark:text-gray-400">Receive news, promotions, and product updates</p>
            </div>
          </label>

          <Button type="submit" variant="primary" id="prefs-save-btn">
            Save Preferences
          </Button>
        </form>
      </section>

      {/* Change Password Section */}
      <section class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 mb-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-5">Change Password</h2>

        <div id="pw-success" class="hidden mb-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-sm px-4 py-3" role="status" />
        <div id="pw-error" class="hidden mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3" role="alert" />

        <form id="password-form" class="space-y-5">
          <Input
            label="Current password"
            name="currentPassword"
            type="password"
            required
            autocomplete="current-password"
          />

          <Input
            label="New password"
            name="newPassword"
            type="password"
            placeholder="At least 8 characters"
            required
            autocomplete="new-password"
          />

          <Input
            label="Confirm new password"
            name="confirmPassword"
            type="password"
            required
            autocomplete="new-password"
          />

          <Button type="submit" variant="primary" id="pw-save-btn">
            Update Password
          </Button>
        </form>
      </section>

      {/* Danger Zone */}
      <section class="bg-white dark:bg-gray-800 rounded-2xl border border-red-200 dark:border-red-800 shadow-sm p-6">
        <h2 class="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">Danger Zone</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Permanently delete your account and all associated data. This cannot be undone.
        </p>
        <Button type="button" variant="danger" data-modal-open="delete-account-modal">
          Delete Account
        </Button>
      </section>

      {/* Delete Account Modal */}
      <Modal id="delete-account-modal" title="Delete Account" size="sm">
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Are you absolutely sure? This will permanently delete your account, orders, addresses, and all data.
          This action <strong>cannot be undone</strong>.
        </p>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Type <strong class="text-red-600">DELETE</strong> below to confirm:
        </p>
        <Input name="deleteConfirm" id="delete-confirm-input" placeholder="Type DELETE to confirm" />
        <div class="flex items-center gap-3 mt-4">
          <Button type="button" variant="danger" id="delete-account-btn" disabled>
            Delete My Account
          </Button>
          <Button type="button" variant="ghost" data-modal-close="delete-account-modal">
            Cancel
          </Button>
        </div>
      </Modal>

      {/* Static trusted script — no user input interpolated */}
      {html`
        <script>
          (function() {
            /* Profile form */
            var profileForm = document.getElementById('profile-form');
            if (profileForm) {
              profileForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                var btn = document.getElementById('profile-save-btn');
                var successEl = document.getElementById('profile-success');
                var errorEl = document.getElementById('profile-error');
                btn.disabled = true;
                successEl.classList.add('hidden');
                errorEl.classList.add('hidden');

                var fd = new FormData(this);
                try {
                  var res = await fetch('/api/auth/profile', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: fd.get('name') }),
                  });
                  if (!res.ok) {
                    var data = await res.json().catch(function() { return {}; });
                    throw new Error(data.message || 'Failed to update profile');
                  }
                  successEl.textContent = 'Profile updated successfully.';
                  successEl.classList.remove('hidden');
                } catch (err) {
                  errorEl.textContent = err.message;
                  errorEl.classList.remove('hidden');
                } finally {
                  btn.disabled = false;
                }
              });
            }

            /* Preferences form */
            var prefsForm = document.getElementById('prefs-form');
            if (prefsForm) {
              prefsForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                var btn = document.getElementById('prefs-save-btn');
                var successEl = document.getElementById('prefs-success');
                var errorEl = document.getElementById('prefs-error');
                btn.disabled = true;
                successEl.classList.add('hidden');
                errorEl.classList.add('hidden');

                var fd = new FormData(this);
                try {
                  var res = await fetch('/api/auth/profile', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      locale: fd.get('locale'),
                      timezone: fd.get('timezone'),
                      marketingOptIn: !!fd.get('marketingOptIn'),
                    }),
                  });
                  if (!res.ok) {
                    var data = await res.json().catch(function() { return {}; });
                    throw new Error(data.message || 'Failed to update preferences');
                  }
                  successEl.textContent = 'Preferences saved.';
                  successEl.classList.remove('hidden');
                } catch (err) {
                  errorEl.textContent = err.message;
                  errorEl.classList.remove('hidden');
                } finally {
                  btn.disabled = false;
                }
              });
            }

            /* Password form */
            var pwForm = document.getElementById('password-form');
            if (pwForm) {
              pwForm.addEventListener('submit', async function(e) {
                e.preventDefault();
                var btn = document.getElementById('pw-save-btn');
                var successEl = document.getElementById('pw-success');
                var errorEl = document.getElementById('pw-error');
                btn.disabled = true;
                successEl.classList.add('hidden');
                errorEl.classList.add('hidden');

                var fd = new FormData(this);
                var newPw = fd.get('newPassword');
                var confirmPw = fd.get('confirmPassword');

                if (newPw !== confirmPw) {
                  errorEl.textContent = 'New passwords do not match.';
                  errorEl.classList.remove('hidden');
                  btn.disabled = false;
                  return;
                }

                try {
                  var res = await fetch('/api/auth/change-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      currentPassword: fd.get('currentPassword'),
                      newPassword: newPw,
                    }),
                  });
                  if (!res.ok) {
                    var data = await res.json().catch(function() { return {}; });
                    throw new Error(data.message || 'Failed to change password');
                  }
                  successEl.textContent = 'Password updated successfully.';
                  successEl.classList.remove('hidden');
                  pwForm.reset();
                } catch (err) {
                  errorEl.textContent = err.message;
                  errorEl.classList.remove('hidden');
                } finally {
                  btn.disabled = false;
                }
              });
            }

            /* Delete account confirmation */
            var deleteInput = document.getElementById('delete-confirm-input');
            var deleteBtn = document.getElementById('delete-account-btn');
            if (deleteInput && deleteBtn) {
              deleteInput.addEventListener('input', function() {
                deleteBtn.disabled = this.value !== 'DELETE';
              });

              deleteBtn.addEventListener('click', async function() {
                this.disabled = true;
                this.textContent = 'Deleting...';
                try {
                  var res = await fetch('/api/auth/profile', {
                    method: 'DELETE',
                  });
                  if (!res.ok) throw new Error('Failed to delete account');
                  window.location.href = '/';
                } catch (err) {
                  alert(err.message);
                  this.disabled = false;
                  this.textContent = 'Delete My Account';
                }
              });
            }

            /* Verify email button */
            var verifyBtn = document.getElementById('verify-email-btn');
            if (verifyBtn) {
              verifyBtn.addEventListener('click', async function() {
                this.textContent = 'Sending...';
                this.disabled = true;
                try {
                  var res = await fetch('/api/auth/request-verification', { method: 'POST' });
                  if (!res.ok) throw new Error('Failed to send verification email');
                  this.textContent = 'Email sent!';
                } catch (err) {
                  this.textContent = 'Verify email';
                  this.disabled = false;
                  alert(err.message);
                }
              });
            }
          })();
        </script>
      `}
    </div>
  );
};
