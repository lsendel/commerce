import type { FC } from "hono/jsx";

interface PayoutsProps {
  payouts: any[];
  totalEarnings: string;
}

export const AffiliatePayoutsPage: FC<PayoutsProps> = ({
  payouts,
  totalEarnings,
}) => {
  return (
    <div class="max-w-4xl mx-auto py-8 px-4">
      <h1 class="text-3xl font-bold mb-2 text-gray-900 dark:text-gray-100">Payouts</h1>
      <p class="text-gray-500 dark:text-gray-400 mb-8">Total lifetime earnings: ${totalEarnings}</p>

      <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <table class="w-full">
          <thead class="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Period
              </th>
              <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Amount
              </th>
              <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Status
              </th>
              <th class="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                Date
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
            {payouts.map((p: any) => (
              <tr>
                <td class="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                  {new Date(p.periodStart).toLocaleDateString()} –{" "}
                  {new Date(p.periodEnd).toLocaleDateString()}
                </td>
                <td class="px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">${p.amount}</td>
                <td class="px-6 py-4">
                  <span
                    class={`text-xs px-2 py-0.5 rounded ${
                      p.status === "completed"
                        ? "bg-green-100 text-green-800"
                        : p.status === "processing"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {p.status}
                  </span>
                </td>
                <td class="px-6 py-4 text-sm text-gray-500">
                  {new Date(p.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {payouts.length === 0 && (
          <p class="text-center py-8 text-gray-500">No payouts yet.</p>
        )}
      </div>
    </div>
  );
};
