import { z } from "zod";

export interface Env {
  // Database
  DATABASE_URL: string;

  // Auth
  JWT_SECRET: string;
  AUDIT_LOG_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  APPLE_CLIENT_ID?: string;
  APPLE_CLIENT_SECRET?: string;
  META_CLIENT_ID?: string;
  META_CLIENT_SECRET?: string;

  // Stripe
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_PUBLISHABLE_KEY: string;

  // Printful
  PRINTFUL_API_KEY: string;
  PRINTFUL_WEBHOOK_SECRET: string;

  // Prodigi
  PRODIGI_WEBHOOK_SECRET?: string;

  // AI
  GEMINI_API_KEY: string;

  // App
  APP_URL: string;
  APP_NAME: string;
  FEATURE_FLAGS?: string; // comma-separated feature flag keys
  CHECKOUT_RECOVERY_CHANNELS?: string; // comma-separated: email,sms,whatsapp

  // Platform
  PLATFORM_DOMAINS: string; // comma-separated: "petm8.io,premiumstores.net,premiums.shop"
  DEFAULT_STORE_ID: string;

  // Email
  RESEND_API_KEY?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_MESSAGING_SERVICE_SID?: string;
  TWILIO_SMS_FROM?: string;
  TWILIO_WHATSAPP_FROM?: string;

  // Encryption
  ENCRYPTION_KEY?: string;

  // Cache invalidation
  CACHE_WEBHOOK_SECRET?: string;

  // Cloudflare bindings
  IMAGES: R2Bucket;
  AI_QUEUE: Queue;
  FULFILLMENT_QUEUE: Queue;
  NOTIFICATION_QUEUE: Queue;
  AI: Ai;
}

const requiredEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  STRIPE_SECRET_KEY: z.string().min(1, "STRIPE_SECRET_KEY is required"),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, "STRIPE_WEBHOOK_SECRET is required"),
  STRIPE_PUBLISHABLE_KEY: z.string().min(1, "STRIPE_PUBLISHABLE_KEY is required"),
  PRINTFUL_API_KEY: z.string().min(1, "PRINTFUL_API_KEY is required"),
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
  APP_URL: z.string().url("APP_URL must be a valid URL"),
  APP_NAME: z.string().min(1, "APP_NAME is required"),
  PLATFORM_DOMAINS: z.string().min(1, "PLATFORM_DOMAINS is required"),
  DEFAULT_STORE_ID: z.string().uuid("DEFAULT_STORE_ID must be a valid UUID"),
});

let envValidated = false;

export function validateEnv(env: Env): void {
  if (envValidated) return;
  const result = requiredEnvSchema.safeParse(env);
  if (!result.success) {
    const missing = result.error.issues.map(i => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    console.error(`[STARTUP] Environment validation failed:\n${missing}`);
    throw new Error(`Missing or invalid environment variables:\n${missing}`);
  }
  envValidated = true;
}
