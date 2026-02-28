DO $$
BEGIN
  CREATE TYPE "public"."reservation_status" AS ENUM ('held', 'released', 'converted');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'review_status'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'review_status' AND e.enumlabel = 'flagged'
  ) THEN
    ALTER TYPE "public"."review_status" ADD VALUE 'flagged';
  END IF;
END
$$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inventory_reservations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "variant_id" uuid NOT NULL,
  "cart_item_id" uuid NOT NULL,
  "quantity" integer NOT NULL,
  "status" "reservation_status" DEFAULT 'held',
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now()
);--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'inventory_reservations_variant_id_product_variants_id_fk'
  ) THEN
    ALTER TABLE "inventory_reservations"
      ADD CONSTRAINT "inventory_reservations_variant_id_product_variants_id_fk"
      FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END
$$;--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'inventory_reservations_cart_item_id_cart_items_id_fk'
  ) THEN
    ALTER TABLE "inventory_reservations"
      ADD CONSTRAINT "inventory_reservations_cart_item_id_cart_items_id_fk"
      FOREIGN KEY ("cart_item_id") REFERENCES "public"."cart_items"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END
$$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_reservations_variant_status_idx" ON "inventory_reservations" ("variant_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inventory_reservations_expires_at_idx" ON "inventory_reservations" ("expires_at");
