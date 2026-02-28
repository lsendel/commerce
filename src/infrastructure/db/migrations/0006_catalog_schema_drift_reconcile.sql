DO $$
BEGIN
  CREATE TYPE "public"."product_status" AS ENUM ('draft', 'active', 'archived');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;--> statement-breakpoint
DO $$
BEGIN
  CREATE TYPE "public"."review_status" AS ENUM ('pending', 'approved', 'rejected', 'spam');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "status" "product_status";--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "status" SET DEFAULT 'active';--> statement-breakpoint
UPDATE "products" SET "status" = 'active' WHERE "status" IS NULL;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "status" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "art_job_id" uuid;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_store_status_idx" ON "products" ("store_id","status");--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "weight" numeric(10,2);--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "weight_unit" text;--> statement-breakpoint
ALTER TABLE "product_variants" ALTER COLUMN "weight_unit" SET DEFAULT 'oz';--> statement-breakpoint
UPDATE "product_variants" SET "weight_unit" = 'oz' WHERE "weight_unit" IS NULL;--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "reserved_quantity" integer;--> statement-breakpoint
ALTER TABLE "product_variants" ALTER COLUMN "reserved_quantity" SET DEFAULT 0;--> statement-breakpoint
UPDATE "product_variants" SET "reserved_quantity" = 0 WHERE "reserved_quantity" IS NULL;--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "digital_asset_key" text;--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "fulfillment_provider" "fulfillment_provider_type";--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "estimated_production_days" integer;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD COLUMN IF NOT EXISTS "verified_purchase_order_id" uuid;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD COLUMN IF NOT EXISTS "status" "review_status";--> statement-breakpoint
ALTER TABLE "product_reviews" ALTER COLUMN "status" SET DEFAULT 'approved';--> statement-breakpoint
UPDATE "product_reviews" SET "status" = 'approved' WHERE "status" IS NULL;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD COLUMN IF NOT EXISTS "moderated_at" timestamp;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD COLUMN IF NOT EXISTS "response_text" text;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD COLUMN IF NOT EXISTS "response_at" timestamp;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD COLUMN IF NOT EXISTS "helpful_count" integer;--> statement-breakpoint
ALTER TABLE "product_reviews" ALTER COLUMN "helpful_count" SET DEFAULT 0;--> statement-breakpoint
UPDATE "product_reviews" SET "helpful_count" = 0 WHERE "helpful_count" IS NULL;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD COLUMN IF NOT EXISTS "reported_count" integer;--> statement-breakpoint
ALTER TABLE "product_reviews" ALTER COLUMN "reported_count" SET DEFAULT 0;--> statement-breakpoint
UPDATE "product_reviews" SET "reported_count" = 0 WHERE "reported_count" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "reviews_product_user_idx" ON "product_reviews" ("product_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reviews_store_status_idx" ON "product_reviews" ("store_id","status");
