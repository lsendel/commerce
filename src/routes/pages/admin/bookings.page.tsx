import type { FC } from "hono/jsx";
import { html } from "hono/html";
import { Badge } from "../../../components/ui/badge";
import { Pagination } from "../../../components/ui/pagination";
import { PageHeader } from "../../../components/ui/page-header";
import { EmptyState } from "../../../components/ui/empty-state";

interface BookingRow {
  id: string;
  status: string | null;
  customerName: string | null;
  customerEmail: string | null;
  eventName: string | null;
  slotDate: string | null;
  slotTime: string | null;
  quantity: number;
  createdAt: Date | null;
}

interface WaitlistRow {
  id: string;
  userName: string | null;
  eventName: string | null;
  position: number;
  status: string | null;
  createdAt: Date | null;
}

interface BookingStats {
  totalBookings: number;
  checkedIn: number;
  noShows: number;
  cancelled: number;
}

interface AdminBookingsPageProps {
  bookings: BookingRow[];
  total: number;
  page: number;
  limit: number;
  filters: {
    status?: string;
    date?: string;
    search?: string;
  };
  stats: BookingStats;
  waitlist: WaitlistRow[];
}

const STATUS_VARIANT: Record<string, "success" | "warning" | "error" | "info" | "neutral"> = {
  confirmed: "info",
  checked_in: "success",
  cancelled: "neutral",
  no_show: "error",
};

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatSlotDate(date: string | null): string {
  if (!date) return "—";
  const d = new Date(date + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatStatus(status: string | null): string {
  if (!status) return "Confirmed";
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export const AdminBookingsPage: FC<AdminBookingsPageProps> = ({
  bookings,
  total,
  page,
  limit,
  filters,
  stats,
  waitlist,
}) => {
  const totalPages = Math.ceil(total / limit);
  const breadcrumbs = [
    { label: "Admin", href: "/admin" },
    { label: "Bookings" },
  ];

  const confirmed = stats.totalBookings - stats.checkedIn - stats.noShows - stats.cancelled;

  return (
    <div>
      <PageHeader title="Bookings" breadcrumbs={breadcrumbs} />

      {/* Stats cards */}
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div class="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.totalBookings}</div>
          <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">Total Bookings</div>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div class="text-2xl font-bold text-green-600">{stats.checkedIn}</div>
          <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">Checked In</div>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div class="text-2xl font-bold text-red-500">{stats.noShows}</div>
          <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">No Shows</div>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div class="text-2xl font-bold text-gray-400">{stats.cancelled}</div>
          <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">Cancelled</div>
        </div>
      </div>

      {/* Filter bar */}
      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <form method="get" action="/admin/bookings" class="flex flex-wrap items-end gap-3">
          <div class="flex-1 min-w-[200px]">
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Search</label>
            <input
              type="text"
              name="search"
              value={filters.search || ""}
              placeholder="Customer name or email..."
              class="block w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-brand-300 focus:border-brand-400"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status</label>
            <select
              name="status"
              class="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            >
              <option value="">All statuses</option>
              {["confirmed", "checked_in", "cancelled", "no_show"].map((s) => (
                <option value={s} selected={filters.status === s}>
                  {formatStatus(s)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Date</label>
            <input
              type="date"
              name="date"
              value={filters.date || ""}
              class="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            />
          </div>
          <button
            type="submit"
            class="px-4 py-2 text-sm font-medium rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition-colors"
          >
            Filter
          </button>
          {(filters.status || filters.search || filters.date) && (
            <a
              href="/admin/bookings"
              class="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400"
            >
              Clear
            </a>
          )}
        </form>
      </div>

      {bookings.length === 0 ? (
        <EmptyState
          title="No bookings found"
          description={filters.status || filters.search || filters.date ? "Try adjusting your filters." : "Bookings will appear here when customers book events."}
          icon="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      ) : (
        <>
          <div class="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total} bookings
          </div>

          <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                  <th class="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Customer</th>
                  <th class="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Event</th>
                  <th class="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Date</th>
                  <th class="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Time</th>
                  <th class="text-center px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Qty</th>
                  <th class="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Status</th>
                  <th class="text-right px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
                {bookings.map((b) => (
                  <tr class="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                    <td class="px-4 py-3">
                      <div class="font-medium text-gray-900 dark:text-gray-100">
                        {b.customerName || "—"}
                      </div>
                      <div class="text-xs text-gray-400">{b.customerEmail || ""}</div>
                    </td>
                    <td class="px-4 py-3 text-gray-700 dark:text-gray-300">
                      {b.eventName || "—"}
                    </td>
                    <td class="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {formatSlotDate(b.slotDate)}
                    </td>
                    <td class="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {b.slotTime || "—"}
                    </td>
                    <td class="px-4 py-3 text-center text-gray-600 dark:text-gray-400">
                      {b.quantity}
                    </td>
                    <td class="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[b.status || "confirmed"] || "neutral"}>
                        {formatStatus(b.status)}
                      </Badge>
                    </td>
                    <td class="px-4 py-3 text-right">
                      <div class="flex items-center justify-end gap-2">
                        {b.status === "confirmed" && (
                          <>
                            <button
                              type="button"
                              data-action="check-in"
                              data-booking-id={b.id}
                              class="text-xs font-medium text-green-600 hover:text-green-700 transition-colors"
                            >
                              Check In
                            </button>
                            <button
                              type="button"
                              data-action="no-show"
                              data-booking-id={b.id}
                              class="text-xs font-medium text-red-500 hover:text-red-600 transition-colors"
                            >
                              No Show
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div class="mt-6">
              <Pagination currentPage={page} totalPages={totalPages} baseUrl="/admin/bookings" />
            </div>
          )}
        </>
      )}

      {/* Waitlist section */}
      {waitlist.length > 0 && (
        <div class="mt-8">
          <h2 class="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Active Waitlist</h2>
          <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                  <th class="text-center px-4 py-3 font-medium text-gray-500 dark:text-gray-400">#</th>
                  <th class="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Customer</th>
                  <th class="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Event</th>
                  <th class="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Joined</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
                {waitlist.map((w) => (
                  <tr class="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <td class="px-4 py-3 text-center font-medium text-gray-500">{w.position}</td>
                    <td class="px-4 py-3 text-gray-900 dark:text-gray-100">{w.userName || "—"}</td>
                    <td class="px-4 py-3 text-gray-700 dark:text-gray-300">{w.eventName || "—"}</td>
                    <td class="px-4 py-3 text-gray-500 dark:text-gray-400">{formatDate(w.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {html`<script>
        function showAdminBookingsError(message) {
          if (window.showToast) {
            window.showToast(message, 'error');
            return;
          }
          var banner = document.getElementById('admin-bookings-flash');
          if (!banner) {
            banner = document.createElement('div');
            banner.id = 'admin-bookings-flash';
            banner.className = 'fixed top-4 right-4 z-50 max-w-sm rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 shadow-lg';
            document.body.appendChild(banner);
          }
          banner.textContent = message;
          banner.classList.remove('hidden');
          setTimeout(function() { banner.classList.add('hidden'); }, 4000);
        }

        document.addEventListener('click', async (e) => {
          const btn = e.target.closest('[data-action]');
          if (!btn) return;
          const action = btn.dataset.action;
          const bookingId = btn.dataset.bookingId;
          if (!bookingId) return;

          if (action === 'check-in') {
            if (!confirm('Check in this booking?')) return;
            const res = await fetch('/api/bookings/' + bookingId + '/check-in', { method: 'POST' });
            if (res.ok) location.reload();
            else showAdminBookingsError('Check-in failed: ' + (await res.text()));
          }

          if (action === 'no-show') {
            if (!confirm('Mark this booking as no-show?')) return;
            const res = await fetch('/api/bookings/' + bookingId + '/no-show', { method: 'POST' });
            if (res.ok) location.reload();
            else showAdminBookingsError('No-show failed: ' + (await res.text()));
          }
        });
      </script>`}
    </div>
  );
};
