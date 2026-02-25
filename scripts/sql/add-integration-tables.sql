-- Migration: Add integration management tables
-- Run against Neon database

-- Enums
DO $$ BEGIN
  CREATE TYPE integration_provider AS ENUM (
    'stripe', 'printful', 'gemini', 'resend',
    'gooten', 'prodigi', 'shapeways'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE integration_status AS ENUM (
    'connected', 'disconnected', 'error', 'pending_verification'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tables
CREATE TABLE IF NOT EXISTS platform_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id),
  provider integration_provider NOT NULL,
  enabled BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  status integration_status DEFAULT 'disconnected',
  status_message TEXT,
  last_verified_at TIMESTAMP,
  last_sync_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS platform_integrations_store_provider_idx
  ON platform_integrations (store_id, provider);

CREATE TABLE IF NOT EXISTS integration_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES platform_integrations(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  encrypted_value TEXT NOT NULL,
  iv TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS integration_secrets_integration_key_idx
  ON integration_secrets (integration_id, key);
