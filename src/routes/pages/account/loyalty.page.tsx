import type { FC } from "hono/jsx";
import { html } from "hono/html";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";

interface TierView {
  id: string;
  name: string;
  minPoints: number;
  multiplier: number;
  color?: string | null;
  benefits: string[];
}

interface NextTierView {
  id: string;
  name: string;
  minPoints: number;
  multiplier: number;
  pointsToUnlock: number;
}

interface RewardView {
  id: string;
  label: string;
  cost: number;
  description: string;
  eligible: boolean;
}

interface TransactionView {
  id: string;
  type: "earn" | "redeem" | "refund" | "adjustment";
  points: number;
  description: string;
  sourceOrderId?: string | null;
  createdAt?: string | Date | null;
}

interface LoyaltyPageProps {
  wallet: {
    availablePoints: number;
    lifetimeEarned: number;
    lifetimeRedeemed: number;
    currentTier: TierView | null;
    nextTier: NextTierView | null;
    progressPercent: number;
    rewards: RewardView[];
    transactions: TransactionView[];
  };
}

const transactionLabel: Record<string, string> = {
  earn: "Earned",
  redeem: "Redeemed",
  refund: "Refund Adjustment",
  adjustment: "Manual Adjustment",
};

const transactionBadge: Record<string, "success" | "warning" | "error" | "info" | "neutral"> = {
  earn: "success",
  redeem: "warning",
  refund: "error",
  adjustment: "neutral",
};

export const LoyaltyPage: FC<LoyaltyPageProps> = ({ wallet }) => {
  return (
    <div class="max-w-5xl mx-auto px-4 py-8">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Loyalty Wallet</h1>
          <p class="mt-1 text-sm text-gray-500">Track points, tiers, and redeem rewards.</p>
        </div>
        <a href="/account" class="text-sm text-brand-600 hover:text-brand-700 font-medium">
          Back to Account
        </a>
      </div>

      <div class="grid md:grid-cols-3 gap-6 mb-8">
        <div class="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-6">
          <p class="text-xs uppercase tracking-wide text-gray-400">Available Points</p>
          <p id="loyalty-available-points" class="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">{wallet.availablePoints}</p>
        </div>
        <div class="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-6">
          <p class="text-xs uppercase tracking-wide text-gray-400">Lifetime Earned</p>
          <p id="loyalty-lifetime-earned" class="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">{wallet.lifetimeEarned}</p>
        </div>
        <div class="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-6">
          <p class="text-xs uppercase tracking-wide text-gray-400">Lifetime Redeemed</p>
          <p id="loyalty-lifetime-redeemed" class="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">{wallet.lifetimeRedeemed}</p>
        </div>
      </div>

      <div class="grid lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 space-y-6">
          <section class="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-6">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-xs uppercase tracking-wide text-gray-400">Current Tier</p>
                <h2 id="loyalty-current-tier-name" class="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                  {wallet.currentTier?.name ?? "Member"}
                </h2>
                {wallet.currentTier && (
                  <p id="loyalty-tier-multiplier" class="text-sm text-gray-500 mt-1">
                    Earn multiplier: {wallet.currentTier.multiplier.toFixed(2)}x
                  </p>
                )}
              </div>
              {wallet.currentTier && (
                <span id="loyalty-current-tier-badge">
                  <Badge variant="info">{wallet.currentTier.name}</Badge>
                </span>
              )}
            </div>

            {wallet.nextTier ? (
              <div id="loyalty-next-tier-section" class="mt-5">
                <div class="flex items-center justify-between text-xs text-gray-500 mb-2">
                  <span id="loyalty-progress-label">Progress to {wallet.nextTier.name}</span>
                  <span id="loyalty-progress-percent">{wallet.progressPercent}%</span>
                </div>
                <div class="h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                  <div
                    id="loyalty-progress-bar"
                    class="h-full rounded-full bg-brand-500 transition-all"
                    style={`width:${wallet.progressPercent}%`}
                  />
                </div>
                <p id="loyalty-next-tier-hint" class="mt-2 text-xs text-gray-500">
                  {wallet.nextTier.pointsToUnlock} points to unlock {wallet.nextTier.name}
                </p>
              </div>
            ) : (
              <p id="loyalty-highest-tier" class="mt-4 text-sm text-emerald-600 font-medium">You are at the highest tier.</p>
            )}

            {wallet.currentTier?.benefits?.length ? (
              <div id="loyalty-benefits-section" class="mt-5">
                <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Tier Benefits</h3>
                <ul id="loyalty-benefits-list" class="space-y-1.5">
                  {wallet.currentTier.benefits.map((benefit) => (
                    <li class="text-sm text-gray-600 dark:text-gray-300">• {benefit}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          <section class="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-6">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Rewards Catalog</h3>
            <div id="loyalty-rewards-list" class="space-y-3">
              {wallet.rewards.map((reward) => (
                <div class="rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex items-start justify-between gap-4" data-reward-card={reward.id}>
                  <div>
                    <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">{reward.label}</p>
                    <p class="text-xs text-gray-500 mt-1">{reward.description}</p>
                    <p class="text-xs text-brand-600 mt-2">{reward.cost} points</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    class="redeem-btn"
                    data-reward-id={reward.id}
                    data-redeem-btn={reward.id}
                    disabled={!reward.eligible}
                  >
                    Redeem
                  </Button>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section class="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Recent Activity</h3>
          {wallet.transactions.length === 0 ? (
            <p id="loyalty-activity-empty" class="text-sm text-gray-500">No loyalty activity yet. Place an order to start earning points.</p>
          ) : (
            <div id="loyalty-activity-list" class="space-y-3">
              {wallet.transactions.map((tx) => (
                <div class="rounded-xl border border-gray-100 dark:border-gray-700 p-3">
                  <div class="flex items-center justify-between gap-2">
                    <Badge variant={transactionBadge[tx.type] ?? "neutral"}>
                      {transactionLabel[tx.type] ?? tx.type}
                    </Badge>
                    <span class={`text-sm font-semibold ${tx.points >= 0 ? "text-emerald-600" : "text-amber-600"}`}>
                      {tx.points >= 0 ? "+" : ""}{tx.points}
                    </span>
                  </div>
                  <p class="text-xs text-gray-600 dark:text-gray-300 mt-2">{tx.description}</p>
                  {tx.createdAt && (
                    <p class="text-[11px] text-gray-400 mt-1">
                      {new Date(tx.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {html`
        <script>
          (function() {
            function toast(message, type) {
              if (!message) return;
              if (window.showToast) window.showToast(message, type || 'info');
              else if (type === 'error') console.error(message);
              else console.log(message);
            }

            function escapeHtml(value) {
              return String(value == null ? '' : value)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
            }

            function formatTransactionDate(value) {
              var date = new Date(value || Date.now());
              if (Number.isNaN(date.getTime())) return '';
              return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
            }

            function rewardButtonHtml(reward) {
              var disabled = reward.eligible ? '' : ' disabled';
              return '<button type="button" class="redeem-btn inline-flex items-center justify-center rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50" data-reward-id="' + escapeHtml(reward.id) + '" data-redeem-btn="' + escapeHtml(reward.id) + '"' + disabled + '>Redeem</button>';
            }

            function renderRewards(rewards) {
              var root = document.getElementById('loyalty-rewards-list');
              if (!root) return;
              root.innerHTML = (Array.isArray(rewards) ? rewards : []).map(function(reward) {
                return '' +
                  '<div class="rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex items-start justify-between gap-4" data-reward-card="' + escapeHtml(reward.id) + '">' +
                    '<div>' +
                      '<p class="text-sm font-semibold text-gray-900 dark:text-gray-100">' + escapeHtml(reward.label) + '</p>' +
                      '<p class="text-xs text-gray-500 mt-1">' + escapeHtml(reward.description) + '</p>' +
                      '<p class="text-xs text-brand-600 mt-2">' + Number(reward.cost || 0) + ' points</p>' +
                    '</div>' +
                    rewardButtonHtml(reward) +
                  '</div>';
              }).join('');
            }

            function renderTransactions(transactions) {
              var listRoot = document.getElementById('loyalty-activity-list');
              var emptyRoot = document.getElementById('loyalty-activity-empty');
              var txList = Array.isArray(transactions) ? transactions : [];
              if (txList.length === 0) {
                if (listRoot) listRoot.innerHTML = '';
                if (emptyRoot) {
                  emptyRoot.textContent = 'No loyalty activity yet. Place an order to start earning points.';
                  emptyRoot.classList.remove('hidden');
                }
                return;
              }
              if (emptyRoot) emptyRoot.classList.add('hidden');
              if (!listRoot) return;
              listRoot.innerHTML = txList.map(function(tx) {
                var type = String(tx.type || 'adjustment');
                var badgeText = type === 'earn'
                  ? 'Earned'
                  : type === 'redeem'
                  ? 'Redeemed'
                  : type === 'refund'
                  ? 'Refund Adjustment'
                  : 'Manual Adjustment';
                var badgeClass = type === 'earn'
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                  : type === 'redeem'
                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                  : type === 'refund'
                  ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
                var points = Number(tx.points || 0);
                var dateText = tx.createdAt ? formatTransactionDate(tx.createdAt) : '';
                return '' +
                  '<div class="rounded-xl border border-gray-100 dark:border-gray-700 p-3">' +
                    '<div class="flex items-center justify-between gap-2">' +
                      '<span class="inline-flex items-center rounded-full font-medium px-2.5 py-0.5 text-xs ' + badgeClass + '">' + badgeText + '</span>' +
                      '<span class="text-sm font-semibold ' + (points >= 0 ? 'text-emerald-600' : 'text-amber-600') + '">' + (points >= 0 ? '+' : '') + points + '</span>' +
                    '</div>' +
                    '<p class="text-xs text-gray-600 dark:text-gray-300 mt-2">' + escapeHtml(tx.description || '') + '</p>' +
                    (dateText ? '<p class="text-[11px] text-gray-400 mt-1">' + escapeHtml(dateText) + '</p>' : '') +
                  '</div>';
              }).join('');
            }

            function applyWallet(wallet) {
              if (!wallet || typeof wallet !== 'object') return;
              var available = document.getElementById('loyalty-available-points');
              var earned = document.getElementById('loyalty-lifetime-earned');
              var redeemed = document.getElementById('loyalty-lifetime-redeemed');
              if (available) available.textContent = String(Number(wallet.availablePoints || 0));
              if (earned) earned.textContent = String(Number(wallet.lifetimeEarned || 0));
              if (redeemed) redeemed.textContent = String(Number(wallet.lifetimeRedeemed || 0));

              renderRewards(wallet.rewards || []);
              renderTransactions(wallet.transactions || []);

              var tierName = document.getElementById('loyalty-current-tier-name');
              if (tierName) tierName.textContent = wallet.currentTier && wallet.currentTier.name ? wallet.currentTier.name : 'Member';
            }

            document.addEventListener('click', async function(event) {
              var btn = event.target && event.target.closest ? event.target.closest('.redeem-btn') : null;
              if (!btn) return;
              var rewardId = btn.getAttribute('data-reward-id');
              if (!rewardId || btn.disabled) return;
              btn.disabled = true;
              var idleText = btn.textContent || 'Redeem';
              btn.textContent = 'Redeeming...';
              try {
                var res = await fetch('/api/loyalty/redeem', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ rewardId: rewardId }),
                });
                var data = await res.json().catch(function() { return {}; });
                if (!res.ok) throw new Error(data.error || 'Failed to redeem reward');
                if (data.wallet) applyWallet(data.wallet);
                toast('Reward redeemed. Token: ' + (data.benefitToken || ''), 'success');
              } catch (err) {
                toast(err.message || 'Failed to redeem reward', 'error');
              } finally {
                btn.disabled = false;
                btn.textContent = idleText;
              }
            });
          })();
        </script>
      `}
    </div>
  );
};
