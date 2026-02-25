import type { FC } from "hono/jsx";
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
}) => {
  const selectedSlot = slots?.find((s) => s.id === selectedSlotId);
  const baseUrl = `/events/${slug}`;

  return (
    <div class="max-w-6xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav class="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <a href="/events" class="hover:text-brand-600 transition-colors">Events</a>
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
        <span class="text-gray-700 font-medium truncate">{name}</span>
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
            <h1 class="text-3xl font-bold text-gray-900 mb-3">{name}</h1>
            <div class="flex flex-wrap items-center gap-4 text-sm text-gray-500">
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
            <p class="text-gray-600 leading-relaxed whitespace-pre-line">{description}</p>
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
              <h2 class="text-xl font-bold text-gray-900 mb-4">Itinerary</h2>
              <div class="relative pl-6 border-l-2 border-brand-200 space-y-6">
                {itinerary.map((step, idx) => (
                  <div class="relative">
                    <div class="absolute -left-[25px] w-4 h-4 rounded-full bg-brand-500 border-4 border-brand-100" />
                    <div class="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                      <span class="text-xs font-medium text-brand-600 uppercase tracking-wide">
                        {step.time}
                      </span>
                      <h4 class="font-semibold text-gray-900 mt-1">{step.title}</h4>
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
              <h2 class="text-xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
              <div class="space-y-3">
                {faqs.map((faq, idx) => (
                  <details class="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <summary class="flex items-center justify-between p-4 cursor-pointer list-none hover:bg-gray-50 transition-colors">
                      <span class="font-medium text-gray-900 text-sm">{faq.question}</span>
                      <svg
                        class="w-4 h-4 text-gray-400 transition-transform group-open:rotate-180 flex-shrink-0 ml-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </summary>
                    <div class="px-4 pb-4 text-sm text-gray-600 leading-relaxed">
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

          {/* Reviews placeholder */}
          <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 class="text-xl font-bold text-gray-900 mb-4">Reviews</h2>
            <div class="text-center py-8">
              <div class="w-12 h-12 rounded-full bg-gray-100 text-gray-300 flex items-center justify-center mx-auto mb-3">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.5"
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                  />
                </svg>
              </div>
              <p class="text-sm text-gray-400">No reviews yet. Be the first to share your experience!</p>
            </div>
          </div>
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
                <h3 class="text-sm font-semibold text-gray-900 mb-3">
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

            {selectedDate && (!slots || slots.length === 0) && (
              <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
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
          </div>
        </div>
      </div>
    </div>
  );
};
