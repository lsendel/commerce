CREATE TABLE IF NOT EXISTS "exchange_rates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "base_currency" text NOT NULL,
  "target_currency" text NOT NULL,
  "rate" numeric(12, 6) NOT NULL,
  "source" text DEFAULT 'exchangerate_api',
  "fetched_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now()
);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "exchange_rates_pair_idx" ON "exchange_rates" ("base_currency", "target_currency");--> statement-breakpoint
