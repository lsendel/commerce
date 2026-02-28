ALTER TABLE "carts" ADD COLUMN IF NOT EXISTS "coupon_code_id" uuid;--> statement-breakpoint
DO $$
BEGIN
  IF to_regclass('public.coupon_codes') IS NOT NULL
     AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'carts_coupon_code_id_coupon_codes_id_fk'
  ) THEN
    ALTER TABLE "carts"
      ADD CONSTRAINT "carts_coupon_code_id_coupon_codes_id_fk"
      FOREIGN KEY ("coupon_code_id") REFERENCES "public"."coupon_codes"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END
$$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "analytics_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "store_id" uuid NOT NULL,
  "session_id" text,
  "user_id" uuid,
  "event_type" text NOT NULL,
  "properties" jsonb DEFAULT '{}'::jsonb,
  "page_url" text,
  "referrer" text,
  "user_agent" text,
  "ip_hash" text,
  "created_at" timestamp DEFAULT now()
);--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'analytics_events_store_id_stores_id_fk'
  ) THEN
    ALTER TABLE "analytics_events"
      ADD CONSTRAINT "analytics_events_store_id_stores_id_fk"
      FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END
$$;--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'analytics_events_user_id_users_id_fk'
  ) THEN
    ALTER TABLE "analytics_events"
      ADD CONSTRAINT "analytics_events_user_id_users_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END
$$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analytics_events_store_type_idx" ON "analytics_events" ("store_id","event_type","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analytics_events_store_created_idx" ON "analytics_events" ("store_id","created_at");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "analytics_daily_rollups" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "store_id" uuid NOT NULL,
  "date" text NOT NULL,
  "metric" text NOT NULL,
  "dimensions" jsonb DEFAULT '{}'::jsonb,
  "value" numeric(12, 2) DEFAULT '0',
  "count" integer DEFAULT 0,
  "created_at" timestamp DEFAULT now()
);--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'analytics_daily_rollups_store_id_stores_id_fk'
  ) THEN
    ALTER TABLE "analytics_daily_rollups"
      ADD CONSTRAINT "analytics_daily_rollups_store_id_stores_id_fk"
      FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END
$$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analytics_rollups_store_date_metric_idx" ON "analytics_daily_rollups" ("store_id","date","metric");--> statement-breakpoint
DO $$
BEGIN
  CREATE TYPE "public"."funnel_step" AS ENUM ('page_view', 'product_view', 'add_to_cart', 'checkout_started', 'order_completed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "analytics_funnels" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "store_id" uuid NOT NULL,
  "session_id" text NOT NULL,
  "step" "funnel_step" NOT NULL,
  "product_id" uuid,
  "created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'analytics_funnels_store_id_stores_id_fk'
  ) THEN
    ALTER TABLE "analytics_funnels"
      ADD CONSTRAINT "analytics_funnels_store_id_stores_id_fk"
      FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END
$$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "funnels_store_step_idx" ON "analytics_funnels" ("store_id","step","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "funnels_session_idx" ON "analytics_funnels" ("session_id");
