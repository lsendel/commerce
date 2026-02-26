import type { FC } from "hono/jsx";
import { html } from "hono/html";

interface CalendarEvent {
  id: string;
  slug: string;
  name: string;
  time: string;
  eventType: string;
  location: string;
  spotsRemaining: number;
}

interface DayEvents {
  date: string;
  events: CalendarEvent[];
}

interface EventTypeConfig {
  key: string;
  label: string;
  color: string;
  dotClass: string;
}

interface EventCalendarPageProps {
  year: number;
  month: number;
  /** All events keyed by date (YYYY-MM-DD) */
  eventsByDate: Record<string, CalendarEvent[]>;
  /** Selected date to show details */
  selectedDate?: string;
  /** Event type definitions for legend */
  eventTypes: EventTypeConfig[];
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month - 1, 1).getDay();
}

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getPrevMonth(year: number, month: number) {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

function getNextMonth(year: number, month: number) {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

/** Map event type keys to Tailwind dot color classes */
const typeColorMap: Record<string, string> = {
  walk: "bg-pet-teal",
  playdate: "bg-pet-coral",
  training: "bg-pet-amber",
  grooming: "bg-pet-sage",
  workshop: "bg-brand-500",
  social: "bg-blue-400",
};

export const EventCalendarPage: FC<EventCalendarPageProps> = ({
  year,
  month,
  eventsByDate,
  selectedDate,
  eventTypes,
}) => {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const today = new Date();
  const todayStr = formatDate(today.getFullYear(), today.getMonth() + 1, today.getDate());
  const prev = getPrevMonth(year, month);
  const next = getNextMonth(year, month);
  const baseUrl = "/events/calendar";

  const prevUrl = `${baseUrl}?year=${prev.year}&month=${prev.month}`;
  const nextUrl = `${baseUrl}?year=${next.year}&month=${next.month}`;

  // Build cells
  const cells: Array<{
    day: number;
    dateStr: string;
    events: CalendarEvent[];
    isToday: boolean;
    isSelected: boolean;
  } | null> = [];

  for (let i = 0; i < firstDay; i++) cells.push(null);

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = formatDate(year, month, day);
    cells.push({
      day,
      dateStr,
      events: eventsByDate[dateStr] || [],
      isToday: dateStr === todayStr,
      isSelected: dateStr === selectedDate,
    });
  }

  const selectedDayEvents = selectedDate ? eventsByDate[selectedDate] || [] : [];

  return (
    <div class="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Event Calendar</h1>
          <p class="mt-1 text-gray-500 dark:text-gray-400">Browse all upcoming pet events at a glance.</p>
        </div>
        <a
          href="/events"
          class="text-sm text-brand-600 hover:text-brand-700 font-medium"
        >
          List View
        </a>
      </div>

      <div class="grid lg:grid-cols-4 gap-8">
        {/* Calendar */}
        <div class="lg:col-span-3">
          <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
            {/* Month navigation */}
            <div class="flex items-center justify-between mb-6">
              <a
                href={prevUrl}
                class="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                aria-label="Previous month"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
              </a>
              <div class="flex items-center gap-2">
                <select
                  id="month-jump"
                  class="text-lg font-bold text-gray-900 dark:text-gray-100 bg-transparent border-none focus:ring-0 cursor-pointer pr-1"
                  aria-label="Select month"
                >
                  {MONTH_NAMES.map((name, idx) => (
                    <option value={idx + 1} selected={idx + 1 === month}>{name}</option>
                  ))}
                </select>
                <select
                  id="year-jump"
                  class="text-lg font-bold text-gray-900 dark:text-gray-100 bg-transparent border-none focus:ring-0 cursor-pointer"
                  aria-label="Select year"
                >
                  {[year - 1, year, year + 1, year + 2].map((y) => (
                    <option value={y} selected={y === year}>{y}</option>
                  ))}
                </select>
              </div>
              <a
                href={nextUrl}
                class="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                aria-label="Next month"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>

            {/* Day headers */}
            <div class="grid grid-cols-7 gap-1 mb-2">
              {DAY_NAMES.map((name) => (
                <div class="text-center text-xs font-semibold text-gray-400 py-2 uppercase tracking-wider">
                  {name}
                </div>
              ))}
            </div>

            {/* Calendar grid -- larger cells */}
            <div class="grid grid-cols-7 gap-1">
              {cells.map((cell) => {
                if (!cell) {
                  return <div class="min-h-[80px] rounded-xl" />;
                }

                const { day, dateStr, events: dayEvents, isToday, isSelected } = cell;
                const hasEvents = dayEvents.length > 0;

                return (
                  <a
                    href={
                      hasEvents
                        ? `${baseUrl}?year=${year}&month=${month}&date=${dateStr}`
                        : undefined
                    }
                    class={`min-h-[80px] rounded-xl p-2 transition-all ${
                      isSelected
                        ? "bg-brand-50 border-2 border-brand-400 shadow-sm"
                        : hasEvents
                        ? "bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 hover:border-brand-200 hover:shadow-sm cursor-pointer"
                        : "bg-gray-50/50 dark:bg-gray-800/50 border border-transparent"
                    }`}
                  >
                    <span
                      class={`text-sm font-medium ${
                        isToday
                          ? "inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-500 text-white"
                          : isSelected
                          ? "text-brand-700"
                          : hasEvents
                          ? "text-gray-900"
                          : "text-gray-300"
                      }`}
                    >
                      {day}
                    </span>
                    {/* Event dots */}
                    {hasEvents && (
                      <div class="flex flex-wrap gap-1 mt-1.5">
                        {dayEvents.slice(0, 4).map((ev) => (
                          <span
                            class={`w-2 h-2 rounded-full ${
                              typeColorMap[ev.eventType] || "bg-brand-400"
                            }`}
                            title={ev.name}
                          />
                        ))}
                        {dayEvents.length > 4 && (
                          <span class="text-[10px] text-gray-400 leading-none">
                            +{dayEvents.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar: Legend + Selected Day */}
        <div class="space-y-6">
          {/* Legend */}
          <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Event Types</h3>
            <div class="space-y-2">
              {eventTypes.map((et) => (
                <div class="flex items-center gap-2">
                  <span class={`w-3 h-3 rounded-full ${et.dotClass || typeColorMap[et.key] || "bg-gray-400"}`} />
                  <span class="text-sm text-gray-600 dark:text-gray-400">{et.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Selected day events */}
          {selectedDate && (
            <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
              <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Events on {selectedDate}
              </h3>

              {selectedDayEvents.length === 0 ? (
                <p class="text-sm text-gray-400">No events on this day.</p>
              ) : (
                <div class="space-y-3">
                  {selectedDayEvents.map((ev) => (
                    <a
                      href={`/events/${ev.slug}`}
                      class="block p-3 rounded-xl bg-gray-50 dark:bg-gray-700 hover:bg-brand-50 dark:hover:bg-gray-600 transition-colors group"
                    >
                      <div class="flex items-start gap-2.5">
                        <span
                          class={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${
                            typeColorMap[ev.eventType] || "bg-brand-400"
                          }`}
                        />
                        <div class="min-w-0 flex-1">
                          <p class="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-brand-700 dark:group-hover:text-brand-400 truncate">
                            {ev.name}
                          </p>
                          <div class="flex items-center gap-2 mt-1 text-xs text-gray-400">
                            <span>{ev.time}</span>
                            <span>&middot;</span>
                            <span>{ev.location}</span>
                          </div>
                          {ev.spotsRemaining > 0 && (
                            <p class="text-xs text-green-600 mt-1">
                              {ev.spotsRemaining} spots remaining
                            </p>
                          )}
                          {ev.spotsRemaining === 0 && (
                            <p class="text-xs text-red-500 mt-1">Full</p>
                          )}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {!selectedDate && (
            <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 text-center">
              <p class="text-sm text-gray-400">
                Click a day with events to see details.
              </p>
            </div>
          )}
        </div>
      </div>

      {html`<script>
        // Month/year jump
        var monthEl = document.getElementById('month-jump');
        var yearEl = document.getElementById('year-jump');
        function jumpTo() {
          var m = monthEl.value;
          var y = yearEl.value;
          window.location.href = '/events/calendar?year=' + y + '&month=' + m;
        }
        monthEl.addEventListener('change', jumpTo);
        yearEl.addEventListener('change', jumpTo);

        // Keyboard navigation on calendar grid
        document.addEventListener('keydown', function(e) {
          if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
          var base = '/events/calendar';
          if (e.key === 'ArrowLeft') {
            window.location.href = '${prevUrl}';
          } else if (e.key === 'ArrowRight') {
            window.location.href = '${nextUrl}';
          }
        });
      </script>`}
    </div>
  );
};
