import type { FC } from "hono/jsx";

type StepStatus = "pending" | "active" | "complete";

interface Step {
  key: string;
  label: string;
  icon: string;
}

const steps: Step[] = [
  { key: "upload", label: "Upload", icon: "M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" },
  { key: "style", label: "Style", icon: "M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" },
  { key: "generate", label: "Generate", icon: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" },
  { key: "done", label: "Done", icon: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
];

interface GenerationProgressProps {
  jobId?: string;
  /** Current active step key: upload | style | generate | done */
  currentStep?: string;
  /** Estimated time remaining in seconds */
  estimatedSeconds?: number;
  /** Error message if generation failed */
  error?: string;
}

export const GenerationProgress: FC<GenerationProgressProps> = ({
  jobId,
  currentStep = "upload",
  estimatedSeconds,
  error,
}) => {
  const currentIndex = steps.findIndex((s) => s.key === currentStep);

  const getStatus = (index: number): StepStatus => {
    if (index < currentIndex) return "complete";
    if (index === currentIndex) return "active";
    return "pending";
  };

  return (
    <div
      data-generation-progress
      data-job-id={jobId || ""}
      class="w-full max-w-2xl mx-auto"
    >
      {/* Step indicators */}
      <div class="flex items-center justify-between">
        {steps.map((step, i) => {
          const status = getStatus(i);
          const isLast = i === steps.length - 1;

          return (
            <div key={step.key} class="flex items-center flex-1 last:flex-none">
              {/* Step circle + label */}
              <div class="flex flex-col items-center gap-2" data-step={step.key}>
                <div
                  class={`relative flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 ${
                    status === "complete"
                      ? "bg-brand-500 border-brand-500 text-white"
                      : status === "active"
                        ? "bg-white border-brand-500 text-brand-500"
                        : "bg-white border-gray-300 text-gray-400"
                  }`}
                >
                  {status === "complete" ? (
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : (
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d={step.icon} />
                    </svg>
                  )}

                  {/* Pulse animation for active step */}
                  {status === "active" && (
                    <span class="absolute inset-0 rounded-full animate-ping bg-brand-400/30" />
                  )}
                </div>

                <span
                  class={`text-xs font-medium whitespace-nowrap ${
                    status === "complete"
                      ? "text-brand-600"
                      : status === "active"
                        ? "text-brand-600"
                        : "text-gray-400"
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div class="flex-1 h-0.5 mx-3 mb-7">
                  <div
                    class={`h-full rounded-full transition-colors duration-300 ${
                      i < currentIndex ? "bg-brand-500" : "bg-gray-200"
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Status text */}
      <div class="mt-6 text-center">
        {error ? (
          <div class="inline-flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2">
            <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <span data-progress-error>{error}</span>
          </div>
        ) : currentStep === "done" ? (
          <p class="text-sm font-medium text-green-600">Your artwork is ready!</p>
        ) : (
          <div class="flex flex-col items-center gap-1">
            {/* Spinner */}
            <div class="flex items-center gap-2">
              <svg class="animate-spin w-4 h-4 text-brand-500" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span data-progress-status class="text-sm text-gray-600">
                Processing your pet's photo...
              </span>
            </div>
            {estimatedSeconds !== undefined && estimatedSeconds > 0 && (
              <p data-progress-eta class="text-xs text-gray-400">
                Estimated: ~{estimatedSeconds}s remaining
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
