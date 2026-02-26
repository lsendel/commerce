BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  CREATE TYPE public.store_status AS ENUM ('trial', 'active', 'suspended', 'deactivated');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.store_member_role AS ENUM ('owner', 'admin', 'staff');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.platform_role AS ENUM ('super_admin', 'group_admin', 'user');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.domain_verification_status AS ENUM ('pending', 'verified', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.affiliate_status AS ENUM ('pending', 'approved', 'suspended');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.conversion_status AS ENUM ('pending', 'approved', 'paid', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.attribution_method AS ENUM ('link', 'coupon', 'tier');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.payout_status AS ENUM ('pending', 'processing', 'completed', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.fulfillment_provider_type AS ENUM ('printful', 'gooten', 'prodigi', 'shapeways');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.store_billing_status AS ENUM ('active', 'past_due', 'cancelled', 'trialing');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.platform_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  monthly_price numeric(10, 2) NOT NULL DEFAULT '0',
  transaction_fee_percent numeric(5, 2) NOT NULL DEFAULT '5',
  max_products integer,
  max_staff integer,
  features jsonb DEFAULT '{}'::jsonb,
  stripe_price_id text,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  subdomain text UNIQUE,
  custom_domain text,
  logo text,
  primary_color text,
  secondary_color text,
  status public.store_status DEFAULT 'trial',
  plan_id uuid REFERENCES public.platform_plans(id),
  stripe_connect_account_id text,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stores_subdomain_idx ON public.stores(subdomain);
CREATE INDEX IF NOT EXISTS stores_custom_domain_idx ON public.stores(custom_domain);

CREATE TABLE IF NOT EXISTS public.store_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id),
  domain text NOT NULL,
  verification_status public.domain_verification_status DEFAULT 'pending',
  verification_token text,
  is_primary boolean DEFAULT false,
  created_at timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS store_domains_domain_idx ON public.store_domains(domain);

CREATE TABLE IF NOT EXISTS public.store_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id),
  user_id uuid NOT NULL REFERENCES public.users(id),
  role public.store_member_role NOT NULL DEFAULT 'staff',
  created_at timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS store_members_store_user_idx
  ON public.store_members(store_id, user_id);

CREATE TABLE IF NOT EXISTS public.store_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id),
  key text NOT NULL,
  value text
);

CREATE UNIQUE INDEX IF NOT EXISTS store_settings_store_key_idx
  ON public.store_settings(store_id, key);

CREATE TABLE IF NOT EXISTS public.store_billing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id),
  platform_plan_id uuid NOT NULL REFERENCES public.platform_plans(id),
  stripe_subscription_id text UNIQUE,
  stripe_customer_id text,
  status public.store_billing_status DEFAULT 'trialing',
  current_period_start timestamp,
  current_period_end timestamp,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.platform_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id),
  order_id uuid NOT NULL REFERENCES public.orders(id),
  order_total numeric(10, 2) NOT NULL,
  platform_fee_percent numeric(5, 2) NOT NULL,
  platform_fee_amount numeric(10, 2) NOT NULL,
  stripe_transfer_id text,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fulfillment_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id),
  name text NOT NULL,
  type public.fulfillment_provider_type NOT NULL,
  api_key text,
  api_secret text,
  is_active boolean DEFAULT true,
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fulfillment_providers_store_type_idx
  ON public.fulfillment_providers(store_id, type);

CREATE TABLE IF NOT EXISTS public.provider_product_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid NOT NULL REFERENCES public.product_variants(id),
  provider_id uuid NOT NULL REFERENCES public.fulfillment_providers(id),
  external_product_id text,
  external_variant_id text,
  cost_price numeric(10, 2),
  created_at timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS provider_product_mappings_variant_provider_idx
  ON public.provider_product_mappings(variant_id, provider_id);

CREATE TABLE IF NOT EXISTS public.affiliate_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id),
  name text NOT NULL,
  level integer NOT NULL,
  commission_rate numeric(5, 2) NOT NULL,
  bonus_rate numeric(5, 2) DEFAULT '0' NOT NULL,
  min_sales integer DEFAULT 0,
  min_revenue numeric(10, 2) DEFAULT '0',
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id),
  store_id uuid NOT NULL REFERENCES public.stores(id),
  status public.affiliate_status DEFAULT 'pending',
  referral_code text NOT NULL UNIQUE,
  custom_slug text,
  commission_rate numeric(5, 2) NOT NULL,
  parent_affiliate_id uuid REFERENCES public.affiliates(id),
  tier_id uuid REFERENCES public.affiliate_tiers(id),
  total_earnings numeric(10, 2) DEFAULT '0' NOT NULL,
  total_clicks integer DEFAULT 0 NOT NULL,
  total_conversions integer DEFAULT 0 NOT NULL,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS affiliates_store_user_idx
  ON public.affiliates(store_id, user_id);
CREATE INDEX IF NOT EXISTS affiliates_referral_code_idx
  ON public.affiliates(referral_code);

CREATE TABLE IF NOT EXISTS public.affiliate_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id),
  target_url text NOT NULL,
  short_code text NOT NULL UNIQUE,
  click_count integer NOT NULL DEFAULT 0,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.affiliate_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id uuid NOT NULL REFERENCES public.affiliate_links(id),
  ip text,
  user_agent text,
  referrer text,
  created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS affiliate_clicks_link_created_idx
  ON public.affiliate_clicks(link_id, created_at);

CREATE TABLE IF NOT EXISTS public.affiliate_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id),
  order_id uuid NOT NULL REFERENCES public.orders(id),
  order_total numeric(10, 2) NOT NULL,
  commission_amount numeric(10, 2) NOT NULL,
  status public.conversion_status DEFAULT 'pending',
  attribution_method public.attribution_method NOT NULL,
  click_id uuid REFERENCES public.affiliate_clicks(id),
  coupon_code text,
  parent_conversion_id uuid REFERENCES public.affiliate_conversions(id),
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.affiliate_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id),
  amount numeric(10, 2) NOT NULL,
  stripe_transfer_id text,
  status public.payout_status DEFAULT 'pending',
  period_start timestamp NOT NULL,
  period_end timestamp NOT NULL,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id),
  name text NOT NULL,
  slug text NOT NULL,
  address text NOT NULL,
  city text NOT NULL,
  state text,
  country text NOT NULL,
  postal_code text NOT NULL,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  amenities jsonb DEFAULT '[]'::jsonb,
  photos jsonb DEFAULT '[]'::jsonb,
  capacity integer,
  description text,
  contact_email text,
  contact_phone text,
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS venues_store_slug_idx
  ON public.venues(store_id, slug);
CREATE INDEX IF NOT EXISTS venues_city_idx
  ON public.venues(city);

CREATE TABLE IF NOT EXISTS public.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id),
  product_id uuid NOT NULL REFERENCES public.products(id),
  user_id uuid NOT NULL REFERENCES public.users(id),
  rating integer NOT NULL,
  title text,
  content text,
  is_verified_purchase boolean DEFAULT false,
  created_at timestamp DEFAULT now()
);

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS platform_role public.platform_role DEFAULT 'user';

ALTER TABLE public.booking_config
  ADD COLUMN IF NOT EXISTS venue_id uuid;

ALTER TABLE public.art_templates ADD COLUMN IF NOT EXISTS store_id uuid;
ALTER TABLE public.booking_availability ADD COLUMN IF NOT EXISTS store_id uuid;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS store_id uuid;
ALTER TABLE public.carts ADD COLUMN IF NOT EXISTS store_id uuid;
ALTER TABLE public.collections ADD COLUMN IF NOT EXISTS store_id uuid;
ALTER TABLE public.generation_jobs ADD COLUMN IF NOT EXISTS store_id uuid;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS store_id uuid;
ALTER TABLE public.pet_profiles ADD COLUMN IF NOT EXISTS store_id uuid;
ALTER TABLE public.printful_sync_products ADD COLUMN IF NOT EXISTS store_id uuid;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS store_id uuid;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS store_id uuid;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS store_id uuid;

INSERT INTO public.stores (
  id, name, slug, subdomain, status, created_at, updated_at
)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'petm8',
  'petm8',
  'petm8',
  'active',
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

UPDATE public.art_templates SET store_id = '00000000-0000-4000-8000-000000000001' WHERE store_id IS NULL;
UPDATE public.booking_availability SET store_id = '00000000-0000-4000-8000-000000000001' WHERE store_id IS NULL;
UPDATE public.bookings SET store_id = '00000000-0000-4000-8000-000000000001' WHERE store_id IS NULL;
UPDATE public.carts SET store_id = '00000000-0000-4000-8000-000000000001' WHERE store_id IS NULL;
UPDATE public.collections SET store_id = '00000000-0000-4000-8000-000000000001' WHERE store_id IS NULL;
UPDATE public.generation_jobs SET store_id = '00000000-0000-4000-8000-000000000001' WHERE store_id IS NULL;
UPDATE public.orders SET store_id = '00000000-0000-4000-8000-000000000001' WHERE store_id IS NULL;
UPDATE public.pet_profiles SET store_id = '00000000-0000-4000-8000-000000000001' WHERE store_id IS NULL;
UPDATE public.printful_sync_products SET store_id = '00000000-0000-4000-8000-000000000001' WHERE store_id IS NULL;
UPDATE public.products SET store_id = '00000000-0000-4000-8000-000000000001' WHERE store_id IS NULL;
UPDATE public.shipments SET store_id = '00000000-0000-4000-8000-000000000001' WHERE store_id IS NULL;
UPDATE public.subscriptions SET store_id = '00000000-0000-4000-8000-000000000001' WHERE store_id IS NULL;

ALTER TABLE public.art_templates ALTER COLUMN store_id SET NOT NULL;
ALTER TABLE public.booking_availability ALTER COLUMN store_id SET NOT NULL;
ALTER TABLE public.bookings ALTER COLUMN store_id SET NOT NULL;
ALTER TABLE public.carts ALTER COLUMN store_id SET NOT NULL;
ALTER TABLE public.collections ALTER COLUMN store_id SET NOT NULL;
ALTER TABLE public.generation_jobs ALTER COLUMN store_id SET NOT NULL;
ALTER TABLE public.orders ALTER COLUMN store_id SET NOT NULL;
ALTER TABLE public.pet_profiles ALTER COLUMN store_id SET NOT NULL;
ALTER TABLE public.printful_sync_products ALTER COLUMN store_id SET NOT NULL;
ALTER TABLE public.products ALTER COLUMN store_id SET NOT NULL;
ALTER TABLE public.shipments ALTER COLUMN store_id SET NOT NULL;
ALTER TABLE public.subscriptions ALTER COLUMN store_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'art_templates_store_id_stores_id_fk') THEN
    ALTER TABLE public.art_templates
      ADD CONSTRAINT art_templates_store_id_stores_id_fk
      FOREIGN KEY (store_id) REFERENCES public.stores(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'booking_availability_store_id_stores_id_fk') THEN
    ALTER TABLE public.booking_availability
      ADD CONSTRAINT booking_availability_store_id_stores_id_fk
      FOREIGN KEY (store_id) REFERENCES public.stores(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_store_id_stores_id_fk') THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_store_id_stores_id_fk
      FOREIGN KEY (store_id) REFERENCES public.stores(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'carts_store_id_stores_id_fk') THEN
    ALTER TABLE public.carts
      ADD CONSTRAINT carts_store_id_stores_id_fk
      FOREIGN KEY (store_id) REFERENCES public.stores(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'collections_store_id_stores_id_fk') THEN
    ALTER TABLE public.collections
      ADD CONSTRAINT collections_store_id_stores_id_fk
      FOREIGN KEY (store_id) REFERENCES public.stores(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'generation_jobs_store_id_stores_id_fk') THEN
    ALTER TABLE public.generation_jobs
      ADD CONSTRAINT generation_jobs_store_id_stores_id_fk
      FOREIGN KEY (store_id) REFERENCES public.stores(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_store_id_stores_id_fk') THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_store_id_stores_id_fk
      FOREIGN KEY (store_id) REFERENCES public.stores(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pet_profiles_store_id_stores_id_fk') THEN
    ALTER TABLE public.pet_profiles
      ADD CONSTRAINT pet_profiles_store_id_stores_id_fk
      FOREIGN KEY (store_id) REFERENCES public.stores(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'printful_sync_products_store_id_stores_id_fk') THEN
    ALTER TABLE public.printful_sync_products
      ADD CONSTRAINT printful_sync_products_store_id_stores_id_fk
      FOREIGN KEY (store_id) REFERENCES public.stores(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_store_id_stores_id_fk') THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_store_id_stores_id_fk
      FOREIGN KEY (store_id) REFERENCES public.stores(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shipments_store_id_stores_id_fk') THEN
    ALTER TABLE public.shipments
      ADD CONSTRAINT shipments_store_id_stores_id_fk
      FOREIGN KEY (store_id) REFERENCES public.stores(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_store_id_stores_id_fk') THEN
    ALTER TABLE public.subscriptions
      ADD CONSTRAINT subscriptions_store_id_stores_id_fk
      FOREIGN KEY (store_id) REFERENCES public.stores(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'booking_config_venue_id_venues_id_fk') THEN
    ALTER TABLE public.booking_config
      ADD CONSTRAINT booking_config_venue_id_venues_id_fk
      FOREIGN KEY (venue_id) REFERENCES public.venues(id);
  END IF;
END $$;

COMMIT;
