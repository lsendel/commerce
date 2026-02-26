import type { FC } from "hono/jsx";
import { Button } from "../../../components/ui/button";

interface EventProduct {
  id: string;
  slug: string;
  name: string;
  imageUrl?: string;
  priceFrom: string;
  location: string;
  nextAvailableDate?: string;
  shortDescription?: string;
}

interface EventsListPageProps {
  events: EventProduct[];
  filterDateFrom?: string;
  filterDateTo?: string;
  filterSearch?: string;
  page: number;
  totalPages: number;
  total: number;
}

function formatHumanDate(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export const EventsListPage: FC<EventsListPageProps> = ({
  events,
  filterDateFrom,
  filterDateTo,
  filterSearch,
  page,
  totalPages,
  total,
}) => {
  return (
    <div class="max-w-6xl mx-auto px-4 py-8">
      {/* Page header */}
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Events &amp; Experiences</h1>
        <p class="mt-2 text-gray-500 dark:text-gray-400">
          Discover pet-friendly events and book unforgettable experiences.
        </p>
      </div>

      {/* Search & date filter */}
      <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 mb-8">
        <form method="get" class="flex flex-wrap items-end gap-4">
          <div class="flex-1 min-w-[200px] flex flex-col gap-1.5">
            <label class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Search</label>
            <input
              type="text"
              name="search"
              value={filterSearch || ""}
              placeholder="Search events..."
              class="rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400"
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">From</label>
            <input
              type="date"
              name="dateFrom"
              value={filterDateFrom || ""}
              class="rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400"
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">To</label>
            <input
              type="date"
              name="dateTo"
              value={filterDateTo || ""}
              class="rounded-xl border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400"
            />
          </div>
          <Button type="submit" variant="primary" size="sm">
            Filter
          </Button>
          {(filterDateFrom || filterDateTo || filterSearch) && (
            <a href="/events" class="text-sm text-gray-500 hover:text-brand-600 font-medium">
              Clear
            </a>
          )}
        </form>
      </div>

      {/* Events grid */}
      {events.length === 0 ? (
        <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-12 text-center">
          <div class="w-16 h-16 rounded-full bg-brand-50 text-brand-500 flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.5"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">No events found</h2>
          <p class="text-sm text-gray-400">Try adjusting your date range or check back soon.</p>
        </div>
      ) : (
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <a
              href={`/events/${event.slug}`}
              class="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden hover:shadow-lg hover:border-brand-200 dark:hover:border-brand-600 transition-all duration-200"
            >
              {/* Image */}
              <div class="aspect-[4/3] bg-gray-100 overflow-hidden relative">
                {event.imageUrl ? (
                  <img
                    src={event.imageUrl}
                    alt={event.name}
                    class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div class="w-full h-full flex items-center justify-center bg-brand-50">
                    <svg class="w-12 h-12 text-brand-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="1.5"
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                )}
                {/* Price badge */}
                <div class="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm rounded-xl px-3 py-1.5 shadow-sm">
                  <span class="text-xs text-gray-500">from </span>
                  <span class="text-sm font-bold text-gray-900">${event.priceFrom}</span>
                </div>
              </div>

              {/* Content */}
              <div class="p-5">
                <h3 class="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-brand-700 dark:group-hover:text-brand-400 transition-colors">
                  {event.name}
                </h3>
                {event.shortDescription && (
                  <p class="text-sm text-gray-500 mt-1 line-clamp-2">{event.shortDescription}</p>
                )}

                <div class="flex items-center gap-3 mt-3 text-xs text-gray-400 dark:text-gray-500">
                  {/* Location */}
                  <span class="flex items-center gap-1">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {event.location}
                  </span>

                  {/* Next date */}
                  {event.nextAvailableDate && (
                    <span class="flex items-center gap-1">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      Next: {formatHumanDate(event.nextAvailableDate)}
                    </span>
                  )}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div class="mt-8 flex items-center justify-between">
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Showing {(page - 1) * 12 + 1}–{Math.min(page * 12, total)} of {total} events
          </p>
          <div class="flex items-center gap-2">
            {page > 1 && (
              <a
                href={`/events?page=${page - 1}${filterSearch ? `&search=${filterSearch}` : ""}${filterDateFrom ? `&dateFrom=${filterDateFrom}` : ""}${filterDateTo ? `&dateTo=${filterDateTo}` : ""}`}
                class="px-3 py-2 text-sm font-medium rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Previous
              </a>
            )}
            {page < totalPages && (
              <a
                href={`/events?page=${page + 1}${filterSearch ? `&search=${filterSearch}` : ""}${filterDateFrom ? `&dateFrom=${filterDateFrom}` : ""}${filterDateTo ? `&dateTo=${filterDateTo}` : ""}`}
                class="px-3 py-2 text-sm font-medium rounded-xl bg-brand-500 text-white hover:bg-brand-600 transition-colors"
              >
                Next
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
