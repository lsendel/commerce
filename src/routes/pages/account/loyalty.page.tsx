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
          <p class="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">{wallet.availablePoints}</p>
        </div>
        <div class="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-6">
          <p class="text-xs uppercase tracking-wide text-gray-400">Lifetime Earned</p>
          <p class="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">{wallet.lifetimeEarned}</p>
        </div>
        <div class="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-6">
          <p class="text-xs uppercase tracking-wide text-gray-400">Lifetime Redeemed</p>
          <p class="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">{wallet.lifetimeRedeemed}</p>
        </div>
      </div>

      <div class="grid lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 space-y-6">
          <section class="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-6">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-xs uppercase tracking-wide text-gray-400">Current Tier</p>
                <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                  {wallet.currentTier?.name ?? "Member"}
                </h2>
                {wallet.currentTier && (
                  <p class="text-sm text-gray-500 mt-1">
                    Earn multiplier: {wallet.currentTier.multiplier.toFixed(2)}x
                  </p>
                )}
              </div>
              {wallet.currentTier && (
                <Badge variant="info">{wallet.currentTier.name}</Badge>
              )}
            </div>

            {wallet.nextTier ? (
              <div class="mt-5">
                <div class="flex items-center justify-between text-xs text-gray-500 mb-2">
                  <span>Progress to {wallet.nextTier.name}</span>
                  <span>{wallet.progressPercent}%</span>
                </div>
                <div class="h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                  <div
                    class="h-full rounded-full bg-brand-500 transition-all"
                    style={`width:${wallet.progressPercent}%`}
                  />
                </div>
                <p class="mt-2 text-xs text-gray-500">
                  {wallet.nextTier.pointsToUnlock} points to unlock {wallet.nextTier.name}
                </p>
              </div>
            ) : (
              <p class="mt-4 text-sm text-emerald-600 font-medium">You are at the highest tier.</p>
            )}

            {wallet.currentTier?.benefits?.length ? (
              <div class="mt-5">
                <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Tier Benefits</h3>
                <ul class="space-y-1.5">
                  {wallet.currentTier.benefits.map((benefit) => (
                    <li class="text-sm text-gray-600 dark:text-gray-300">• {benefit}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          <section class="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-6">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Rewards Catalog</h3>
            <div class="space-y-3">
              {wallet.rewards.map((reward) => (
                <div class="rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex items-start justify-between gap-4">
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
            <p class="text-sm text-gray-500">No loyalty activity yet. Place an order to start earning points.</p>
          ) : (
            <div class="space-y-3">
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

            document.querySelectorAll('.redeem-btn').forEach(function(btn) {
              btn.addEventListener('click', async function() {
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
                  toast('Reward redeemed. Token: ' + (data.benefitToken || ''), 'success');
                  setTimeout(function() { location.reload(); }, 350);
                } catch (err) {
                  toast(err.message || 'Failed to redeem reward', 'error');
                  btn.disabled = false;
                  btn.textContent = idleText;
                }
              });
            });
          })();
        </script>
      `}
    </div>
  );
};
