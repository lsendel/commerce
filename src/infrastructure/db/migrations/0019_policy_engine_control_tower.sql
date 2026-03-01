CREATE TABLE IF NOT EXISTS store_policy_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id),
  version integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  policies jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid REFERENCES users(id),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS store_policy_configs_store_unique
  ON store_policy_configs(store_id);

CREATE INDEX IF NOT EXISTS store_policy_configs_store_active_idx
  ON store_policy_configs(store_id, is_active);

CREATE TABLE IF NOT EXISTS policy_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id),
  domain text NOT NULL,
  action text NOT NULL,
  severity text NOT NULL DEFAULT 'error',
  message text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_user_id uuid REFERENCES users(id),
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS policy_violations_store_created_idx
  ON policy_violations(store_id, created_at);

CREATE INDEX IF NOT EXISTS policy_violations_store_domain_created_idx
  ON policy_violations(store_id, domain, created_at);
