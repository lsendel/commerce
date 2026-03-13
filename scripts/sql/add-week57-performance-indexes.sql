-- Week 57: Query performance tuning wave 1
-- Focus: hot-path lookup predicates, admin list timelines, and segment/promotion analytics.

CREATE INDEX IF NOT EXISTS carts_store_session_idx
  ON carts(store_id, session_id);

CREATE INDEX IF NOT EXISTS carts_store_user_idx
  ON carts(store_id, user_id, updated_at);

CREATE INDEX IF NOT EXISTS orders_store_user_created_idx
  ON orders(store_id, user_id, created_at);

CREATE INDEX IF NOT EXISTS orders_store_status_created_idx
  ON orders(store_id, status, created_at);

CREATE INDEX IF NOT EXISTS promotions_store_status_window_priority_idx
  ON promotions(store_id, status, starts_at, ends_at, priority);

CREATE INDEX IF NOT EXISTS redemptions_promotion_customer_idx
  ON promotion_redemptions(promotion_id, customer_id);

CREATE INDEX IF NOT EXISTS customer_segments_store_created_idx
  ON customer_segments(store_id, created_at);

CREATE INDEX IF NOT EXISTS segment_memberships_segment_customer_idx
  ON customer_segment_memberships(segment_id, customer_id);
