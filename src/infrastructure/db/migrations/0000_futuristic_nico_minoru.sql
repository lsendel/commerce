CREATE TYPE "public"."ai_provider" AS ENUM('gemini', 'flux');--> statement-breakpoint
CREATE TYPE "public"."booking_availability_status" AS ENUM('available', 'full', 'in_progress', 'completed', 'closed', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."booking_request_status" AS ENUM('cart', 'pending_payment', 'confirmed', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('confirmed', 'checked_in', 'cancelled', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."capacity_type" AS ENUM('individual', 'group');--> statement-breakpoint
CREATE TYPE "public"."duration_unit" AS ENUM('minutes', 'hours');--> statement-breakpoint
CREATE TYPE "public"."generation_status" AS ENUM('queued', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."person_type" AS ENUM('adult', 'child', 'pet');--> statement-breakpoint
CREATE TYPE "public"."product_type" AS ENUM('physical', 'digital', 'subscription', 'bookable');--> statement-breakpoint
CREATE TYPE "public"."shipment_status" AS ENUM('pending', 'shipped', 'in_transit', 'delivered', 'returned');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'past_due', 'cancelled', 'trialing', 'paused');--> statement-breakpoint
CREATE TABLE "addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"label" text,
	"street" text NOT NULL,
	"city" text NOT NULL,
	"state" text,
	"zip" text NOT NULL,
	"country" text NOT NULL,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "art_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"style_prompt" text NOT NULL,
	"preview_image_url" text,
	"category" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "art_templates_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "booking_availability" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"total_capacity" integer NOT NULL,
	"slot_date" text NOT NULL,
	"slot_time" text NOT NULL,
	"slot_datetime" timestamp NOT NULL,
	"reserved_count" integer DEFAULT 0,
	"status" "booking_availability_status" DEFAULT 'available',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "booking_availability_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"availability_id" uuid NOT NULL,
	"person_type" "person_type" NOT NULL,
	"price" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"location" text,
	"included" jsonb,
	"not_included" jsonb,
	"itinerary" jsonb,
	"faqs" jsonb,
	"cancellation_policy" text,
	CONSTRAINT "booking_config_product_id_unique" UNIQUE("product_id")
);
--> statement-breakpoint
CREATE TABLE "booking_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"person_type" "person_type" NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"total_price" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"availability_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "booking_request_status" DEFAULT 'cart',
	"quantity" integer NOT NULL,
	"expires_at" timestamp,
	"order_id" uuid,
	"cart_item_id" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "booking_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"duration" integer NOT NULL,
	"duration_unit" "duration_unit" DEFAULT 'minutes',
	"capacity_type" "capacity_type" DEFAULT 'individual',
	"capacity_per_slot" integer NOT NULL,
	"cut_off_time" integer DEFAULT 24,
	"cut_off_unit" "duration_unit" DEFAULT 'hours',
	"max_advance_time" integer DEFAULT 90,
	"max_advance_unit" text DEFAULT 'days',
	"min_participants" integer DEFAULT 1,
	"enable_waitlist" boolean DEFAULT false,
	"enable_private_event" boolean DEFAULT false,
	"min_private_size" integer,
	"max_private_size" integer,
	CONSTRAINT "booking_settings_product_id_unique" UNIQUE("product_id")
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_item_id" uuid,
	"user_id" uuid NOT NULL,
	"booking_availability_id" uuid NOT NULL,
	"status" "booking_status" DEFAULT 'confirmed',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cart_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cart_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"booking_availability_id" uuid,
	"person_type_quantities" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "carts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"session_id" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "collection_products" (
	"collection_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"position" integer DEFAULT 0,
	CONSTRAINT "collection_products_collection_id_product_id_pk" PRIMARY KEY("collection_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"seo_title" text,
	"seo_description" text,
	"image_url" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "collections_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "generation_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"pet_profile_id" uuid NOT NULL,
	"template_id" uuid,
	"status" "generation_status" DEFAULT 'queued',
	"input_image_url" text,
	"output_svg_url" text,
	"output_raster_url" text,
	"provider" "ai_provider",
	"prompt" text,
	"error_message" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"variant_id" uuid,
	"product_name" text NOT NULL,
	"variant_title" text,
	"quantity" integer NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"total_price" numeric(10, 2) NOT NULL,
	"booking_availability_id" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"stripe_checkout_session_id" text,
	"stripe_payment_intent_id" text,
	"status" "order_status" DEFAULT 'pending',
	"subtotal" numeric(10, 2) NOT NULL,
	"tax" numeric(10, 2) DEFAULT '0',
	"shipping_cost" numeric(10, 2) DEFAULT '0',
	"total" numeric(10, 2) NOT NULL,
	"shipping_address" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pet_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"species" text NOT NULL,
	"breed" text,
	"photo_url" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "printful_sync_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"printful_id" integer NOT NULL,
	"product_id" uuid NOT NULL,
	"external_id" text,
	"synced_at" timestamp,
	CONSTRAINT "printful_sync_products_printful_id_unique" UNIQUE("printful_id")
);
--> statement-breakpoint
CREATE TABLE "printful_sync_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"printful_id" integer NOT NULL,
	"variant_id" uuid NOT NULL,
	"printful_product_id" integer,
	"synced_at" timestamp,
	CONSTRAINT "printful_sync_variants_printful_id_unique" UNIQUE("printful_id")
);
--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"url" text NOT NULL,
	"alt_text" text,
	"position" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"title" text NOT NULL,
	"sku" text,
	"price" numeric(10, 2) NOT NULL,
	"compare_at_price" numeric(10, 2),
	"inventory_quantity" integer DEFAULT 0,
	"options" jsonb,
	"printful_sync_variant_id" integer,
	"available_for_sale" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "product_variants_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"description_html" text,
	"type" "product_type" NOT NULL,
	"available_for_sale" boolean DEFAULT true,
	"download_url" text,
	"stripe_price_id" text,
	"printful_sync_product_id" integer,
	"featured_image_url" text,
	"seo_title" text,
	"seo_description" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "shipments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"carrier" text,
	"tracking_number" text,
	"tracking_url" text,
	"status" "shipment_status" DEFAULT 'pending',
	"shipped_at" timestamp,
	"delivered_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "subscription_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"billing_period" text NOT NULL,
	"billing_interval" integer DEFAULT 1,
	"trial_days" integer DEFAULT 0,
	"stripe_product_id" text,
	"stripe_price_id" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"stripe_subscription_id" text,
	"stripe_customer_id" text,
	"status" "subscription_status" DEFAULT 'active',
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"cancel_at_period_end" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "subscriptions_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"stripe_customer_id" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_availability" ADD CONSTRAINT "booking_availability_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_availability_prices" ADD CONSTRAINT "booking_availability_prices_availability_id_booking_availability_id_fk" FOREIGN KEY ("availability_id") REFERENCES "public"."booking_availability"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_config" ADD CONSTRAINT "booking_config_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_items" ADD CONSTRAINT "booking_items_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_requests" ADD CONSTRAINT "booking_requests_availability_id_booking_availability_id_fk" FOREIGN KEY ("availability_id") REFERENCES "public"."booking_availability"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_requests" ADD CONSTRAINT "booking_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_requests" ADD CONSTRAINT "booking_requests_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_requests" ADD CONSTRAINT "booking_requests_cart_item_id_cart_items_id_fk" FOREIGN KEY ("cart_item_id") REFERENCES "public"."cart_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_settings" ADD CONSTRAINT "booking_settings_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_booking_availability_id_booking_availability_id_fk" FOREIGN KEY ("booking_availability_id") REFERENCES "public"."booking_availability"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_booking_availability_id_booking_availability_id_fk" FOREIGN KEY ("booking_availability_id") REFERENCES "public"."booking_availability"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_products" ADD CONSTRAINT "collection_products_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_products" ADD CONSTRAINT "collection_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_pet_profile_id_pet_profiles_id_fk" FOREIGN KEY ("pet_profile_id") REFERENCES "public"."pet_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_template_id_art_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."art_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_booking_availability_id_booking_availability_id_fk" FOREIGN KEY ("booking_availability_id") REFERENCES "public"."booking_availability"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pet_profiles" ADD CONSTRAINT "pet_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "printful_sync_products" ADD CONSTRAINT "printful_sync_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "printful_sync_variants" ADD CONSTRAINT "printful_sync_variants_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD CONSTRAINT "subscription_plans_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_subscription_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "booking_availability_product_date_idx" ON "booking_availability" USING btree ("product_id","slot_date");