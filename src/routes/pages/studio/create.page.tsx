import type { FC } from "hono/jsx";
import { UploadZone } from "../../../components/studio/upload-zone";
import { TemplatePicker } from "../../../components/studio/template-picker";
import type { ArtTemplate } from "../../../components/studio/template-picker";
import { GenerationProgress } from "../../../components/studio/generation-progress";
import { ArtPreview } from "../../../components/studio/art-preview";
import { Button } from "../../../components/ui/button";

interface PetProfile {
  id: string;
  name: string;
  species: string;
  breed?: string;
  photoUrl?: string;
}

interface StudioCreatePageProps {
  pets: PetProfile[];
  templates: ArtTemplate[];
  /** If resuming a job in progress */
  activeJob?: {
    id: string;
    status: string;
    step: string;
    resultUrl?: string;
    templateName?: string;
    generationTime?: number;
  };
}

export const StudioCreatePage: FC<StudioCreatePageProps> = ({
  pets,
  templates,
  activeJob,
}) => {
  const hasActiveJob = activeJob && activeJob.status !== "completed" && activeJob.status !== "failed";
  const isComplete = activeJob?.status === "completed";

  return (
    <div class="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      {/* Header */}
      <div class="text-center mb-10">
        <h1 class="text-3xl font-bold text-gray-900">AI Pet Art Studio</h1>
        <p class="mt-2 text-gray-500">
          Transform your pet's photo into unique artwork
        </p>
      </div>

      {/* Main creation form */}
      <div data-studio-form>
        {/* ── Step 1: Select or create pet profile ────────────────────────── */}
        <section data-step-section="pet" class={hasActiveJob || isComplete ? "hidden" : ""}>
          <div class="flex items-center gap-3 mb-4">
            <span class="flex items-center justify-center w-8 h-8 rounded-full bg-brand-500 text-white text-sm font-bold">1</span>
            <h2 class="text-lg font-semibold text-gray-900">Choose Your Pet</h2>
          </div>

          {/* Existing pet selector */}
          {pets.length > 0 && (
            <div class="mb-4">
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-3" data-pet-selector>
                {pets.map((pet) => (
                  <button
                    key={pet.id}
                    type="button"
                    data-pet-option
                    data-pet-id={pet.id}
                    data-pet-photo-url={pet.photoUrl || ""}
                    class="flex items-center gap-3 p-3 rounded-xl border-2 border-gray-200 bg-white hover:border-gray-300 transition-all duration-200 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                  >
                    <div class="w-12 h-12 rounded-full overflow-hidden bg-gray-100 shrink-0">
                      {pet.photoUrl ? (
                        <img src={pet.photoUrl} alt={pet.name} class="w-full h-full object-cover" />
                      ) : (
                        <div class="w-full h-full flex items-center justify-center text-gray-400">
                          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                            <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div class="min-w-0">
                      <p class="text-sm font-semibold text-gray-900 truncate">{pet.name}</p>
                      <p class="text-xs text-gray-500">{pet.species}{pet.breed ? ` - ${pet.breed}` : ""}</p>
                    </div>
                  </button>
                ))}
              </div>

              <div class="mt-3 flex items-center gap-2">
                <div class="flex-1 h-px bg-gray-200" />
                <span class="text-xs text-gray-400 uppercase tracking-wider">or</span>
                <div class="flex-1 h-px bg-gray-200" />
              </div>
            </div>
          )}

          {/* Use different photo */}
          <button
            type="button"
            data-use-new-photo
            class="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors mb-4"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Use a different photo
          </button>

          {/* Hidden pet profile ID input */}
          <input type="hidden" name="petProfileId" data-selected-pet-id value="" />
        </section>

        {/* ── Step 2: Upload pet photo ─────────────────────────────────── */}
        <section data-step-section="upload" class={hasActiveJob || isComplete ? "hidden" : "mt-8"}>
          <div class="flex items-center gap-3 mb-4">
            <span class="flex items-center justify-center w-8 h-8 rounded-full bg-brand-500 text-white text-sm font-bold">2</span>
            <h2 class="text-lg font-semibold text-gray-900">Upload Photo</h2>
          </div>
          <UploadZone />
        </section>

        {/* ── Step 3: Pick art template ────────────────────────────────── */}
        <section data-step-section="template" class={hasActiveJob || isComplete ? "hidden" : "mt-10"}>
          <div class="flex items-center gap-3 mb-4">
            <span class="flex items-center justify-center w-8 h-8 rounded-full bg-brand-500 text-white text-sm font-bold">3</span>
            <h2 class="text-lg font-semibold text-gray-900">Pick a Style</h2>
          </div>
          <TemplatePicker templates={templates} showCustomPrompt={true} />
        </section>

        {/* ── Generate button ──────────────────────────────────────────── */}
        <section data-step-section="submit" class={hasActiveJob || isComplete ? "hidden" : "mt-10"}>
          <div class="flex justify-center">
            <Button
              variant="primary"
              size="lg"
              type="button"
              data-generate-btn
              disabled={true}
              class="min-w-[200px]"
            >
              <svg class="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
              </svg>
              Generate Artwork
            </Button>
          </div>
          <p data-generate-error class="hidden mt-3 text-center text-sm text-red-500"></p>
        </section>

        {/* ── Progress ─────────────────────────────────────────────────── */}
        <section data-step-section="progress" class={hasActiveJob ? "mt-10" : "hidden mt-10"}>
          <GenerationProgress
            jobId={activeJob?.id}
            currentStep={activeJob?.step || "generate"}
            estimatedSeconds={30}
          />
        </section>

        {/* ── Result ───────────────────────────────────────────────────── */}
        <section data-step-section="result" class={isComplete ? "mt-10" : "hidden mt-10"}>
          <ArtPreview
            imageUrl={activeJob?.resultUrl}
            jobId={activeJob?.id}
            templateName={activeJob?.templateName}
            generationTime={activeJob?.generationTime}
          />

          <div class="mt-8 flex justify-center gap-4">
            <Button variant="outline" href="/studio/create">
              Create Another
            </Button>
            <Button variant="primary" href={`/studio/preview?jobId=${activeJob?.id || ""}`}>
              View Full Preview
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
};
