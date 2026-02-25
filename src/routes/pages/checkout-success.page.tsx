import type { FC } from "hono/jsx";
import { Button } from "../../components/ui/button";

interface OrderItem {
  id: string;
  productName: string;
  variantTitle?: string | null;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
}

interface CheckoutSuccessPageProps {
  order: {
    id: string;
    status?: string | null;
    subtotal: string;
    tax: string;
    shippingCost: string;
    total: string;
    items: OrderItem[];
    createdAt?: string | null;
  };
}

export const CheckoutSuccessPage: FC<CheckoutSuccessPageProps> = ({ order }) => {
  const orderNumber = order.id.slice(0, 8).toUpperCase();

  return (
    <div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {/* Success icon */}
      <div class="text-center mb-8">
        <div class="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
          <svg class="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 class="text-3xl font-bold text-gray-900">Order Confirmed!</h1>
        <p class="mt-2 text-gray-500">
          Thank you for your purchase. We have received your order and will process it shortly.
        </p>
      </div>

      {/* Order info card */}
      <div class="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
        {/* Order header */}
        <div class="bg-gray-50 px-6 py-4 border-b border-gray-100">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div class="text-xs text-gray-500">Order Number</div>
              <div class="text-lg font-bold text-gray-900 font-mono">#{orderNumber}</div>
            </div>
            <div class="text-right">
              <div class="text-xs text-gray-500">Status</div>
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                <span class="w-1.5 h-1.5 rounded-full bg-green-500" />
                {order.status || "Pending"}
              </span>
            </div>
          </div>
          {order.createdAt && (
            <div class="mt-2 text-xs text-gray-400">
              Placed on {new Date(order.createdAt).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
          )}
        </div>

        {/* Order items */}
        <div class="px-6 py-4">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Order Summary</h3>
          <div class="space-y-3">
            {order.items.map((item) => (
              <div key={item.id} class="flex items-center justify-between gap-4 py-2">
                <div class="min-w-0 flex-1">
                  <div class="text-sm font-medium text-gray-900 truncate">{item.productName}</div>
                  {item.variantTitle && (
                    <div class="text-xs text-gray-500">{item.variantTitle}</div>
                  )}
                  <div class="text-xs text-gray-400 mt-0.5">
                    Qty: {item.quantity} x ${parseFloat(item.unitPrice).toFixed(2)}
                  </div>
                </div>
                <div class="text-sm font-semibold text-gray-900 shrink-0">
                  ${parseFloat(item.totalPrice).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div class="px-6 py-4 bg-gray-50 border-t border-gray-100 space-y-2">
          <div class="flex justify-between text-sm">
            <span class="text-gray-600">Subtotal</span>
            <span class="font-medium text-gray-900">${parseFloat(order.subtotal).toFixed(2)}</span>
          </div>
          {parseFloat(order.shippingCost) > 0 && (
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Shipping</span>
              <span class="font-medium text-gray-900">${parseFloat(order.shippingCost).toFixed(2)}</span>
            </div>
          )}
          {parseFloat(order.tax) > 0 && (
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">Tax</span>
              <span class="font-medium text-gray-900">${parseFloat(order.tax).toFixed(2)}</span>
            </div>
          )}
          <div class="flex justify-between text-base font-bold pt-2 border-t border-gray-200">
            <span class="text-gray-900">Total</span>
            <span class="text-gray-900">${parseFloat(order.total).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div class="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
        <Button variant="primary" size="lg" href="/products">
          Continue Shopping
        </Button>
        <Button variant="outline" size="lg" href="/account/orders">
          View My Orders
        </Button>
      </div>

      {/* Help note */}
      <div class="mt-8 text-center">
        <p class="text-xs text-gray-400">
          A confirmation email has been sent to your registered email address.
          If you have any questions, please contact our support team.
        </p>
      </div>
    </div>
  );
};
