export interface Env {
  // Database
  DATABASE_URL: string;

  // Auth
  JWT_SECRET: string;

  // Stripe
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_PUBLISHABLE_KEY: string;

  // Printful
  PRINTFUL_API_KEY: string;
  PRINTFUL_WEBHOOK_SECRET: string;

  // AI
  GEMINI_API_KEY: string;

  // App
  APP_URL: string;
  APP_NAME: string;

  // Platform
  PLATFORM_DOMAINS: string; // comma-separated: "petm8.io,premiumstores.net,premiums.shop"
  DEFAULT_STORE_ID: string;

  // Email
  RESEND_API_KEY?: string;

  // Encryption
  ENCRYPTION_KEY?: string;

  // Cloudflare bindings
  IMAGES: R2Bucket;
  AI_QUEUE: Queue;
  FULFILLMENT_QUEUE: Queue;
  NOTIFICATION_QUEUE: Queue;
  AI: Ai;
}
