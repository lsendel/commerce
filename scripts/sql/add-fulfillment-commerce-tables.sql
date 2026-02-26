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
