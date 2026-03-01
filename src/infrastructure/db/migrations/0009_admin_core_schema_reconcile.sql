DO $$
BEGIN
  CREATE TYPE "public"."invitation_status" AS ENUM ('pending', 'accepted', 'expired');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;--> statement-breakpoint
DO $$
BEGIN
  CREATE TYPE "public"."promotion_type" AS ENUM ('coupon', 'automatic', 'flash_sale');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;--> statement-breakpoint
DO $$
BEGIN
  CREATE TYPE "public"."promotion_status" AS ENUM ('active', 'scheduled', 'expired', 'disabled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;--> statement-breakpoint
DO $$
BEGIN
  CREATE TYPE "public"."promotion_strategy" AS ENUM ('percentage_off', 'fixed_amount', 'free_shipping', 'bogo', 'buy_x_get_y', 'tiered', 'bundle');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;--> statement-breakpoint
DO $$
BEGIN
  CREATE TYPE "public"."eligibility_type" AS ENUM ('include', 'exclude');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;--> statement-breakpoint
DO $$
BEGIN
  CREATE TYPE "public"."shipping_rate_type" AS ENUM ('flat', 'weight_based', 'price_based', 'carrier_calculated');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;--> statement-breakpoint
DO $$
BEGIN
  CREATE TYPE "public"."tax_type" AS ENUM ('sales_tax', 'vat', 'gst');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;--> statement-breakpoint
DO $$
BEGIN
  CREATE TYPE "public"."tax_applies_to" AS ENUM ('all', 'physical', 'digital', 'shipping');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "integration_secrets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "integration_id" uuid NOT NULL,
  "key" text NOT NULL,
  "encrypted_value" text NOT NULL,
  "iv" text NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "secrets_integration_key_idx" ON "integration_secrets" ("integration_id", "key");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "promotions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "store_id" uuid NOT NULL REFERENCES "public"."stores"("id"),
  "name" text NOT NULL,
  "description" text,
  "type" "promotion_type" NOT NULL,
  "status" "promotion_status" DEFAULT 'active',
  "priority" integer DEFAULT 0,
  "stackable" boolean DEFAULT false,
  "strategy_type" "promotion_strategy" NOT NULL,
  "strategy_params" jsonb DEFAULT '{}'::jsonb,
  "conditions" jsonb DEFAULT '{}'::jsonb,
  "starts_at" timestamp,
  "ends_at" timestamp,
  "usage_limit" integer,
  "usage_count" integer DEFAULT 0,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "promotions_store_status_idx" ON "promotions" ("store_id", "status");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "coupon_codes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "promotion_id" uuid NOT NULL REFERENCES "public"."promotions"("id"),
  "code" text NOT NULL,
  "max_redemptions" integer,
  "redemption_count" integer DEFAULT 0,
  "single_use_per_customer" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now()
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "coupon_codes_promotion_code_idx" ON "coupon_codes" ("promotion_id", "code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "coupon_codes_code_idx" ON "coupon_codes" ("code");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "promotion_redemptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "promotion_id" uuid NOT NULL REFERENCES "public"."promotions"("id"),
  "coupon_code_id" uuid REFERENCES "public"."coupon_codes"("id"),
  "order_id" uuid NOT NULL REFERENCES "public"."orders"("id"),
  "customer_id" uuid NOT NULL REFERENCES "public"."users"("id"),
  "discount_amount" numeric(10, 2) NOT NULL,
  "line_items_affected" jsonb,
  "created_at" timestamp DEFAULT now()
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "redemptions_promotion_idx" ON "promotion_redemptions" ("promotion_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "redemptions_order_idx" ON "promotion_redemptions" ("order_id");--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "shipping_zones" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "store_id" uuid NOT NULL REFERENCES "public"."stores"("id"),
  "name" text NOT NULL,
  "countries" jsonb DEFAULT '[]'::jsonb,
  "regions" jsonb DEFAULT '[]'::jsonb,
  "postal_code_ranges" jsonb DEFAULT '[]'::jsonb,
  "is_rest_of_world" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now()
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "shipping_rates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "zone_id" uuid NOT NULL REFERENCES "public"."shipping_zones"("id"),
  "name" text NOT NULL,
  "type" "shipping_rate_type" NOT NULL,
  "price" numeric(10, 2) DEFAULT '0',
  "min_weight" numeric(10, 2),
  "max_weight" numeric(10, 2),
  "min_order_total" numeric(10, 2),
  "max_order_total" numeric(10, 2),
  "carrier_provider" text,
  "estimated_days_min" integer,
  "estimated_days_max" integer,
  "created_at" timestamp DEFAULT now()
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "tax_zones" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "store_id" uuid NOT NULL REFERENCES "public"."stores"("id"),
  "name" text NOT NULL,
  "countries" jsonb DEFAULT '[]'::jsonb,
  "regions" jsonb DEFAULT '[]'::jsonb,
  "postal_codes" jsonb DEFAULT '[]'::jsonb,
  "priority" integer DEFAULT 0,
  "created_at" timestamp DEFAULT now()
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "tax_rates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tax_zone_id" uuid NOT NULL REFERENCES "public"."tax_zones"("id"),
  "name" text NOT NULL,
  "rate" numeric(5, 4) NOT NULL,
  "type" "tax_type" NOT NULL,
  "applies_to" "tax_applies_to" DEFAULT 'all',
  "compound" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now()
);--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "store_invitations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "store_id" uuid NOT NULL REFERENCES "public"."stores"("id"),
  "email" text NOT NULL,
  "role" "store_member_role" NOT NULL,
  "token" text NOT NULL,
  "invited_by" uuid NOT NULL REFERENCES "public"."users"("id"),
  "status" "invitation_status" DEFAULT 'pending' NOT NULL,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "store_invitations_token_unique" UNIQUE("token")
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "store_invitations_store_email_idx" ON "store_invitations" ("store_id", "email");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "store_invitations_token_idx" ON "store_invitations" ("token");
