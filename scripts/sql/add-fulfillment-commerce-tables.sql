-- Fulfillment Commerce Tables Migration
-- Add art/digital/fulfillment columns to existing tables + new tables

-- Step 1: Add artJobId to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS art_job_id UUID REFERENCES generation_jobs(id);

-- Step 2: Add digital/fulfillment columns to product_variants
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS digital_asset_key TEXT;
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS fulfillment_provider TEXT;
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS estimated_production_days INTEGER;

-- Step 3: Create design_placements table
CREATE TABLE IF NOT EXISTS design_placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  area TEXT NOT NULL,
  image_url TEXT NOT NULL,
  x INTEGER DEFAULT 0,
  y INTEGER DEFAULT 0,
  scale NUMERIC(5, 3) DEFAULT 1.000,
  rotation INTEGER DEFAULT 0,
  print_area_id TEXT,
  provider_meta JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Step 4: Create fulfillment_request_status enum
DO $$ BEGIN
  CREATE TYPE fulfillment_request_status AS ENUM (
    'pending', 'submitted', 'processing', 'shipped', 'delivered',
    'cancel_requested', 'cancelled', 'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Step 5: Create fulfillment_requests table
CREATE TABLE IF NOT EXISTS fulfillment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  order_id UUID NOT NULL REFERENCES orders(id),
  provider TEXT NOT NULL,
  provider_id UUID REFERENCES fulfillment_providers(id),
  external_id TEXT,
  status fulfillment_request_status DEFAULT 'pending',
  items_snapshot JSONB,
  cost_estimated_total NUMERIC(10, 2),
  cost_actual_total NUMERIC(10, 2),
  cost_shipping NUMERIC(10, 2),
  cost_tax NUMERIC(10, 2),
  currency TEXT DEFAULT 'USD',
  refund_stripe_id TEXT,
  refund_amount NUMERIC(10, 2),
  refund_status TEXT,
  error_message TEXT,
  submitted_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS fulfillment_requests_order_idx ON fulfillment_requests(order_id);
CREATE INDEX IF NOT EXISTS fulfillment_requests_provider_external_idx ON fulfillment_requests(provider, external_id);

-- Step 6: Create fulfillment_request_items table
CREATE TABLE IF NOT EXISTS fulfillment_request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fulfillment_request_id UUID NOT NULL REFERENCES fulfillment_requests(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES order_items(id),
  provider_line_id TEXT,
  quantity INTEGER NOT NULL,
  status TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Step 7: Create provider_events table
CREATE TABLE IF NOT EXISTS provider_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  provider TEXT NOT NULL,
  external_event_id TEXT,
  external_order_id TEXT,
  event_type TEXT NOT NULL,
  payload JSONB,
  received_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,
  error_message TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS provider_events_provider_event_idx
  ON provider_events(provider, external_event_id) WHERE external_event_id IS NOT NULL;

-- Step 8: Modify shipments — add fulfillment_request_id and raw columns
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS fulfillment_request_id UUID REFERENCES fulfillment_requests(id);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS raw JSONB;

-- Step 9: Modify orders — add cancel_reason and cancelled_at
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;

-- Step 10: Create download_tokens table
CREATE TABLE IF NOT EXISTS download_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  user_id UUID NOT NULL REFERENCES users(id),
  order_id UUID NOT NULL REFERENCES orders(id),
  order_item_id UUID REFERENCES order_items(id),
  token TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  downloaded_at TIMESTAMP,
  revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS download_tokens_token_idx ON download_tokens(token);

-- Product status enum + column
DO $$ BEGIN
  CREATE TYPE product_status AS ENUM ('draft', 'active', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE products ADD COLUMN IF NOT EXISTS status product_status NOT NULL DEFAULT 'active';

-- Inventory transaction type enum
DO $$ BEGIN
  CREATE TYPE inventory_transaction_type AS ENUM ('adjustment', 'sale', 'return', 'restock', 'reservation', 'release');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Inventory transactions table
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  variant_id UUID NOT NULL REFERENCES product_variants(id),
  type inventory_transaction_type NOT NULL,
  quantity INTEGER NOT NULL,
  reference TEXT,
  note TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS inventory_transactions_variant_idx ON inventory_transactions(variant_id, created_at);

-- Missing catalog indexes
CREATE INDEX IF NOT EXISTS products_store_status_idx ON products(store_id, status);
CREATE INDEX IF NOT EXISTS product_variants_product_idx ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS product_images_product_idx ON product_images(product_id);

-- Fix fulfillment_provider column type (text -> enum)
ALTER TABLE product_variants
  ALTER COLUMN fulfillment_provider TYPE fulfillment_provider_type
  USING fulfillment_provider::fulfillment_provider_type;

-- ─── Checkout schema uplift ─────────────────────────────────────────────────

-- Add notes columns to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS internal_notes TEXT;

-- Add coupon_code_id to carts
ALTER TABLE carts ADD COLUMN IF NOT EXISTS coupon_code_id UUID REFERENCES coupon_codes(id);

-- Add currency to order_items
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';

-- Order indexes
CREATE INDEX IF NOT EXISTS orders_user_idx ON orders(user_id);
CREATE INDEX IF NOT EXISTS orders_store_status_idx ON orders(store_id, status);
CREATE INDEX IF NOT EXISTS orders_stripe_session_idx ON orders(stripe_checkout_session_id);
CREATE INDEX IF NOT EXISTS orders_stripe_payment_idx ON orders(stripe_payment_intent_id);

-- Order items index
CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items(order_id);

-- Cart items index
CREATE INDEX IF NOT EXISTS cart_items_cart_id_idx ON cart_items(cart_id);

-- Refund status enum
DO $$ BEGIN
  CREATE TYPE refund_status AS ENUM ('pending', 'processing', 'succeeded', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Refunds table
CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  order_id UUID NOT NULL REFERENCES orders(id),
  fulfillment_request_id UUID REFERENCES fulfillment_requests(id),
  stripe_refund_id TEXT,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  reason TEXT,
  status refund_status NOT NULL DEFAULT 'pending',
  line_items JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  processed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS refunds_order_idx ON refunds(order_id);
CREATE INDEX IF NOT EXISTS refunds_store_idx ON refunds(store_id);

-- Order note type enum
DO $$ BEGIN
  CREATE TYPE order_note_type AS ENUM ('customer', 'internal', 'system');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Order notes table
CREATE TABLE IF NOT EXISTS order_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id UUID,
  type order_note_type NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS order_notes_order_idx ON order_notes(order_id);
