export interface PersonTypePrice {
  personType: string;
  price: number;
}

export interface BookingTotalItem {
  personType: string;
  quantity: number;
  unitPrice: number;
}

/**
 * Calculates the total cost for a set of booking line items.
 * Each item's contribution is quantity * unitPrice.
 * Returns the total rounded to 2 decimal places.
 */
export function calculateBookingTotal(items: BookingTotalItem[]): number {
  const total = items.reduce((sum, item) => {
    return sum + item.quantity * item.unitPrice;
  }, 0);

  return Math.round(total * 100) / 100;
}
