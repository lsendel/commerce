-- Commerce Features Tables Migration
-- Adds promotions, shipping, tax, inventory, analytics, currency, digital downloads
-- and extends existing orders, product_variants, product_reviews tables.

-- ─── Step 1: New Enums ──────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE promotion_type AS ENUM ('coupon', 'automatic', 'flash_sale');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE promotion_status AS ENUM ('active', 'scheduled', 'expired', 'disabled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE promotion_strategy AS ENUM (
    'percentage_off', 'fixed_amount_off', 'buy_x_get_y',
    'free_shipping', 'tiered_percentage', 'tiered_fixed', 'bundle_price'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE eligibility_type AS ENUM ('all', 'specific_products', 'specific_collections');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE shipping_rate_type AS ENUM ('flat', 'weight_based', 'price_based', 'carrier_calculated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE carrier AS ENUM ('usps', 'fedex', 'ups');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE tax_type AS ENUM ('sales_tax', 'vat', 'gst');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE tax_applies_to AS ENUM ('all', 'physical', 'digital', 'shipping');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE reservation_status AS ENUM ('held', 'committed', 'released', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE review_status AS ENUM ('pending', 'approved', 'rejected', 'flagged');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Extend integration_provider enum with new providers
ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'taxjar';
ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'avalara';
ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'usps';
ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'fedex';
ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'ups';
ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'exchangerate_api';
ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'segment';
ALTER TYPE integration_provider ADD VALUE IF NOT EXISTS 'mixpanel';

-- ─── Step 2: Columns on existing tables ──────────────────────────────────────

-- Orders: discount, coupon, currency
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(12, 6);

-- Product variants: weight, reserved quantity
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS weight NUMERIC(10, 2);
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS weight_unit TEXT DEFAULT 'oz';
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS reserved_quantity INTEGER DEFAULT 0;

-- Product reviews: moderation fields
ALTER TABLE product_reviews ADD COLUMN IF NOT EXISTS status review_status DEFAULT 'approved';
ALTER TABLE product_reviews ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMP;
ALTER TABLE product_reviews ADD COLUMN IF NOT EXISTS helpful_count INTEGER DEFAULT 0;
ALTER TABLE product_reviews ADD COLUMN IF NOT EXISTS reported_count INTEGER DEFAULT 0;

-- ─── Step 3: Promotions tables ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  name TEXT NOT NULL,
  description TEXT,
  type promotion_type NOT NULL,
  status promotion_status DEFAULT 'active',
  priority INTEGER DEFAULT 0,
  strategy_type promotion_strategy NOT NULL,
  strategy_config JSONB DEFAULT '{}',
  conditions JSONB DEFAULT '{}',
  starts_at TIMESTAMP,
  ends_at TIMESTAMP,
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  minimum_purchase NUMERIC(10, 2),
  stackable BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coupon_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES promotions(id),
  code TEXT NOT NULL,
  max_redemptions INTEGER,
  redemption_count INTEGER DEFAULT 0,
  single_use_per_customer BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS promotion_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES promotions(id),
  coupon_code_id UUID REFERENCES coupon_codes(id),
  order_id UUID NOT NULL REFERENCES orders(id),
  customer_id UUID NOT NULL REFERENCES users(id),
  discount_amount NUMERIC(10, 2) NOT NULL,
  line_items_affected JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  name TEXT NOT NULL,
  description TEXT,
  rules JSONB DEFAULT '{}',
  member_count INTEGER DEFAULT 0,
  last_refreshed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_segment_memberships (
  customer_id UUID NOT NULL REFERENCES users(id),
  segment_id UUID NOT NULL REFERENCES customer_segments(id),
  added_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (customer_id, segment_id)
);

CREATE TABLE IF NOT EXISTS promotion_product_eligibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES promotions(id),
  product_id UUID REFERENCES products(id),
  collection_id UUID REFERENCES collections(id),
  type eligibility_type NOT NULL
);

-- ─── Step 4: Shipping tables ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS shipping_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  name TEXT NOT NULL,
  countries JSONB DEFAULT '[]',
  regions JSONB DEFAULT '[]',
  postal_code_ranges JSONB DEFAULT '[]',
  is_rest_of_world BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shipping_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES shipping_zones(id),
  name TEXT NOT NULL,
  type shipping_rate_type NOT NULL,
  price NUMERIC(10, 2) DEFAULT 0,
  min_weight NUMERIC(10, 2),
  max_weight NUMERIC(10, 2),
  min_order_total NUMERIC(10, 2),
  max_order_total NUMERIC(10, 2),
  carrier_provider TEXT,
  estimated_days_min INTEGER,
  estimated_days_max INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS carrier_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  carrier carrier NOT NULL,
  integration_id UUID REFERENCES platform_integrations(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ─── Step 5: Tax tables ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tax_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  name TEXT NOT NULL,
  countries JSONB DEFAULT '[]',
  regions JSONB DEFAULT '[]',
  postal_codes JSONB DEFAULT '[]',
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tax_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tax_zone_id UUID NOT NULL REFERENCES tax_zones(id),
  name TEXT NOT NULL,
  rate NUMERIC(5, 4) NOT NULL,
  type tax_type NOT NULL,
  applies_to tax_applies_to DEFAULT 'all',
  compound BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ─── Step 6: Inventory reservations ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS inventory_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL REFERENCES product_variants(id),
  cart_item_id UUID NOT NULL REFERENCES cart_items(id),
  quantity INTEGER NOT NULL,
  status reservation_status DEFAULT 'held',
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS inventory_reservations_variant_status_idx
  ON inventory_reservations(variant_id, status);
CREATE INDEX IF NOT EXISTS inventory_reservations_expires_at_idx
  ON inventory_reservations(expires_at);

-- ─── Step 7: Analytics tables ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  session_id TEXT,
  user_id UUID REFERENCES users(id),
  event_type TEXT NOT NULL,
  properties JSONB DEFAULT '{}',
  page_url TEXT,
  referrer TEXT,
  user_agent TEXT,
  ip_hash TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS analytics_events_store_type_idx
  ON analytics_events(store_id, event_type, created_at);

CREATE TABLE IF NOT EXISTS analytics_daily_rollups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  date TEXT NOT NULL,
  metric TEXT NOT NULL,
  dimensions JSONB DEFAULT '{}',
  value NUMERIC(12, 2) DEFAULT 0,
  count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS analytics_rollups_store_date_metric_idx
  ON analytics_daily_rollups(store_id, date, metric);

-- ─── Step 8: Currency tables ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency TEXT NOT NULL,
  target_currency TEXT NOT NULL,
  rate NUMERIC(12, 6) NOT NULL,
  source TEXT DEFAULT 'exchangerate_api',
  fetched_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS exchange_rates_pair_idx
  ON exchange_rates(base_currency, target_currency);

CREATE TABLE IF NOT EXISTS store_currencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL UNIQUE REFERENCES stores(id),
  base_currency TEXT NOT NULL DEFAULT 'USD',
  enabled_currencies JSONB DEFAULT '[]',
  display_format TEXT DEFAULT 'symbol_first',
  auto_detect_locale BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ─── Step 9: Digital assets table ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS digital_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  storage_key TEXT NOT NULL,
  content_type TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
