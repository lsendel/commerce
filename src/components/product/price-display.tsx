import type { FC } from "hono/jsx";

interface PriceDisplayProps {
  price: string;
  compareAtPrice?: string | null;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: { current: "text-sm font-bold", compare: "text-xs", badge: "text-[10px] px-1.5 py-0.5" },
  md: { current: "text-lg font-bold", compare: "text-sm", badge: "text-xs px-2 py-0.5" },
  lg: { current: "text-2xl font-bold", compare: "text-base", badge: "text-xs px-2 py-1" },
};

export const PriceDisplay: FC<PriceDisplayProps> = ({
  price,
  compareAtPrice,
  size = "md",
}) => {
  const priceNum = parseFloat(price);
  const compareNum = compareAtPrice ? parseFloat(compareAtPrice) : null;
  const isOnSale = compareNum !== null && compareNum > priceNum;
  const classes = sizeClasses[size];

  return (
    <div class="flex items-center gap-2 flex-wrap">
      <span class={`${classes.current} ${isOnSale ? "text-red-600" : "text-gray-900"}`}>
        ${priceNum.toFixed(2)}
      </span>
      {isOnSale && compareNum !== null && (
        <>
          <span class={`${classes.compare} text-gray-400 line-through`}>
            ${compareNum.toFixed(2)}
          </span>
          <span class={`${classes.badge} bg-red-100 text-red-700 font-semibold rounded-full`}>
            Sale
          </span>
        </>
      )}
    </div>
  );
};
