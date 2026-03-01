ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS mix_configuration jsonb;
