import type { FC } from "hono/jsx";
import { formatMoney } from "../../shared/money";

interface PriceDisplayProps {
  price: string;
  compareAtPrice?: string | null;
  /** When provided, shows "From $X" if minPrice < maxPrice */
  maxPrice?: string | null;
  currencyCode?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: { current: "text-sm font-bold", compare: "text-xs", badge: "text-[10px] px-1.5 py-0.5", from: "text-xs font-medium" },
  md: { current: "text-lg font-bold", compare: "text-sm", badge: "text-xs px-2 py-0.5", from: "text-sm font-medium" },
  lg: { current: "text-2xl font-bold", compare: "text-base", badge: "text-xs px-2 py-1", from: "text-base font-medium" },
};

export const PriceDisplay: FC<PriceDisplayProps> = ({
  price,
  compareAtPrice,
  maxPrice,
  currencyCode = "USD",
  size = "md",
}) => {
  const priceNum = parseFloat(price);
  const compareNum = compareAtPrice ? parseFloat(compareAtPrice) : null;
  const maxPriceNum = maxPrice ? parseFloat(maxPrice) : null;
  const isOnSale = compareNum !== null && compareNum > priceNum;
  const isRange = maxPriceNum !== null && maxPriceNum > priceNum;
  const classes = sizeClasses[size];

  // Calculate savings percentage
  const savingsPercent =
    isOnSale && compareNum !== null
      ? Math.round(((compareNum - priceNum) / compareNum) * 100)
      : 0;

  return (
    <div
      class="flex items-center gap-2 flex-wrap"
      aria-label={`Price: ${isRange ? "from " : ""}${formatMoney(priceNum, currencyCode)}${isOnSale ? `, was ${formatMoney(compareNum!, currencyCode)}` : ""}`}
    >
      {isRange && (
        <span class={`${classes.from} text-gray-500 dark:text-gray-400`}>From</span>
      )}
      <span class={`${classes.current} ${isOnSale ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-gray-100"}`}>
        {formatMoney(priceNum, currencyCode)}
      </span>
      {isOnSale && compareNum !== null && (
        <>
          <span class={`${classes.compare} text-gray-400 dark:text-gray-500 line-through`}>
            {formatMoney(compareNum, currencyCode)}
          </span>
          <span class={`${classes.badge} bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-semibold rounded-full`}>
            {savingsPercent > 0 ? `Save ${savingsPercent}%` : "Sale"}
          </span>
        </>
      )}
    </div>
  );
};
