import { initContract } from "@ts-rest/core";
import { authContract } from "./auth.contract";
import { productsContract } from "./products.contract";
import { cartContract } from "./cart.contract";
import { checkoutContract } from "./checkout.contract";
import { ordersContract } from "./orders.contract";
import { subscriptionsContract } from "./subscriptions.contract";
import { bookingsContract } from "./bookings.contract";
import { aiStudioContract } from "./ai-studio.contract";
import { fulfillmentContract } from "./fulfillment.contract";

const c = initContract();

export const contract = c.router({
  auth: authContract,
  products: productsContract,
  cart: cartContract,
  checkout: checkoutContract,
  orders: ordersContract,
  subscriptions: subscriptionsContract,
  bookings: bookingsContract,
  aiStudio: aiStudioContract,
  fulfillment: fulfillmentContract,
});

export {
  authContract,
  productsContract,
  cartContract,
  checkoutContract,
  ordersContract,
  subscriptionsContract,
  bookingsContract,
  aiStudioContract,
  fulfillmentContract,
};
