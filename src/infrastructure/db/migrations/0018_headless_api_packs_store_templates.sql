CREATE TABLE IF NOT EXISTS headless_api_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id),
  name text NOT NULL,
  description text,
  key_hash text NOT NULL,
  key_prefix text NOT NULL,
  scopes jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'active',
  rate_limit_per_minute integer NOT NULL DEFAULT 120,
  last_used_at timestamp,
  created_by uuid REFERENCES users(id),
  revoked_by uuid REFERENCES users(id),
  revoked_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS headless_api_packs_key_hash_unique
  ON headless_api_packs(key_hash);

CREATE INDEX IF NOT EXISTS headless_api_packs_store_status_idx
  ON headless_api_packs(store_id, status, updated_at);

CREATE INDEX IF NOT EXISTS headless_api_packs_store_created_idx
  ON headless_api_packs(store_id, created_at);

CREATE TABLE IF NOT EXISTS store_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id),
  source_store_id uuid NOT NULL REFERENCES stores(id),
  name text NOT NULL,
  description text,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES users(id),
  updated_by uuid REFERENCES users(id),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS store_templates_store_updated_idx
  ON store_templates(store_id, updated_at);

CREATE INDEX IF NOT EXISTS store_templates_source_store_updated_idx
  ON store_templates(source_store_id, updated_at);

CREATE INDEX IF NOT EXISTS store_templates_store_name_idx
  ON store_templates(store_id, name);
