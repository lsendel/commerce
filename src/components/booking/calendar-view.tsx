import type { FC } from "hono/jsx";

interface CalendarViewProps {
  /** Currently displayed year */
  year: number;
  /** Currently displayed month (1-12) */
  month: number;
  /** Dates that have available slots, in YYYY-MM-DD format */
  availableDates: string[];
  /** Currently selected date in YYYY-MM-DD format */
  selectedDate?: string;
  /** Base URL for navigation (prev/next links append ?year=&month=) */
  baseUrl?: string;
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

function getPrevMonth(year: number, month: number): { year: number; month: number } {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

function getNextMonth(year: number, month: number): { year: number; month: number } {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

export const CalendarView: FC<CalendarViewProps> = ({
  year,
  month,
  availableDates,
  selectedDate,
  baseUrl = "",
}) => {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const today = new Date();
  const todayStr = formatDate(today.getFullYear(), today.getMonth() + 1, today.getDate());

  const availableSet = new Set(availableDates);
  const prev = getPrevMonth(year, month);
  const next = getNextMonth(year, month);

  const prevUrl = `${baseUrl}?year=${prev.year}&month=${prev.month}${selectedDate ? `&date=${selectedDate}` : ""}`;
  const nextUrl = `${baseUrl}?year=${next.year}&month=${next.month}${selectedDate ? `&date=${selectedDate}` : ""}`;

  // Build grid cells
  const cells: Array<{ day: number; dateStr: string; isAvailable: boolean; isToday: boolean; isSelected: boolean } | null> = [];

  // Leading empty cells
  for (let i = 0; i < firstDay; i++) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = formatDate(year, month, day);
    cells.push({
      day,
      dateStr,
      isAvailable: availableSet.has(dateStr),
      isToday: dateStr === todayStr,
      isSelected: dateStr === selectedDate,
    });
  }

  return (
    <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
      {/* Header with month navigation */}
      <div class="flex items-center justify-between mb-5">
        <a
          href={prevUrl}
          class="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          aria-label="Previous month"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </a>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {MONTH_NAMES[month - 1]} {year}
        </h3>
        <a
          href={nextUrl}
          class="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          aria-label="Next month"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>

      {/* Day-of-week headers */}
      <div class="grid grid-cols-7 gap-1 mb-2">
        {DAY_NAMES.map((name) => (
          <div class="text-center text-xs font-medium text-gray-400 dark:text-gray-500 py-1">
            {name}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div class="grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          if (!cell) {
            return <div class="aspect-square" />;
          }

          const { day, dateStr, isAvailable, isToday, isSelected } = cell;

          if (isSelected) {
            return (
              <a
                href={`${baseUrl}?year=${year}&month=${month}&date=${dateStr}`}
                class="aspect-square flex flex-col items-center justify-center rounded-xl bg-brand-500 text-white font-semibold text-sm relative transition-all"
              >
                {day}
                {isAvailable && (
                  <span class="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </a>
            );
          }

          if (isAvailable) {
            return (
              <a
                href={`${baseUrl}?year=${year}&month=${month}&date=${dateStr}`}
                class={`aspect-square flex flex-col items-center justify-center rounded-xl text-sm font-medium relative cursor-pointer transition-all hover:bg-brand-50 hover:text-brand-700 ${
                  isToday
                    ? "ring-2 ring-brand-300 text-brand-700 bg-brand-50 dark:bg-brand-900/30 dark:text-brand-400"
                    : "text-gray-900 dark:text-gray-100 hover:shadow-sm"
                }`}
              >
                {day}
                <span class="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-brand-500" />
              </a>
            );
          }

          return (
            <div
              class={`aspect-square flex items-center justify-center rounded-xl text-sm ${
                isToday
                  ? "ring-2 ring-gray-300 dark:ring-gray-600 text-gray-700 dark:text-gray-300 font-medium"
                  : "text-gray-300 dark:text-gray-600"
              }`}
            >
              {day}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div class="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
        <div class="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <span class="w-2 h-2 rounded-full bg-brand-500" />
          Available
        </div>
        <div class="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <span class="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" />
          No slots
        </div>
      </div>
    </div>
  );
};
