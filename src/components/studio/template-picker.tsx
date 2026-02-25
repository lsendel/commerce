import type { FC } from "hono/jsx";

export interface ArtTemplate {
  id: string;
  name: string;
  description: string;
  previewUrl: string;
  category: string;
}

interface TemplatePickerProps {
  templates: ArtTemplate[];
  selectedId?: string;
  showCustomPrompt?: boolean;
}

export const TemplatePicker: FC<TemplatePickerProps> = ({
  templates,
  selectedId,
  showCustomPrompt = true,
}) => {
  return (
    <div data-template-picker>
      {/* Template grid */}
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => {
          const isSelected = template.id === selectedId;
          return (
            <button
              key={template.id}
              type="button"
              data-template-card
              data-template-id={template.id}
              class={`group relative flex flex-col rounded-2xl border-2 overflow-hidden bg-white text-left transition-all duration-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 ${
                isSelected
                  ? "border-brand-500 shadow-md ring-2 ring-brand-200"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              {/* Preview image */}
              <div class="relative aspect-[4/3] overflow-hidden bg-gray-50">
                <img
                  src={template.previewUrl}
                  alt={`${template.name} style preview`}
                  class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                {/* Selected checkmark */}
                {isSelected && (
                  <div class="absolute top-3 right-3 flex items-center justify-center w-7 h-7 rounded-full bg-brand-500 text-white shadow-sm">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Info */}
              <div class="p-4">
                <h3 class="text-sm font-semibold text-gray-900">{template.name}</h3>
                <p class="mt-1 text-xs text-gray-500 line-clamp-2">{template.description}</p>
              </div>

              {/* Category pill */}
              <div class="px-4 pb-3">
                <span class="inline-block text-[11px] font-medium text-gray-500 bg-gray-100 rounded-full px-2.5 py-0.5">
                  {template.category}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Custom prompt area */}
      {showCustomPrompt && (
        <div class="mt-6">
          <label for="custom-prompt" class="block text-sm font-medium text-gray-700 mb-1.5">
            Custom Prompt <span class="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            id="custom-prompt"
            name="customPrompt"
            data-custom-prompt
            rows={3}
            placeholder="Describe any customizations, e.g. 'Make the background a sunset over the ocean'"
            class="block w-full rounded-xl border border-gray-300 px-4 py-3 text-sm placeholder:text-gray-400 transition-colors duration-150 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 resize-none"
          />
        </div>
      )}

      {/* Hidden input for selected template ID */}
      <input type="hidden" name="templateId" data-selected-template-id value={selectedId || ""} />
    </div>
  );
};
