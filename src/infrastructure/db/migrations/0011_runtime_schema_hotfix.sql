-- Runtime hotfix: add columns referenced by repositories/pages but missing in live DB.
ALTER TABLE IF EXISTS "orders"
  ADD COLUMN IF NOT EXISTS "discount" numeric(10, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE IF EXISTS "orders"
  ADD COLUMN IF NOT EXISTS "coupon_code" text;--> statement-breakpoint
ALTER TABLE IF EXISTS "orders"
  ADD COLUMN IF NOT EXISTS "currency" text DEFAULT 'USD';--> statement-breakpoint
ALTER TABLE IF EXISTS "orders"
  ADD COLUMN IF NOT EXISTS "exchange_rate" numeric(12, 6);--> statement-breakpoint
ALTER TABLE IF EXISTS "orders"
  ADD COLUMN IF NOT EXISTS "notes" text;--> statement-breakpoint
ALTER TABLE IF EXISTS "orders"
  ADD COLUMN IF NOT EXISTS "internal_notes" text;--> statement-breakpoint
ALTER TABLE IF EXISTS "orders"
  ADD COLUMN IF NOT EXISTS "cancel_reason" text;--> statement-breakpoint
ALTER TABLE IF EXISTS "orders"
  ADD COLUMN IF NOT EXISTS "cancelled_at" timestamp;--> statement-breakpoint

ALTER TABLE IF EXISTS "pet_profiles"
  ADD COLUMN IF NOT EXISTS "photo_storage_key" text;--> statement-breakpoint
ALTER TABLE IF EXISTS "pet_profiles"
  ADD COLUMN IF NOT EXISTS "date_of_birth" timestamp;--> statement-breakpoint

ALTER TABLE IF EXISTS "affiliates"
  ADD COLUMN IF NOT EXISTS "payout_email" text;--> statement-breakpoint
