import type { FC } from "hono/jsx";

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
                required
                minLength={2}
                maxLength={50}
                pattern="[a-z0-9-]+"
                class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-brand-300 focus:border-brand-400"
                placeholder="my-store"
              />
              <span class="text-gray-500 dark:text-gray-400 ml-1">.petm8.io</span>
            </div>
            <p class="text-xs text-gray-500 mt-1">
              Lowercase letters, numbers, and hyphens only
            </p>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Primary Color
              </label>
              <input
                type="color"
                name="primaryColor"
                value="#4F46E5"
                class="w-full h-10 rounded border border-gray-300"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Secondary Color
              </label>
              <input
                type="color"
                name="secondaryColor"
                value="#10B981"
                class="w-full h-10 rounded border border-gray-300"
              />
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

      <script src="/scripts/platform.js" />
    </div>
  );
};
