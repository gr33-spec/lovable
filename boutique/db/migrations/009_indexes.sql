-- Index sur les liens des tables qui grossissent avec le temps (mouvements de
-- stock, redirections, journal) : suppressions et recherches rapides à long terme.
CREATE INDEX IF NOT EXISTS stock_movement_order_idx ON stock_movement (order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS stock_movement_reservation_idx ON stock_movement (reservation_id) WHERE reservation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS category_redirect_category_idx ON category_redirect (category_id);
CREATE INDEX IF NOT EXISTS product_slug_redirect_product_idx ON product_slug_redirect (product_id);
CREATE INDEX IF NOT EXISTS payment_event_order_idx ON payment_event (order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS audit_log_admin_idx ON audit_log (admin_id) WHERE admin_id IS NOT NULL;
