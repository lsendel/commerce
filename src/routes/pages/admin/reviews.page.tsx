import type { FC } from "hono/jsx";
import { html } from "hono/html";
import { Button } from "../../../components/ui/button";

interface ReviewRow {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  title: string | null;
  content: string | null;
  isVerifiedPurchase: boolean;
  status: string;
  responseText: string | null;
  responseAt: string | null;
  helpfulCount: number;
  reportedCount: number;
  createdAt: string;
}

interface AdminReviewsPageProps {
  reviews: ReviewRow[];
  total: number;
  page: number;
  totalPages: number;
  filters: {
    status?: string;
  };
}

const STATUS_COLORS: Record<string, string> = {
  approved: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  flagged: "bg-red-100 text-red-800",
  rejected: "bg-gray-100 text-gray-700",
};

const StarRating: FC<{ rating: number }> = ({ rating }) => {
  return (
    <div class="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          class={`w-4 h-4 ${star <= rating ? "text-yellow-400" : "text-gray-200"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
};

export const AdminReviewsPage: FC<AdminReviewsPageProps> = ({
  reviews,
  total,
  page,
  totalPages,
  filters,
}) => {
  return (
    <div class="max-w-6xl mx-auto px-4 py-8">
      <div class="flex items-center justify-between mb-8">
        <div>
          <nav class="text-xs text-gray-400 mb-1">
            <a href="/admin" class="hover:text-gray-600">Admin</a>
            <span class="mx-1">/</span>
            <span class="text-gray-600">Reviews</span>
          </nav>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Review Moderation</h1>
          <p class="text-sm text-gray-500 mt-1">{total} total reviews</p>
        </div>
      </div>

      {/* Filter Bar */}
      <form
        method="get"
        class="flex flex-wrap items-end gap-3 mb-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
        data-persist-filters
        data-persist-key="admin-reviews-filters"
        data-persist-clear-selector="[data-clear-reviews-filters]"
      >
        <div>
          <label class="text-xs font-medium text-gray-500 block mb-1">Status</label>
          <select name="status" data-auto-submit="change" class="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-brand-300">
            <option value="">All statuses</option>
            {["approved", "pending", "flagged", "rejected"].map((s) => (
              <option value={s} selected={filters.status === s}>{s}</option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="primary" size="sm">Filter</Button>
        <a href="/admin/reviews" data-clear-reviews-filters class="text-sm text-gray-500 hover:text-gray-700 py-2">Clear</a>
      </form>

      {/* Reviews List */}
      <div class="space-y-4">
        {reviews.length === 0 ? (
          <div class="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
            <svg class="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <h3 class="text-sm font-medium text-gray-900">No reviews found</h3>
            <p class="mt-1 text-sm text-gray-500">Reviews matching your filters will appear here.</p>
          </div>
        ) : (
          reviews.map((review) => (
            <div
              key={review.id}
              class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6"
              data-review-card
              data-review-id={review.id}
              data-review-status-value={review.status}
              data-has-response={review.responseText ? "true" : "false"}
            >
              <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-3">
                  <StarRating rating={review.rating} />
                  <span data-review-status class={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[review.status] ?? "bg-gray-100 text-gray-800"}`}>
                    {review.status}
                  </span>
                  {review.isVerifiedPurchase && (
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700 font-medium">Verified Purchase</span>
                  )}
                </div>
                <span class="text-xs text-gray-400">{review.createdAt}</span>
              </div>

              {review.title && (
                <h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-1">{review.title}</h3>
              )}
              {review.content && (
                <p class="text-sm text-gray-600 dark:text-gray-300 mb-3">{review.content}</p>
              )}

              <div class="flex items-center gap-4 text-xs text-gray-400 mb-3">
                <span>Helpful: {review.helpfulCount}</span>
                <span>Reported: {review.reportedCount}</span>
                <span class="font-mono">Product: {review.productId.slice(0, 8)}...</span>
              </div>

              {review.responseText && (
                <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-3" data-review-response>
                  <p class="text-xs font-medium text-gray-500 mb-1">Store Response ({review.responseAt})</p>
                  <p class="text-sm text-gray-700 dark:text-gray-300">{review.responseText}</p>
                </div>
              )}

              <div class="flex gap-2" data-review-actions>
                {review.status !== "approved" && (
                  <button type="button" class="approve-btn text-xs bg-green-100 text-green-700 hover:bg-green-200 px-3 py-1.5 rounded-lg font-medium" data-review-id={review.id}>Approve</button>
                )}
                {review.status !== "rejected" && (
                  <button type="button" class="reject-btn text-xs bg-red-100 text-red-700 hover:bg-red-200 px-3 py-1.5 rounded-lg font-medium" data-review-id={review.id}>Reject</button>
                )}
                {!review.responseText && (
                  <button type="button" class="respond-btn text-xs bg-brand-100 text-brand-700 hover:bg-brand-200 px-3 py-1.5 rounded-lg font-medium" data-review-id={review.id}>Reply</button>
                )}
              </div>

              {/* Inline reply form (hidden by default) */}
              <div class="reply-form hidden mt-3 flex gap-2" data-review-id={review.id}>
                <input type="text" placeholder="Write a response..." class="reply-input flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                <button type="button" class="submit-reply text-sm bg-brand-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-600" data-review-id={review.id}>Send</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div class="flex items-center justify-center gap-2 mt-6">
          {page > 1 && (
            <a
              href={`/admin/reviews?page=${page - 1}${filters.status ? `&status=${filters.status}` : ""}`}
              class="px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
            >
              Previous
            </a>
          )}
          <span class="text-sm text-gray-500">Page {page} of {totalPages}</span>
          {page < totalPages && (
            <a
              href={`/admin/reviews?page=${page + 1}${filters.status ? `&status=${filters.status}` : ""}`}
              class="px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
            >
              Next
            </a>
          )}
        </div>
      )}

      {html`
        <script>
          (function() {
            var STATUS_COLORS = {
              approved: 'bg-green-100 text-green-800',
              pending: 'bg-yellow-100 text-yellow-800',
              flagged: 'bg-red-100 text-red-800',
              rejected: 'bg-gray-100 text-gray-700',
            };

            function showReviewsNotice(message, type) {
              if (window.showToast) {
                window.showToast(message, type || 'info');
                return;
              }
              var banner = document.getElementById('admin-reviews-flash');
              if (!banner) {
                banner = document.createElement('div');
                banner.id = 'admin-reviews-flash';
                banner.className = 'fixed top-4 right-4 z-50 max-w-sm rounded-lg border px-4 py-3 text-sm font-medium shadow-lg';
                document.body.appendChild(banner);
              }
              if (type === 'error') {
                banner.classList.remove('border-emerald-200', 'bg-emerald-50', 'text-emerald-700');
                banner.classList.add('border-red-200', 'bg-red-50', 'text-red-700');
              } else {
                banner.classList.remove('border-red-200', 'bg-red-50', 'text-red-700');
                banner.classList.add('border-emerald-200', 'bg-emerald-50', 'text-emerald-700');
              }
              banner.textContent = message;
              banner.classList.remove('hidden');
              setTimeout(function() { banner.classList.add('hidden'); }, 4000);
            }

            function showReviewsSuccess(message) {
              showReviewsNotice(message, 'success');
            }

            function showReviewsError(message) {
              showReviewsNotice(message, 'error');
            }

            function actionMarkup(id, status, hasResponse) {
              var parts = [];
              if (status !== 'approved') {
                parts.push('<button type="button" class="approve-btn text-xs bg-green-100 text-green-700 hover:bg-green-200 px-3 py-1.5 rounded-lg font-medium" data-review-id="' + id + '">Approve</button>');
              }
              if (status !== 'rejected') {
                parts.push('<button type="button" class="reject-btn text-xs bg-red-100 text-red-700 hover:bg-red-200 px-3 py-1.5 rounded-lg font-medium" data-review-id="' + id + '">Reject</button>');
              }
              if (!hasResponse) {
                parts.push('<button type="button" class="respond-btn text-xs bg-brand-100 text-brand-700 hover:bg-brand-200 px-3 py-1.5 rounded-lg font-medium" data-review-id="' + id + '">Reply</button>');
              }
              if (parts.length === 0) {
                parts.push('<span class="text-xs text-gray-400">No actions available</span>');
              }
              return parts.join('');
            }

            function updateReviewCard(id, nextStatus) {
              var card = document.querySelector('[data-review-card][data-review-id="' + id + '"]');
              if (!card) return;

              card.dataset.reviewStatusValue = nextStatus;
              var badge = card.querySelector('[data-review-status]');
              if (badge) {
                badge.textContent = nextStatus;
                badge.className = 'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ' + (STATUS_COLORS[nextStatus] || 'bg-gray-100 text-gray-800');
              }

              var hasResponse = card.dataset.hasResponse === 'true';
              var actions = card.querySelector('[data-review-actions]');
              if (actions) {
                actions.innerHTML = actionMarkup(id, nextStatus, hasResponse);
              }
            }

            function setActionLoading(button, loading) {
              if (!button) return;
              if (loading) {
                button.dataset.originalLabel = button.textContent || '';
                button.textContent = 'Saving...';
                button.disabled = true;
                button.classList.add('opacity-60', 'cursor-not-allowed');
                return;
              }
              if (button.dataset.originalLabel) button.textContent = button.dataset.originalLabel;
              button.disabled = false;
              button.classList.remove('opacity-60', 'cursor-not-allowed');
            }

            async function confirmReject() {
              if (window.petm8Ui && typeof window.petm8Ui.confirm === 'function') {
                return window.petm8Ui.confirm('Reject this review?', {
                  title: 'Reject review',
                  confirmText: 'Reject',
                  danger: true,
                });
              }
              return confirm('Reject this review?');
            }

            async function moderateReview(id, action, button) {
              setActionLoading(button, true);
              try {
                var res = await fetch('/api/reviews/' + id + '/moderate', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: action }),
                });
                if (!res.ok) {
                  var data = await res.json().catch(function() { return {}; });
                  throw new Error(window.petm8GetApiErrorMessage ? window.petm8GetApiErrorMessage(data, 'Review update failed') : (data.error || data.message || 'Review update failed'));
                }

                var nextStatus = action === 'approve' ? 'approved' : 'rejected';
                updateReviewCard(id, nextStatus);
                showReviewsSuccess(action === 'approve' ? 'Review approved.' : 'Review rejected.');
              } catch (err) {
                showReviewsError(err.message || 'Failed to update review');
              } finally {
                setActionLoading(button, false);
              }
            }

            async function submitReply(id, button) {
              var form = document.querySelector('.reply-form[data-review-id="' + id + '"]');
              var input = form ? form.querySelector('.reply-input') : null;
              var text = input ? input.value.trim() : '';
              if (!text) return;

              setActionLoading(button, true);
              try {
                var res = await fetch('/api/reviews/' + id + '/respond', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ responseText: text }),
                });
                if (!res.ok) {
                  var data = await res.json().catch(function() { return {}; });
                  throw new Error(window.petm8GetApiErrorMessage ? window.petm8GetApiErrorMessage(data, 'Failed to send response') : (data.error || data.message || 'Failed to send response'));
                }

                var card = document.querySelector('[data-review-card][data-review-id="' + id + '"]');
                if (card) {
                  card.dataset.hasResponse = 'true';
                  var existingResponse = card.querySelector('[data-review-response]');
                  if (!existingResponse) {
                    var responseBlock = document.createElement('div');
                    responseBlock.className = 'bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-3';
                    responseBlock.setAttribute('data-review-response', '');
                    var meta = document.createElement('p');
                    meta.className = 'text-xs font-medium text-gray-500 mb-1';
                    meta.textContent = 'Store Response (just now)';
                    var body = document.createElement('p');
                    body.className = 'text-sm text-gray-700 dark:text-gray-300';
                    body.textContent = text;
                    responseBlock.appendChild(meta);
                    responseBlock.appendChild(body);
                    var actions = card.querySelector('[data-review-actions]');
                    card.insertBefore(responseBlock, actions);
                  }

                  var status = card.dataset.reviewStatusValue || 'pending';
                  var actionsContainer = card.querySelector('[data-review-actions]');
                  if (actionsContainer) actionsContainer.innerHTML = actionMarkup(id, status, true);
                }

                if (form) form.classList.add('hidden');
                if (input) input.value = '';
                showReviewsSuccess('Response sent.');
              } catch (err) {
                showReviewsError(err.message || 'Failed to send response');
              } finally {
                setActionLoading(button, false);
              }
            }

            document.addEventListener('click', async function(event) {
              var approveButton = event.target.closest('.approve-btn');
              if (approveButton) {
                var approveId = approveButton.getAttribute('data-review-id');
                if (approveId) await moderateReview(approveId, 'approve', approveButton);
                return;
              }

              var rejectButton = event.target.closest('.reject-btn');
              if (rejectButton) {
                var rejectId = rejectButton.getAttribute('data-review-id');
                if (!rejectId) return;
                var allowReject = await confirmReject();
                if (!allowReject) return;
                await moderateReview(rejectId, 'reject', rejectButton);
                return;
              }

              var respondButton = event.target.closest('.respond-btn');
              if (respondButton) {
                var respondId = respondButton.getAttribute('data-review-id');
                var form = respondId ? document.querySelector('.reply-form[data-review-id="' + respondId + '"]') : null;
                if (form) form.classList.toggle('hidden');
                return;
              }

              var submitReplyButton = event.target.closest('.submit-reply');
              if (submitReplyButton) {
                var submitId = submitReplyButton.getAttribute('data-review-id');
                if (submitId) await submitReply(submitId, submitReplyButton);
              }
            });
          })();
        </script>
      `}
    </div>
  );
};
