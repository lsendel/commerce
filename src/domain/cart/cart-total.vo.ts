export interface CartTotal {
  subtotal: number;
  discount: number;
  shippingEstimate: number;
  taxEstimate: number;
  total: number;
}

interface CartLineItem {
  quantity: number;
  price: number;
  compareAtPrice?: number | null;
}

interface Coupon {
  discountType: "percentage" | "fixed_amount";
  discountValue: number;
  minimumOrderAmount?: number | null;
}

export function recalculate(
  items: CartLineItem[],
  coupon?: Coupon | null,
): CartTotal {
  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  let discount = 0;
  if (coupon) {
    const meetsMinimum =
      !coupon.minimumOrderAmount || subtotal >= coupon.minimumOrderAmount;

    if (meetsMinimum) {
      if (coupon.discountType === "percentage") {
        discount = Math.round(subtotal * (coupon.discountValue / 100) * 100) / 100;
      } else {
        discount = Math.min(coupon.discountValue, subtotal);
      }
    }
  }

  const afterDiscount = subtotal - discount;

  // Shipping: free for orders over $50, flat $5.99 otherwise
  const shippingEstimate = afterDiscount >= 50 ? 0 : 5.99;

  // Tax estimate: ~8% placeholder (real tax calculated at checkout)
  const taxEstimate = Math.round(afterDiscount * 0.08 * 100) / 100;

  const total =
    Math.round((afterDiscount + shippingEstimate + taxEstimate) * 100) / 100;

  return { subtotal, discount, shippingEstimate, taxEstimate, total };
}

export function totalSavings(items: CartLineItem[]): number {
  return items.reduce((sum, item) => {
    if (item.compareAtPrice && item.compareAtPrice > item.price) {
      return sum + (item.compareAtPrice - item.price) * item.quantity;
    }
    return sum;
  }, 0);
}
