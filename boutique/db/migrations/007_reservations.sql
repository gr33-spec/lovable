-- Réservations sans paiement en ligne : la cliente réserve un bijou, la
-- créatrice la contacte puis confirme ou annule. La pièce est retirée du
-- stock dès la demande (même verrou que pour une commande) : deux clientes
-- ne peuvent jamais réserver la même pièce.
--
-- Statuts : pending (en attente de confirmation) → confirmed ;
-- cancelled (annulée par la créatrice) ; expired (non confirmée à temps).
-- Pour cancelled et expired, la pièce est remise en stock.
CREATE TABLE reservation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL UNIQUE CHECK (number ~ '^R-[0-9A-Z]{6}$'),
  idempotency_key uuid NOT NULL UNIQUE,
  product_id uuid NOT NULL REFERENCES product(id) ON DELETE RESTRICT,
  -- Copie figée du bijou au moment de la demande.
  product_name text NOT NULL,
  product_sku text,
  product_slug text NOT NULL,
  image_id uuid,
  price_cents integer NOT NULL CHECK (price_cents > 0),
  first_name text NOT NULL CHECK (length(btrim(first_name)) BETWEEN 1 AND 80),
  phone text NOT NULL CHECK (length(phone) BETWEEN 6 AND 30),
  email text CHECK (email IS NULL OR length(email) <= 254),
  delivery text NOT NULL CHECK (delivery IN ('hand', 'post')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'expired')),
  expires_at timestamptz NOT NULL,
  confirmed_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER reservation_touch BEFORE UPDATE ON reservation FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE INDEX reservation_status_idx ON reservation (status, created_at DESC);
CREATE INDEX reservation_product_pending_idx ON reservation (product_id) WHERE status = 'pending';
ALTER TABLE reservation ENABLE ROW LEVEL SECURITY;

-- Mouvements de stock liés à une réservation.
ALTER TABLE stock_movement ADD COLUMN reservation_id uuid REFERENCES reservation(id) ON DELETE SET NULL;

-- E-mails : nouvelle réservation (créatrice) et accusé de réception (cliente, si e-mail donné).
ALTER TABLE email_outbox ADD COLUMN reservation_id uuid REFERENCES reservation(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX email_outbox_reservation_once_idx ON email_outbox (reservation_id, kind) WHERE reservation_id IS NOT NULL;
ALTER TABLE email_outbox DROP CONSTRAINT email_outbox_kind_check;
ALTER TABLE email_outbox ADD CONSTRAINT email_outbox_kind_check CHECK (
  kind IN ('order_confirmation', 'admin_new_order', 'order_shipped', 'order_refunded', 'order_cancelled', 'admin_alert', 'weekly_report',
           'admin_new_reservation', 'reservation_received')
);

-- Libération automatique des réservations non confirmées au bout de 24 h (désactivable).
ALTER TABLE shop_settings ADD COLUMN reservation_auto_expire boolean NOT NULL DEFAULT true;
