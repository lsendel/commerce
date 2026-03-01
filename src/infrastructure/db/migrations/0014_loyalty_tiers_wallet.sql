DO $$ BEGIN
  CREATE TYPE "public"."loyalty_transaction_type" AS ENUM ('earn', 'redeem', 'refund', 'adjustment');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "loyalty_tiers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "store_id" uuid NOT NULL,
  "name" text NOT NULL,
  "min_points" integer DEFAULT 0 NOT NULL,
  "multiplier" numeric(5,2) DEFAULT '1.00' NOT NULL,
  "benefits" jsonb DEFAULT '[]'::jsonb,
  "color" text,
  "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "loyalty_wallets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "store_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "available_points" integer DEFAULT 0 NOT NULL,
  "lifetime_earned" integer DEFAULT 0 NOT NULL,
  "lifetime_redeemed" integer DEFAULT 0 NOT NULL,
  "current_tier_id" uuid,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "loyalty_transactions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "store_id" uuid NOT NULL,
  "wallet_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "type" "loyalty_transaction_type" NOT NULL,
  "points" integer NOT NULL,
  "description" text,
  "source_order_id" uuid,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint

ALTER TABLE "loyalty_tiers"
  ADD CONSTRAINT "loyalty_tiers_store_id_stores_id_fk"
  FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "loyalty_wallets"
  ADD CONSTRAINT "loyalty_wallets_store_id_stores_id_fk"
  FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "loyalty_wallets"
  ADD CONSTRAINT "loyalty_wallets_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "loyalty_wallets"
  ADD CONSTRAINT "loyalty_wallets_current_tier_id_loyalty_tiers_id_fk"
  FOREIGN KEY ("current_tier_id") REFERENCES "public"."loyalty_tiers"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "loyalty_transactions"
  ADD CONSTRAINT "loyalty_transactions_store_id_stores_id_fk"
  FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "loyalty_transactions"
  ADD CONSTRAINT "loyalty_transactions_wallet_id_loyalty_wallets_id_fk"
  FOREIGN KEY ("wallet_id") REFERENCES "public"."loyalty_wallets"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "loyalty_transactions"
  ADD CONSTRAINT "loyalty_transactions_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "loyalty_transactions"
  ADD CONSTRAINT "loyalty_transactions_source_order_id_orders_id_fk"
  FOREIGN KEY ("source_order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "loyalty_tiers_store_min_points_idx" ON "loyalty_tiers" ("store_id","min_points");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "loyalty_tiers_store_name_unique" ON "loyalty_tiers" ("store_id","name");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "loyalty_wallets_store_user_unique" ON "loyalty_wallets" ("store_id","user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "loyalty_wallets_store_tier_idx" ON "loyalty_wallets" ("store_id","current_tier_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "loyalty_transactions_wallet_created_idx" ON "loyalty_transactions" ("wallet_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "loyalty_transactions_user_created_idx" ON "loyalty_transactions" ("user_id","created_at");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "loyalty_transactions_wallet_order_type_unique" ON "loyalty_transactions" ("wallet_id","source_order_id","type");
