import type { FC } from "hono/jsx";
import { html } from "hono/html";
import { CalendarView } from "../../../components/booking/calendar-view";
import { SlotCard } from "../../../components/booking/slot-card";
import { BookingForm } from "../../../components/booking/booking-form";

interface PersonTypePrice {
  label: string;
  price: string;
}

interface Slot {
  id: string;
  time: string;
  remaining: number;
  total: number;
  status: "available" | "full" | "closed";
  prices: PersonTypePrice[];
}

interface FAQ {
  question: string;
  answer: string;
}

interface ItineraryItem {
  time: string;
  title: string;
  description?: string;
}

interface PersonType {
  key: string;
  label: string;
  unitPrice: string;
  min?: number;
  max?: number;
}

interface Review {
  id: string;
  rating: number;
  title?: string | null;
  content?: string | null;
  authorName: string;
  verified: boolean;
  helpfulCount?: number;
  isTopHelpful?: boolean;
  storeResponse?: string | null;
  createdAt: string;
}

interface ReviewSummary {
  averageRating: number;
  totalCount: number;
  distribution: Record<number, number>;
}

interface EventDetailPageProps {
  id: string;
  variantId: string;
  slug: string;
  name: string;
  description: string;
  imageUrl?: string;
  duration: string;
  location: string;
  included?: string[];
  notIncluded?: string[];
  itinerary?: ItineraryItem[];
  faqs?: FAQ[];
  cancellationPolicy?: string;
  /** Calendar props */
  calendarYear: number;
  calendarMonth: number;
  availableDates: string[];
  selectedDate?: string;
  /** Slots for the selected date */
  slots?: Slot[];
  /** Selected slot for booking form */
  selectedSlotId?: string;
  /** Person types for booking form */
  personTypes?: PersonType[];
  /** Whether waitlist is enabled for this event */
  waitlistEnabled?: boolean;
  /** Cancellation policy window in hours */
  cancellationPolicyHours?: number;
  reviews?: Review[];
  reviewSummary?: ReviewSummary | null;
  isAuthenticated?: boolean;
  isReviewIntelligenceEnabled?: boolean;
}

export const EventDetailPage: FC<EventDetailPageProps> = ({
  id,
  variantId,
  slug,
  name,
  description,
  imageUrl,
  duration,
  location,
  included,
  notIncluded,
  itinerary,
  faqs,
  cancellationPolicy,
  calendarYear,
  calendarMonth,
  availableDates,
  selectedDate,
  slots,
  selectedSlotId,
  personTypes,
  waitlistEnabled,
  cancellationPolicyHours,
  reviews = [],
  reviewSummary = null,
  isAuthenticated = false,
  isReviewIntelligenceEnabled = false,
}) => {
  const selectedSlot = slots?.find((s) => s.id === selectedSlotId);
  const baseUrl = `/events/${slug}`;

  return (
    <div class="max-w-6xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav class="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 mb-6" aria-label="Breadcrumb">
        <a href="/events" class="hover:text-brand-600 transition-colors">Events</a>
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
        <span class="text-gray-700 dark:text-gray-300 font-medium truncate">{name}</span>
      </nav>

      {/* Hero image */}
      <div class="rounded-2xl overflow-hidden mb-8 aspect-[21/9] bg-gray-100">
        {imageUrl ? (
          <img src={imageUrl} alt={name} class="w-full h-full object-cover" />
        ) : (
          <div class="w-full h-full flex items-center justify-center bg-brand-50">
            <svg class="w-20 h-20 text-brand-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
      </div>

      <div class="grid lg:grid-cols-3 gap-8">
        {/* Left content */}
        <div class="lg:col-span-2 space-y-8">
          {/* Title & meta */}
          <div>
            <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">{name}</h1>
            <div class="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              <span class="flex items-center gap-1.5">
                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {duration}
              </span>
              <span class="flex items-center gap-1.5">
                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {location}
              </span>
            </div>
          </div>

          {/* Description */}
          <div class="prose prose-gray max-w-none">
            <p class="text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">{description}</p>
          </div>

          {/* What's included */}
          {(included?.length || notIncluded?.length) && (
            <div class="grid sm:grid-cols-2 gap-4">
              {included && included.length > 0 && (
                <div class="bg-green-50 rounded-2xl p-5 border border-green-100">
                  <h3 class="font-semibold text-green-800 mb-3 flex items-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    What's Included
                  </h3>
                  <ul class="space-y-2">
                    {included.map((item) => (
                      <li class="text-sm text-green-700 flex items-start gap-2">
                        <svg class="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {notIncluded && notIncluded.length > 0 && (
                <div class="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                  <h3 class="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Not Included
                  </h3>
                  <ul class="space-y-2">
                    {notIncluded.map((item) => (
                      <li class="text-sm text-gray-600 flex items-start gap-2">
                        <svg class="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Itinerary */}
          {itinerary && itinerary.length > 0 && (
            <div>
              <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Itinerary</h2>
              <div class="relative pl-6 border-l-2 border-brand-200 dark:border-brand-700 space-y-6">
                {itinerary.map((step, idx) => (
                  <div class="relative">
                    <div class="absolute -left-[25px] w-4 h-4 rounded-full bg-brand-500 border-4 border-brand-100 dark:border-brand-900" />
                    <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
                      <span class="text-xs font-medium text-brand-600 uppercase tracking-wide">
                        {step.time}
                      </span>
                      <h4 class="font-semibold text-gray-900 dark:text-gray-100 mt-1">{step.title}</h4>
                      {step.description && (
                        <p class="text-sm text-gray-500 mt-1">{step.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FAQs */}
          {faqs && faqs.length > 0 && (
            <div>
              <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Frequently Asked Questions</h2>
              <div class="space-y-3">
                {faqs.map((faq, idx) => (
                  <details class="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                    <summary class="flex items-center justify-between p-4 cursor-pointer list-none hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <span class="font-medium text-gray-900 dark:text-gray-100 text-sm">{faq.question}</span>
                      <svg
                        class="w-4 h-4 text-gray-400 transition-transform group-open:rotate-180 flex-shrink-0 ml-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </summary>
                    <div class="px-4 pb-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      {faq.answer}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          )}

          {/* Cancellation policy */}
          {cancellationPolicy && (
            <div class="rounded-2xl bg-amber-50 border border-amber-100 p-5">
              <h3 class="font-semibold text-amber-800 mb-2 flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
                Cancellation Policy
              </h3>
              <p class="text-sm text-amber-700 leading-relaxed">{cancellationPolicy}</p>
            </div>
          )}

          {/* Reviews */}
          <section id="event-reviews" class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
            <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Reviews</h2>

            {reviewSummary && reviewSummary.totalCount > 0 && (
              <div class="grid gap-4 md:grid-cols-2 mb-6">
                <div class="rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-4">
                  <div class="flex items-end gap-3">
                    <span class="text-3xl font-bold text-gray-900 dark:text-gray-100">
                      {reviewSummary.averageRating.toFixed(1)}
                    </span>
                    <span class="text-sm text-gray-500 mb-1">out of 5</span>
                  </div>
                  <div class="mt-2 flex items-center gap-1.5 text-yellow-400">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg key={star} class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Based on {reviewSummary.totalCount} review{reviewSummary.totalCount === 1 ? "" : "s"}
                  </p>
                </div>

                <div class="space-y-2">
                  {[5, 4, 3, 2, 1].map((stars) => {
                    const count = reviewSummary.distribution[stars] ?? 0;
                    const width = reviewSummary.totalCount > 0
                      ? Math.round((count / reviewSummary.totalCount) * 100)
                      : 0;
                    return (
                      <div key={stars} class="flex items-center gap-2 text-sm">
                        <span class="w-8 text-gray-500 dark:text-gray-400">{stars}★</span>
                        <div class="h-2 flex-1 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                          <div class="h-full bg-yellow-400 rounded-full" style={`width:${width}%`} />
                        </div>
                        <span class="w-8 text-right text-gray-500 dark:text-gray-400">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {reviews.length === 0 ? (
              <p class="text-sm text-gray-500 dark:text-gray-400">No reviews yet. Be the first to share your experience.</p>
            ) : (
              <div class="space-y-4 mb-6">
                {reviews.map((review) => (
                  <article key={review.id} class="rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40 p-4">
                    <div class="flex items-center justify-between mb-2">
                      <div class="flex items-center gap-2">
                        <div class="flex items-center gap-0.5 text-yellow-400">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <svg key={star} class={`w-4 h-4 ${star <= review.rating ? "text-yellow-400" : "text-gray-300"}`} fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                        <span class="text-sm font-medium text-gray-900 dark:text-gray-100">{review.authorName}</span>
                        {review.verified && (
                          <span class="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Verified
                          </span>
                        )}
                        {isReviewIntelligenceEnabled && review.isTopHelpful && (
                          <span class="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                            Most Helpful
                          </span>
                        )}
                      </div>
                      <time class="text-xs text-gray-400">{review.createdAt}</time>
                    </div>
                    {review.title && <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">{review.title}</h3>}
                    {review.content && <p class="text-sm text-gray-600 dark:text-gray-400">{review.content}</p>}
                    {isReviewIntelligenceEnabled && (
                      <div class="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          data-event-review-helpful
                          data-review-id={review.id}
                          class="inline-flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 px-2.5 py-1 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          Helpful
                          <span data-event-helpful-count data-review-id={review.id}>
                            ({review.helpfulCount ?? 0})
                          </span>
                        </button>
                        <button
                          type="button"
                          data-event-review-report
                          data-review-id={review.id}
                          class="inline-flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 px-2.5 py-1 text-xs text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          Report
                        </button>
                      </div>
                    )}
                    {review.storeResponse && (
                      <div class="mt-3 pl-4 border-l-2 border-brand-300">
                        <p class="text-xs font-semibold text-brand-600 mb-1">Store Response</p>
                        <p class="text-sm text-gray-600 dark:text-gray-400">{review.storeResponse}</p>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}

            {isAuthenticated ? (
              <div class="rounded-xl border border-gray-100 dark:border-gray-700 p-4">
                <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">Write a review</h3>
                <div id="event-review-success" class="hidden mb-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3" role="status" />
                <div id="event-review-error" class="hidden mb-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3" role="alert" />
                <form id="event-review-form" class="space-y-3">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Rating</label>
                    <div id="event-star-rating" class="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          data-event-star={star}
                          class="event-star-btn text-gray-300 hover:text-yellow-400 transition-colors"
                          aria-label={`Rate ${star} star${star === 1 ? "" : "s"}`}
                        >
                          <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        </button>
                      ))}
                    </div>
                    <input type="hidden" name="rating" id="event-rating-input" value="0" />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title (optional)</label>
                    <input
                      type="text"
                      name="title"
                      maxlength={100}
                      class="w-full rounded-xl border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-300 focus:border-brand-400"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Review</label>
                    <textarea
                      name="content"
                      rows={4}
                      maxlength={2000}
                      class="w-full rounded-xl border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-300 focus:border-brand-400"
                    />
                  </div>
                  <button
                    type="submit"
                    class="inline-flex items-center justify-center rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
                  >
                    Submit review
                  </button>
                </form>
              </div>
            ) : (
              <div class="rounded-xl border border-gray-100 dark:border-gray-700 p-4 text-sm text-gray-600 dark:text-gray-400">
                <a href="/auth/login" class="text-brand-600 dark:text-brand-400 hover:underline font-medium">Sign in</a> to leave a review.
              </div>
            )}
          </section>
        </div>

        {/* Right sidebar - Calendar & Booking */}
        <div class="space-y-6">
          {/* Sticky booking sidebar */}
          <div class="lg:sticky lg:top-6 space-y-6">
            {/* Calendar */}
            <CalendarView
              year={calendarYear}
              month={calendarMonth}
              availableDates={availableDates}
              selectedDate={selectedDate}
              baseUrl={baseUrl}
            />

            {/* Slots for selected date */}
            {selectedDate && slots && slots.length > 0 && (
              <div>
                <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Available slots for {selectedDate}
                </h3>
                <div class="space-y-3">
                  {slots.map((slot) => (
                    <SlotCard
                      id={slot.id}
                      time={slot.time}
                      remaining={slot.remaining}
                      total={slot.total}
                      status={slot.status}
                      prices={slot.prices}
                      selected={slot.id === selectedSlotId}
                      onSelectUrl={`${baseUrl}?year=${calendarYear}&month=${calendarMonth}&date=${selectedDate}&slot=${slot.id}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Join Waitlist for full slots */}
            {selectedDate && slots && slots.length > 0 && slots.every((s) => s.status === "full") && waitlistEnabled && (
              <div class="bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800 p-5 text-center">
                <p class="text-sm text-amber-700 dark:text-amber-300 mb-3">
                  All slots for this date are full. Join the waitlist to be notified if a spot opens up.
                </p>
                <button
                  type="button"
                  data-action="join-waitlist"
                  data-availability-id={slots[0]?.id}
                  class="px-4 py-2 text-sm font-medium rounded-xl bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                >
                  Join Waitlist
                </button>
              </div>
            )}

            {selectedDate && (!slots || slots.length === 0) && (
              <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 text-center">
                <p class="text-sm text-gray-400">No slots available for this date.</p>
              </div>
            )}

            {/* Booking form for selected slot */}
            {selectedSlot && personTypes && personTypes.length > 0 && (
              <BookingForm
                slotId={selectedSlot.id}
                date={selectedDate!}
                time={selectedSlot.time}
                location={location}
                personTypes={personTypes}
                variantId={variantId}
              />
            )}

            {/* Cancellation policy preview */}
            {cancellationPolicyHours != null && cancellationPolicyHours > 0 && (
              <div class="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-600">
                <div class="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Cancellation Policy
                </div>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  Free cancellation up to {cancellationPolicyHours} hours before the event. Late cancellations may not be refunded.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {html`<script>
        function notify(message, type) {
          if (!message) return;
          if (window.showToast) {
            window.showToast(message, type || 'info');
            return;
          }
          if (type === 'error') console.error(message);
          else console.log(message);
        }

        document.addEventListener('click', async (e) => {
          const btn = e.target.closest('[data-action="join-waitlist"]');
          if (!btn) return;
          const availabilityId = btn.dataset.availabilityId;
          if (!availabilityId) return;
          btn.disabled = true;
          btn.textContent = 'Joining...';
          try {
            const res = await fetch('/api/bookings/availability/' + availabilityId + '/waitlist', { method: 'POST' });
            if (res.ok) {
              btn.textContent = 'Joined Waitlist!';
              btn.classList.replace('bg-amber-500', 'bg-green-500');
              btn.classList.replace('hover:bg-amber-600', 'hover:bg-green-600');
            } else {
              const data = await res.json().catch(() => ({}));
              notify(window.petm8GetApiErrorMessage ? window.petm8GetApiErrorMessage(data, 'Could not join waitlist') : (data.error || data.message || 'Could not join waitlist'), 'error');
              btn.disabled = false;
              btn.textContent = 'Join Waitlist';
            }
          } catch {
            notify('Could not join waitlist', 'error');
            btn.disabled = false;
            btn.textContent = 'Join Waitlist';
          }
        });

        const eventStarButtons = document.querySelectorAll('.event-star-btn');
        const eventRatingInput = document.getElementById('event-rating-input');
        let selectedEventRating = 0;

        eventStarButtons.forEach((btn) => {
          btn.addEventListener('click', () => {
            selectedEventRating = parseInt(btn.dataset.eventStar || '0', 10);
            if (eventRatingInput) {
              eventRatingInput.value = String(selectedEventRating);
            }
            eventStarButtons.forEach((starBtn) => {
              const starValue = parseInt(starBtn.dataset.eventStar || '0', 10);
              starBtn.classList.toggle('text-yellow-400', starValue <= selectedEventRating);
              starBtn.classList.toggle('text-gray-300', starValue > selectedEventRating);
            });
          });
        });

        const eventReviewForm = document.getElementById('event-review-form');
        if (eventReviewForm) {
          eventReviewForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const successEl = document.getElementById('event-review-success');
            const errorEl = document.getElementById('event-review-error');
            if (successEl) successEl.classList.add('hidden');
            if (errorEl) errorEl.classList.add('hidden');

            const formData = new FormData(eventReviewForm);
            const rating = parseInt(String(formData.get('rating') || '0'), 10);
            if (!rating || rating < 1) {
              if (errorEl) {
                errorEl.textContent = 'Please select a rating.';
                errorEl.classList.remove('hidden');
              }
              return;
            }

            const body = { rating };
            const title = formData.get('title');
            const content = formData.get('content');
            if (title) body.title = title;
            if (content) body.content = content;

            try {
              const res = await fetch('/api/products/${slug}/reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
              });
              if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(
                  window.petm8GetApiErrorMessage
                    ? window.petm8GetApiErrorMessage(data, 'Failed to submit review')
                    : (data.error || data.message || 'Failed to submit review')
                );
              }

              eventReviewForm.reset();
              selectedEventRating = 0;
              if (eventRatingInput) {
                eventRatingInput.value = '0';
              }
              eventStarButtons.forEach((starBtn) => {
                starBtn.classList.remove('text-yellow-400');
                starBtn.classList.add('text-gray-300');
              });
              if (successEl) {
                successEl.textContent = 'Review submitted! It may appear after moderation.';
                successEl.classList.remove('hidden');
              }
            } catch (err) {
              if (errorEl) {
                errorEl.textContent = err && err.message ? err.message : 'Failed to submit review';
                errorEl.classList.remove('hidden');
              }
            }
          });
        }

        function markReviewActionDone(action, reviewId) {
          try {
            sessionStorage.setItem('petm8-event-review-action:' + action + ':' + reviewId, '1');
          } catch (_) {}
        }

        function hasReviewActionDone(action, reviewId) {
          try {
            return sessionStorage.getItem('petm8-event-review-action:' + action + ':' + reviewId) === '1';
          } catch (_) {
            return false;
          }
        }

        const helpfulButtons = Array.prototype.slice.call(document.querySelectorAll('[data-event-review-helpful]'));
        helpfulButtons.forEach((btn) => {
          const reviewId = btn.getAttribute('data-review-id');
          if (reviewId && hasReviewActionDone('helpful', reviewId)) {
            btn.setAttribute('disabled', 'true');
          }
          btn.addEventListener('click', async () => {
            const reviewId = btn.getAttribute('data-review-id');
            if (!reviewId || hasReviewActionDone('helpful', reviewId)) return;
            try {
              const res = await fetch('/api/reviews/' + reviewId + '/helpful', { method: 'POST' });
              if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(
                  window.petm8GetApiErrorMessage
                    ? window.petm8GetApiErrorMessage(data, 'Failed to mark helpful')
                    : (data.error || data.message || 'Failed to mark helpful')
                );
              }
              const data = await res.json();
              const countEl = document.querySelector('[data-event-helpful-count][data-review-id="' + reviewId + '"]');
              if (countEl) countEl.textContent = '(' + String(data.helpfulCount ?? 0) + ')';
              btn.setAttribute('disabled', 'true');
              markReviewActionDone('helpful', reviewId);
            } catch (err) {
              notify(err && err.message ? err.message : 'Failed to mark helpful', 'error');
            }
          });
        });

        const reportButtons = Array.prototype.slice.call(document.querySelectorAll('[data-event-review-report]'));
        reportButtons.forEach((btn) => {
          const reviewId = btn.getAttribute('data-review-id');
          if (reviewId && hasReviewActionDone('report', reviewId)) {
            btn.textContent = 'Reported';
            btn.setAttribute('disabled', 'true');
          }
          btn.addEventListener('click', async () => {
            const reviewId = btn.getAttribute('data-review-id');
            if (!reviewId || hasReviewActionDone('report', reviewId)) return;
            try {
              const res = await fetch('/api/reviews/' + reviewId + '/report', { method: 'POST' });
              if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(
                  window.petm8GetApiErrorMessage
                    ? window.petm8GetApiErrorMessage(data, 'Failed to report review')
                    : (data.error || data.message || 'Failed to report review')
                );
              }
              btn.textContent = 'Reported';
              btn.setAttribute('disabled', 'true');
              markReviewActionDone('report', reviewId);
            } catch (err) {
              notify(err && err.message ? err.message : 'Failed to report review', 'error');
            }
          });
        });
      </script>`}
    </div>
  );
};
