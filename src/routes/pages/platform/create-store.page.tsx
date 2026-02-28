import type { FC } from "hono/jsx";
import { html } from "hono/html";

export const CreateStorePage: FC<{ isAuthenticated: boolean }> = ({
  isAuthenticated,
}) => {
  return (
    <div class="max-w-2xl mx-auto py-12 px-4">
      <h1 class="text-3xl font-bold mb-2 text-gray-900 dark:text-gray-100">Create Your Store</h1>
      <p class="text-gray-600 dark:text-gray-400 mb-8">
        Launch your own online store in minutes. Choose a name, customize your
        branding, and start selling.
      </p>

      {!isAuthenticated ? (
        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p class="text-yellow-800">
            Please{" "}
            <a href="/auth/login" class="underline font-medium">
              sign in
            </a>{" "}
            or{" "}
            <a href="/auth/register" class="underline font-medium">
              create an account
            </a>{" "}
            to create a store.
          </p>
        </div>
      ) : (
        <form id="create-store-form" class="space-y-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Store Name
            </label>
            <input
              type="text"
              name="name"
              required
              minLength={2}
              maxLength={100}
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-brand-300 focus:border-brand-400"
              placeholder="My Awesome Store"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Store URL Slug
            </label>
            <div class="flex items-center">
              <span class="text-gray-500 dark:text-gray-400 mr-1">https://</span>
              <input
                type="text"
                name="slug"
                id="slug-input"
                required
                minLength={2}
                maxLength={50}
                pattern="[a-z0-9-]+"
                class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-brand-300 focus:border-brand-400"
                placeholder="my-store"
              />
              <span class="text-gray-500 dark:text-gray-400 ml-1">.petm8.io</span>
            </div>
            <p id="slug-status" class="text-xs text-gray-500 mt-1">
              Lowercase letters, numbers, and hyphens only
            </p>
          </div>

          {/* Logo Upload */}
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Store Logo (optional)
            </label>
            <input
              type="file"
              name="logo"
              accept="image/*"
              class="text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
            />
            <p class="text-xs text-gray-500 mt-1">PNG or JPG, max 2MB</p>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Primary Color
              </label>
              <div class="flex items-center gap-3">
                <input
                  type="color"
                  name="primaryColor"
                  id="primary-color"
                  value="#4F46E5"
                  class="w-10 h-10 rounded border border-gray-300 cursor-pointer"
                />
                <div id="primary-preview" class="w-20 h-10 rounded-lg" style="background-color: #4F46E5" />
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Secondary Color
              </label>
              <div class="flex items-center gap-3">
                <input
                  type="color"
                  name="secondaryColor"
                  id="secondary-color"
                  value="#10B981"
                  class="w-10 h-10 rounded border border-gray-300 cursor-pointer"
                />
                <div id="secondary-preview" class="w-20 h-10 rounded-lg" style="background-color: #10B981" />
              </div>
            </div>
          </div>

          <button
            type="submit"
            class="w-full bg-brand-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-brand-700 transition-colors"
          >
            Create Store
          </button>
        </form>
      )}

      {html`<script>
        document.addEventListener('DOMContentLoaded', function() {
          var pc = document.getElementById('primary-color');
          var pp = document.getElementById('primary-preview');
          var sc = document.getElementById('secondary-color');
          var sp = document.getElementById('secondary-preview');
          if (pc && pp) pc.addEventListener('input', function() { pp.style.backgroundColor = pc.value; });
          if (sc && sp) sc.addEventListener('input', function() { sp.style.backgroundColor = sc.value; });
        });
      </script>`}
      {html`<script src="/scripts/platform.js"></script>`}
    </div>
  );
};
