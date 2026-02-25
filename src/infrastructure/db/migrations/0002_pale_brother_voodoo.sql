CREATE TYPE "public"."affiliate_status" AS ENUM('pending', 'approved', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."attribution_method" AS ENUM('link', 'coupon', 'tier');--> statement-breakpoint
CREATE TYPE "public"."conversion_status" AS ENUM('pending', 'approved', 'paid', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."domain_verification_status" AS ENUM('pending', 'verified', 'failed');--> statement-breakpoint
CREATE TYPE "public"."fulfillment_provider_type" AS ENUM('printful', 'gooten', 'prodigi', 'shapeways');--> statement-breakpoint
CREATE TYPE "public"."payout_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."platform_role" AS ENUM('super_admin', 'group_admin', 'user');--> statement-breakpoint
CREATE TYPE "public"."store_billing_status" AS ENUM('active', 'past_due', 'cancelled', 'trialing');--> statement-breakpoint
CREATE TYPE "public"."store_member_role" AS ENUM('owner', 'admin', 'staff');--> statement-breakpoint
CREATE TYPE "public"."store_status" AS ENUM('trial', 'active', 'suspended', 'deactivated');--> statement-breakpoint
CREATE TABLE "affiliate_clicks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"link_id" uuid NOT NULL,
	"ip" text,
	"user_agent" text,
	"referrer" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "affiliate_conversions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"affiliate_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"order_total" numeric(10, 2) NOT NULL,
	"commission_amount" numeric(10, 2) NOT NULL,
	"status" "conversion_status" DEFAULT 'pending',
	"attribution_method" "attribution_method" NOT NULL,
	"click_id" uuid,
	"coupon_code" text,
	"parent_conversion_id" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "affiliate_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"affiliate_id" uuid NOT NULL,
	"target_url" text NOT NULL,
	"short_code" text NOT NULL,
	"click_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "affiliate_links_short_code_unique" UNIQUE("short_code")
);
--> statement-breakpoint
CREATE TABLE "affiliate_payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"affiliate_id" uuid NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"stripe_transfer_id" text,
	"status" "payout_status" DEFAULT 'pending',
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "affiliate_tiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"name" text NOT NULL,
	"level" integer NOT NULL,
	"commission_rate" numeric(5, 2) NOT NULL,
	"bonus_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"min_sales" integer DEFAULT 0,
	"min_revenue" numeric(10, 2) DEFAULT '0',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "affiliates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"status" "affiliate_status" DEFAULT 'pending',
	"referral_code" text NOT NULL,
	"custom_slug" text,
	"commission_rate" numeric(5, 2) NOT NULL,
	"parent_affiliate_id" uuid,
	"tier_id" uuid,
	"total_earnings" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total_clicks" integer DEFAULT 0 NOT NULL,
	"total_conversions" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "affiliates_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE "fulfillment_providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "fulfillment_provider_type" NOT NULL,
	"api_key" text,
	"api_secret" text,
	"is_active" boolean DEFAULT true,
	"config" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "platform_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"monthly_price" numeric(10, 2) DEFAULT '0' NOT NULL,
	"transaction_fee_percent" numeric(5, 2) DEFAULT '5' NOT NULL,
	"max_products" integer,
	"max_staff" integer,
	"features" jsonb DEFAULT '{}'::jsonb,
	"stripe_price_id" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "platform_plans_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "platform_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"order_total" numeric(10, 2) NOT NULL,
	"platform_fee_percent" numeric(5, 2) NOT NULL,
	"platform_fee_amount" numeric(10, 2) NOT NULL,
	"stripe_transfer_id" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "provider_product_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"variant_id" uuid NOT NULL,
	"provider_id" uuid NOT NULL,
	"external_product_id" text,
	"external_variant_id" text,
	"cost_price" numeric(10, 2),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "store_billing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"platform_plan_id" uuid NOT NULL,
	"stripe_subscription_id" text,
	"stripe_customer_id" text,
	"status" "store_billing_status" DEFAULT 'trialing',
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "store_billing_store_id_unique" UNIQUE("store_id"),
	CONSTRAINT "store_billing_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "store_domains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"domain" text NOT NULL,
	"verification_status" "domain_verification_status" DEFAULT 'pending',
	"verification_token" text,
	"is_primary" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "store_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "store_member_role" DEFAULT 'staff' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "store_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"key" text NOT NULL,
	"value" text
);
--> statement-breakpoint
CREATE TABLE "stores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"subdomain" text,
	"custom_domain" text,
	"logo" text,
	"primary_color" text,
	"secondary_color" text,
	"status" "store_status" DEFAULT 'trial',
	"plan_id" uuid,
	"stripe_connect_account_id" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "stores_slug_unique" UNIQUE("slug"),
	CONSTRAINT "stores_subdomain_unique" UNIQUE("subdomain")
);
--> statement-breakpoint
CREATE TABLE "venues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"address" text NOT NULL,
	"city" text NOT NULL,
	"state" text,
	"country" text NOT NULL,
	"postal_code" text NOT NULL,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"amenities" jsonb DEFAULT '[]'::jsonb,
	"photos" jsonb DEFAULT '[]'::jsonb,
	"capacity" integer,
	"description" text,
	"contact_email" text,
	"contact_phone" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "art_templates" ADD COLUMN "store_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "booking_availability" ADD COLUMN "store_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "booking_config" ADD COLUMN "venue_id" uuid;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "store_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "carts" ADD COLUMN "store_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "collections" ADD COLUMN "store_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD COLUMN "store_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "store_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "pet_profiles" ADD COLUMN "store_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "printful_sync_products" ADD COLUMN "store_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD COLUMN "store_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "store_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "store_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "store_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "platform_role" "platform_role" DEFAULT 'user';--> statement-breakpoint
ALTER TABLE "affiliate_clicks" ADD CONSTRAINT "affiliate_clicks_link_id_affiliate_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."affiliate_links"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_conversions" ADD CONSTRAINT "affiliate_conversions_affiliate_id_affiliates_id_fk" FOREIGN KEY ("affiliate_id") REFERENCES "public"."affiliates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_conversions" ADD CONSTRAINT "affiliate_conversions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_conversions" ADD CONSTRAINT "affiliate_conversions_click_id_affiliate_clicks_id_fk" FOREIGN KEY ("click_id") REFERENCES "public"."affiliate_clicks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_links" ADD CONSTRAINT "affiliate_links_affiliate_id_affiliates_id_fk" FOREIGN KEY ("affiliate_id") REFERENCES "public"."affiliates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_payouts" ADD CONSTRAINT "affiliate_payouts_affiliate_id_affiliates_id_fk" FOREIGN KEY ("affiliate_id") REFERENCES "public"."affiliates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_tiers" ADD CONSTRAINT "affiliate_tiers_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliates" ADD CONSTRAINT "affiliates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliates" ADD CONSTRAINT "affiliates_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliates" ADD CONSTRAINT "affiliates_tier_id_affiliate_tiers_id_fk" FOREIGN KEY ("tier_id") REFERENCES "public"."affiliate_tiers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fulfillment_providers" ADD CONSTRAINT "fulfillment_providers_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_transactions" ADD CONSTRAINT "platform_transactions_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_transactions" ADD CONSTRAINT "platform_transactions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_product_mappings" ADD CONSTRAINT "provider_product_mappings_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_product_mappings" ADD CONSTRAINT "provider_product_mappings_provider_id_fulfillment_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."fulfillment_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_billing" ADD CONSTRAINT "store_billing_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_billing" ADD CONSTRAINT "store_billing_platform_plan_id_platform_plans_id_fk" FOREIGN KEY ("platform_plan_id") REFERENCES "public"."platform_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_domains" ADD CONSTRAINT "store_domains_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_members" ADD CONSTRAINT "store_members_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_members" ADD CONSTRAINT "store_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_settings" ADD CONSTRAINT "store_settings_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stores" ADD CONSTRAINT "stores_plan_id_platform_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."platform_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venues" ADD CONSTRAINT "venues_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "affiliate_clicks_link_created_idx" ON "affiliate_clicks" USING btree ("link_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "affiliates_store_user_idx" ON "affiliates" USING btree ("store_id","user_id");--> statement-breakpoint
CREATE INDEX "affiliates_referral_code_idx" ON "affiliates" USING btree ("referral_code");--> statement-breakpoint
CREATE INDEX "fulfillment_providers_store_type_idx" ON "fulfillment_providers" USING btree ("store_id","type");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_product_mappings_variant_provider_idx" ON "provider_product_mappings" USING btree ("variant_id","provider_id");--> statement-breakpoint
CREATE UNIQUE INDEX "store_domains_domain_idx" ON "store_domains" USING btree ("domain");--> statement-breakpoint
CREATE UNIQUE INDEX "store_members_store_user_idx" ON "store_members" USING btree ("store_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "store_settings_store_key_idx" ON "store_settings" USING btree ("store_id","key");--> statement-breakpoint
CREATE INDEX "stores_subdomain_idx" ON "stores" USING btree ("subdomain");--> statement-breakpoint
CREATE INDEX "stores_custom_domain_idx" ON "stores" USING btree ("custom_domain");--> statement-breakpoint
CREATE UNIQUE INDEX "venues_store_slug_idx" ON "venues" USING btree ("store_id","slug");--> statement-breakpoint
CREATE INDEX "venues_city_idx" ON "venues" USING btree ("city");--> statement-breakpoint
ALTER TABLE "art_templates" ADD CONSTRAINT "art_templates_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_availability" ADD CONSTRAINT "booking_availability_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_config" ADD CONSTRAINT "booking_config_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pet_profiles" ADD CONSTRAINT "pet_profiles_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "printful_sync_products" ADD CONSTRAINT "printful_sync_products_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;