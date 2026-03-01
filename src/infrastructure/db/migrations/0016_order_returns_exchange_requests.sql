DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'return_request_type') THEN
    CREATE TYPE return_request_type AS ENUM ('refund', 'exchange');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'return_request_status') THEN
    CREATE TYPE return_request_status AS ENUM ('submitted', 'approved', 'rejected', 'completed', 'cancelled');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS order_return_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id),
  order_id uuid NOT NULL REFERENCES orders(id),
  user_id uuid NOT NULL REFERENCES users(id),
  type return_request_type NOT NULL,
  status return_request_status NOT NULL DEFAULT 'submitted',
  reason text,
  requested_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  exchange_items jsonb DEFAULT '[]'::jsonb,
  refund_amount numeric(10, 2) NOT NULL DEFAULT 0,
  credit_amount numeric(10, 2) NOT NULL DEFAULT 0,
  instant_exchange boolean NOT NULL DEFAULT false,
  metadata jsonb,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  processed_at timestamp
);

CREATE INDEX IF NOT EXISTS order_return_requests_store_idx ON order_return_requests(store_id);
CREATE INDEX IF NOT EXISTS order_return_requests_order_idx ON order_return_requests(order_id);
CREATE INDEX IF NOT EXISTS order_return_requests_user_idx ON order_return_requests(user_id);
