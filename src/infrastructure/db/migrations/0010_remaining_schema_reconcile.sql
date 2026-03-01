DO $$
BEGIN
  CREATE TYPE "public"."carrier" AS ENUM ('usps', 'fedex', 'ups');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;--> statement-breakpoint
DO $$
BEGIN
  CREATE TYPE "public"."integration_provider" AS ENUM ('stripe', 'printful', 'gemini', 'resend', 'gooten', 'prodigi', 'shapeways', 'taxjar', 'avalara', 'usps', 'fedex', 'ups', 'exchangerate_api', 'segment', 'mixpanel');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;--> statement-breakpoint
DO $$
BEGIN
  CREATE TYPE "public"."integration_status" AS ENUM ('connected', 'disconnected', 'error', 'pending_verification');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;--> statement-breakpoint
DO $$
BEGIN
  CREATE TYPE "public"."inventory_transaction_type" AS ENUM ('adjustment', 'sale', 'return', 'restock', 'reservation', 'release');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;--> statement-breakpoint
DO $$
BEGIN
  CREATE TYPE "public"."order_note_type" AS ENUM ('customer', 'internal', 'system');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;--> statement-breakpoint
DO $$
BEGIN
  CREATE TYPE "public"."refund_status" AS ENUM ('pending', 'processing', 'succeeded', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;--> statement-breakpoint
DO $$
BEGIN
  CREATE TYPE "public"."fulfillment_request_status" AS ENUM ('pending', 'submitted', 'processing', 'shipped', 'delivered', 'cancel_requested', 'cancelled', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;--> statement-breakpoint
DO $$
BEGIN
  CREATE TYPE "public"."waitlist_status" AS ENUM ('waiting', 'notified', 'expired', 'converted');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "platform_integrations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "store_id" uuid REFERENCES "public"."stores"("id"),
  "provider" "integration_provider" NOT NULL,
  "enabled" boolean DEFAULT true,
  "config" jsonb DEFAULT '{}'::jsonb,
  "status" "integration_status" DEFAULT 'disconnected',
  "status_message" text,
  "last_verified_at" timestamp,
  "last_sync_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "integrations_store_provider_idx" ON "platform_integrations" ("store_id", "provider");--> statement-breakpoint

DO $$
BEGIN
  IF to_regclass('public.integration_secrets') IS NOT NULL
     AND to_regclass('public.platform_integrations') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'integration_secrets_integration_id_platform_integrations_id_fk'
     ) THEN
    ALTER TABLE "integration_secrets"
      ADD CONSTRAINT "integration_secrets_integration_id_platform_integrations_id_fk"
      FOREIGN KEY ("integration_id") REFERENCES "public"."platform_integrations"("id")
      ON DELETE cascade ON UPDATE no action;
  END IF;
END
$$;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade,
  "token" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "used_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "email_verification_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade,
  "token" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "used_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "email_verification_tokens_token_unique" UNIQUE("token")
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "booking_waitlist" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "store_id" uuid NOT NULL REFERENCES "public"."stores"("id"),
  "user_id" uuid NOT NULL REFERENCES "public"."users"("id"),
  "availability_id" uuid NOT NULL REFERENCES "public"."booking_availability"("id"),
  "position" integer NOT NULL,
  "status" "waitlist_status" DEFAULT 'waiting' NOT NULL,
  "notified_at" timestamp,
  "expired_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "booking_waitlist_availability_status_idx" ON "booking_waitlist" ("availability_id", "status");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "design_placements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "product_id" uuid NOT NULL REFERENCES "public"."products"("id"),
  "area" text NOT NULL,
  "image_url" text NOT NULL,
  "x" integer DEFAULT 0,
  "y" integer DEFAULT 0,
  "scale" numeric(5, 3) DEFAULT '1.000',
  "rotation" integer DEFAULT 0,
  "print_area_id" text,
  "provider_meta" jsonb,
  "created_at" timestamp DEFAULT now()
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "fulfillment_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "store_id" uuid NOT NULL REFERENCES "public"."stores"("id"),
  "order_id" uuid NOT NULL REFERENCES "public"."orders"("id"),
  "provider" "fulfillment_provider_type" NOT NULL,
  "provider_id" uuid REFERENCES "public"."fulfillment_providers"("id"),
  "external_id" text,
  "status" "fulfillment_request_status" DEFAULT 'pending',
  "items_snapshot" jsonb,
  "cost_estimated_total" numeric(10, 2),
  "cost_actual_total" numeric(10, 2),
  "cost_shipping" numeric(10, 2),
  "cost_tax" numeric(10, 2),
  "currency" text DEFAULT 'USD',
  "refund_stripe_id" text,
  "refund_amount" numeric(10, 2),
  "refund_status" text,
  "error_message" text,
  "submitted_at" timestamp,
  "completed_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fulfillment_requests_order_idx" ON "fulfillment_requests" ("order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fulfillment_requests_provider_external_idx" ON "fulfillment_requests" ("provider", "external_id");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "fulfillment_request_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "fulfillment_request_id" uuid NOT NULL REFERENCES "public"."fulfillment_requests"("id") ON DELETE cascade,
  "order_item_id" uuid REFERENCES "public"."order_items"("id"),
  "provider_line_id" text,
  "quantity" integer NOT NULL,
  "status" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fulfillment_request_items_request_idx" ON "fulfillment_request_items" ("fulfillment_request_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "fulfillment_request_items_order_item_idx" ON "fulfillment_request_items" ("order_item_id");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "provider_health_snapshots" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "store_id" uuid NOT NULL REFERENCES "public"."stores"("id"),
  "provider" text NOT NULL,
  "period" date NOT NULL,
  "total_requests" integer DEFAULT 0 NOT NULL,
  "success_count" integer DEFAULT 0 NOT NULL,
  "failure_count" integer DEFAULT 0 NOT NULL,
  "avg_response_ms" integer,
  "created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "health_store_provider_period_idx" ON "provider_health_snapshots" ("store_id", "provider", "period");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "customer_segments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "store_id" uuid NOT NULL REFERENCES "public"."stores"("id"),
  "name" text NOT NULL,
  "description" text,
  "rules" jsonb DEFAULT '{}'::jsonb,
  "member_count" integer DEFAULT 0,
  "last_refreshed_at" timestamp,
  "created_at" timestamp DEFAULT now()
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "carrier_accounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "store_id" uuid NOT NULL REFERENCES "public"."stores"("id"),
  "carrier" "carrier" NOT NULL,
  "integration_id" uuid REFERENCES "public"."platform_integrations"("id"),
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now()
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "store_currencies" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "store_id" uuid NOT NULL REFERENCES "public"."stores"("id"),
  "base_currency" text DEFAULT 'USD' NOT NULL,
  "enabled_currencies" jsonb DEFAULT '[]'::jsonb,
  "display_format" text DEFAULT 'symbol_first',
  "auto_detect_locale" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now(),
  CONSTRAINT "store_currencies_store_id_unique" UNIQUE("store_id")
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "digital_assets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "product_id" uuid NOT NULL REFERENCES "public"."products"("id"),
  "file_name" text NOT NULL,
  "file_size" integer NOT NULL,
  "storage_key" text NOT NULL,
  "content_type" text NOT NULL,
  "created_at" timestamp DEFAULT now()
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "redirects" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "store_id" uuid NOT NULL REFERENCES "public"."stores"("id"),
  "from_path" text NOT NULL,
  "to_path" text NOT NULL,
  "status_code" integer DEFAULT 301 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "redirects_store_from_idx" ON "redirects" ("store_id", "from_path");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "audit_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "store_id" uuid NOT NULL REFERENCES "public"."stores"("id"),
  "user_id" uuid,
  "action" text NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" uuid,
  "details" jsonb,
  "ip_address" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_log_store_entity_idx" ON "audit_log" ("store_id", "entity_type", "created_at");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "inventory_transactions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "store_id" uuid NOT NULL REFERENCES "public"."stores"("id"),
  "variant_id" uuid NOT NULL REFERENCES "public"."product_variants"("id"),
  "type" "inventory_transaction_type" NOT NULL,
  "quantity" integer NOT NULL,
  "reference" text,
  "note" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_transactions_variant_idx" ON "inventory_transactions" ("variant_id", "created_at");--> statement-breakpoint
