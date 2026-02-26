import type { FC } from "hono/jsx";
import type { ArtTemplate } from "../../../components/studio/template-picker";
import { Button } from "../../../components/ui/button";

interface StudioGalleryPageProps {
  templates: ArtTemplate[];
  categories: string[];
  activeCategory?: string;
}

export const StudioGalleryPage: FC<StudioGalleryPageProps> = ({
  templates,
  categories,
  activeCategory,
}) => {
  const filteredTemplates = activeCategory
    ? templates.filter((t) => t.category === activeCategory)
    : templates;

  return (
    <div class="max-w-6xl mx-auto px-4 py-8 sm:py-12">
      {/* Header */}
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Art Style Gallery</h1>
        <p class="mt-2 text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
          Browse our collection of AI art styles. Pick one and turn your pet's photo into a masterpiece.
        </p>
      </div>

      {/* Category tabs */}
      {categories.length > 0 && (
        <div class="flex items-center justify-center gap-2 flex-wrap mb-8" data-category-tabs>
          <a
            href="/studio/gallery"
            class={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-150 ${
              !activeCategory
                ? "bg-brand-500 text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            All
          </a>
          {categories.map((category) => (
            <a
              key={category}
              href={`/studio/gallery?category=${encodeURIComponent(category)}`}
              class={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-150 ${
                activeCategory === category
                  ? "bg-brand-500 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {category}
            </a>
          ))}
        </div>
      )}

      {/* Template grid */}
      {filteredTemplates.length > 0 ? (
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              class="group flex flex-col rounded-2xl bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden border border-gray-100 dark:border-gray-700"
            >
              {/* Preview image */}
              <div class="relative aspect-[4/3] overflow-hidden bg-gray-50">
                <img
                  src={template.previewUrl}
                  alt={`${template.name} style preview`}
                  class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                {/* Category badge */}
                <span class="absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full bg-white/90 text-gray-700 backdrop-blur-sm shadow-sm">
                  {template.category}
                </span>
              </div>

              {/* Info */}
              <div class="flex flex-col flex-1 p-5">
                <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors duration-200">
                  {template.name}
                </h3>
                <p class="mt-1.5 text-sm text-gray-500 dark:text-gray-400 line-clamp-2 flex-1">
                  {template.description}
                </p>

                {/* CTA */}
                <div class="mt-4">
                  <Button
                    variant="primary"
                    size="sm"
                    href={`/studio/create?templateId=${template.id}`}
                    class="w-full"
                  >
                    <svg class="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                    Start Creating
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div class="text-center py-16">
          <svg class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
          </svg>
          <h3 class="text-lg font-semibold text-gray-700">No templates found</h3>
          <p class="mt-1 text-sm text-gray-500">
            {activeCategory
              ? `No templates in the "${activeCategory}" category yet.`
              : "No templates are available at the moment."}
          </p>
          {activeCategory && (
            <Button variant="outline" size="sm" href="/studio/gallery" class="mt-4">
              View All Templates
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
