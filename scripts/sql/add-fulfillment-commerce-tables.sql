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
