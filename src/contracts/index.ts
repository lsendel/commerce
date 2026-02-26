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
import { affiliatesContract } from "./affiliates.contract";
import { platformContract } from "./platform.contract";
import { venuesContract } from "./venues.contract";
import { promotionsContract } from "./promotions.contract";
import { shippingContract } from "./shipping.contract";
import { taxContract } from "./tax.contract";
import { reviewsContract } from "./reviews.contract";
import { analyticsContract } from "./analytics.contract";
import { currencyContract } from "./currency.contract";

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
  affiliates: affiliatesContract,
  platform: platformContract,
  venues: venuesContract,
  promotions: promotionsContract,
  shipping: shippingContract,
  tax: taxContract,
  reviews: reviewsContract,
  analytics: analyticsContract,
  currency: currencyContract,
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
  affiliatesContract,
  platformContract,
  venuesContract,
  promotionsContract,
  shippingContract,
  taxContract,
  reviewsContract,
  analyticsContract,
  currencyContract,
};
