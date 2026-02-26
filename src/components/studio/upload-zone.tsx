import type { FC } from "hono/jsx";

interface UploadZoneProps {
  /** Pre-filled image URL if editing or re-uploading */
  existingImageUrl?: string;
  /** Name attribute for form submission */
  name?: string;
}

export const UploadZone: FC<UploadZoneProps> = ({
  existingImageUrl,
  name = "petPhoto",
}) => {
  return (
    <div
      data-upload-zone
      data-input-name={name}
      class="relative flex flex-col items-center justify-center w-full min-h-[280px] rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 transition-colors duration-200 cursor-pointer hover:border-brand-400 dark:hover:border-brand-500 hover:bg-brand-50/30 dark:hover:bg-brand-900/20"
    >
      {/* Idle state (shown when no preview) */}
      <div data-upload-idle class={existingImageUrl ? "hidden" : "flex flex-col items-center gap-3 p-8 text-center"}>
        {/* Upload icon */}
        <div class="flex items-center justify-center w-16 h-16 rounded-full bg-brand-100 dark:bg-brand-900/30 text-brand-500 dark:text-brand-400">
          <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        </div>
        <div>
          <p class="text-base font-semibold text-gray-700 dark:text-gray-300">Drop your pet's photo here</p>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">or click to browse</p>
        </div>
        <p class="text-xs text-gray-400 dark:text-gray-500">JPEG, PNG, or WebP -- max 10 MB</p>
      </div>

      {/* Preview state */}
      <div
        data-upload-preview
        class={existingImageUrl ? "flex flex-col items-center gap-4 p-4" : "hidden flex-col items-center gap-4 p-4"}
      >
        <div class="relative w-full max-w-xs aspect-square rounded-xl overflow-hidden bg-white dark:bg-gray-900 shadow-sm border border-gray-200 dark:border-gray-700">
          <img
            data-upload-preview-img
            src={existingImageUrl || ""}
            alt="Pet photo preview"
            class="w-full h-full object-cover"
          />
        </div>
        <button
          type="button"
          data-upload-change
          class="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
          </svg>
          Change photo
        </button>
      </div>

      {/* Error message */}
      <p data-upload-error class="hidden mt-2 text-xs text-red-500 text-center px-4"></p>

      {/* Active drag overlay */}
      <div
        data-upload-drag-overlay
        class="hidden absolute inset-0 z-10 rounded-2xl bg-brand-500/10 border-2 border-brand-500 flex items-center justify-center"
      >
        <p class="text-sm font-semibold text-brand-600">Drop it!</p>
      </div>

      {/* Hidden file input */}
      <input
        type="file"
        name={name}
        data-upload-input
        accept="image/jpeg,image/png,image/webp"
        class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
      />
    </div>
  );
};
