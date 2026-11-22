-- La Bohème en Paillettes — schéma initial.
-- Règles : montants en centimes (entiers), identifiants UUID aléatoires,
-- aucune suppression destructive de ce qui a été commandé, cohérence
-- garantie par la base (contraintes) et pas seulement par l'interface.

-- Normalisation pour la recherche (minuscules, sans accents). IMMUTABLE :
-- utilisable dans les index et les colonnes calculées.
CREATE FUNCTION norm(t text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT translate(
    replace(replace(lower(coalesce(t, '')), 'œ', 'oe'), 'æ', 'ae'),
    'àáâãäåçèéêëìíîïñòóôõöùúûüýÿ',
    'aaaaaaceeeeiiiinooooouuuuyy')
$$;

CREATE FUNCTION touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

-- ───────────────────────── Administration ─────────────────────────

CREATE TABLE admin_user (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE CHECK (email = lower(email) AND length(email) BETWEEN 3 AND 254),
  name text NOT NULL DEFAULT '' CHECK (length(name) <= 80),
  password_hash text NOT NULL,
  totp_secret_enc text,
  totp_enabled boolean NOT NULL DEFAULT false,
  totp_last_step bigint,
  password_changed_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (NOT totp_enabled OR totp_secret_enc IS NOT NULL)
);

CREATE TABLE admin_session (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES admin_user(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  user_agent text NOT NULL DEFAULT '' CHECK (length(user_agent) <= 300),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz
);
CREATE INDEX admin_session_admin_idx ON admin_session (admin_id) WHERE revoked_at IS NULL;

CREATE TABLE password_reset (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES admin_user(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Limitation de débit partagée entre toutes les instances du serveur.
CREATE TABLE rate_limit (
  bucket text NOT NULL,
  window_start timestamptz NOT NULL,
  hits integer NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, window_start)
);

CREATE TABLE audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  admin_id uuid REFERENCES admin_user(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL DEFAULT '',
  entity_id text NOT NULL DEFAULT '',
  details jsonb NOT NULL DEFAULT '{}',
  ip text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_created_idx ON audit_log (created_at DESC);

-- Incidents techniques (paiement, e-mail, webhook…) visibles dans l'admin.
CREATE TABLE system_event (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  level text NOT NULL CHECK (level IN ('info', 'warning', 'error')),
  source text NOT NULL,
  message text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE INDEX system_event_open_idx ON system_event (created_at DESC) WHERE resolved_at IS NULL;

-- ───────────────────────── Catalogue ─────────────────────────

CREATE TABLE category (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(slug) <= 80),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 80),
  description text NOT NULL DEFAULT '' CHECK (length(description) <= 1000),
  position integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER category_touch BEFORE UPDATE ON category FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE collection (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(slug) <= 80),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 80),
  description text NOT NULL DEFAULT '' CHECK (length(description) <= 1000),
  position integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER collection_touch BEFORE UPDATE ON collection FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- « Épuisé » n'est pas un statut stocké : c'est un produit publié dont le
-- stock est à zéro. Une seule source de vérité (le stock), aucun risque
-- d'incohérence entre un statut « épuisé » et un stock positif.
CREATE TABLE product (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(slug) <= 120),
  sku text UNIQUE CHECK (sku IS NULL OR (length(sku) BETWEEN 1 AND 40 AND sku ~ '^[A-Za-z0-9._-]+$')),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 120),
  description text NOT NULL DEFAULT '' CHECK (length(description) <= 5000),
  category_id uuid NOT NULL REFERENCES category(id) ON DELETE RESTRICT,
  collection_id uuid REFERENCES collection(id) ON DELETE SET NULL,
  price_cents integer NOT NULL CHECK (price_cents BETWEEN 1 AND 10000000),
  compare_at_cents integer CHECK (compare_at_cents IS NULL OR compare_at_cents > price_cents),
  stock integer NOT NULL DEFAULT 0 CHECK (stock BETWEEN 0 AND 100000),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  position integer NOT NULL DEFAULT 0,
  colors text[] NOT NULL DEFAULT '{}' CHECK (cardinality(colors) <= 12),
  tags text[] NOT NULL DEFAULT '{}' CHECK (cardinality(tags) <= 20),
  features jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(features) = 'array' AND jsonb_array_length(features) <= 12),
  seo_title text CHECK (seo_title IS NULL OR length(seo_title) <= 120),
  seo_description text CHECK (seo_description IS NULL OR length(seo_description) <= 300),
  search_text text NOT NULL DEFAULT '',
  version integer NOT NULL DEFAULT 1,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status <> 'published' OR published_at IS NOT NULL)
);
CREATE INDEX product_listing_idx ON product (status, position, published_at DESC);
CREATE INDEX product_category_idx ON product (category_id);
CREATE INDEX product_collection_idx ON product (collection_id);

CREATE FUNCTION product_before_write() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_text := norm(concat_ws(' ', NEW.name, NEW.sku, array_to_string(NEW.tags, ' '), array_to_string(NEW.colors, ' ')));
  IF TG_OP = 'UPDATE' THEN
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER product_write BEFORE INSERT OR UPDATE ON product FOR EACH ROW EXECUTE FUNCTION product_before_write();

-- Anciennes adresses d'un produit renommé : redirection permanente.
CREATE TABLE product_slug_redirect (
  old_slug text PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES product(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Images (produits et identité de la marque). Les fichiers sont dérivés de
-- l'identifiant : images/<id>/<largeur>.webp et images/<id>/og.jpg.
-- La photo principale d'un produit est celle de position 0.
CREATE TABLE image (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('product', 'brand', 'order')),
  product_id uuid REFERENCES product(id) ON DELETE SET NULL,
  position integer NOT NULL DEFAULT 0,
  width integer NOT NULL CHECK (width > 0),
  height integer NOT NULL CHECK (height > 0),
  widths integer[] NOT NULL,
  placeholder text NOT NULL DEFAULT '' CHECK (length(placeholder) <= 2000),
  alt text NOT NULL DEFAULT '' CHECK (length(alt) <= 200),
  content_hash text NOT NULL,
  bytes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX image_product_idx ON image (product_id, position);
-- Une même photo n'est pas importée deux fois sur un même produit.
CREATE UNIQUE INDEX image_product_hash_uniq ON image (product_id, content_hash) WHERE product_id IS NOT NULL;

-- ───────────────────────── Livraison ─────────────────────────

CREATE TABLE shipping_method (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 80),
  description text NOT NULL DEFAULT '' CHECK (length(description) <= 300),
  price_cents integer NOT NULL CHECK (price_cents BETWEEN 0 AND 100000),
  free_over_cents integer CHECK (free_over_cents IS NULL OR free_over_cents > 0),
  countries text[] NOT NULL CHECK (cardinality(countries) >= 1),
  requires_address boolean NOT NULL DEFAULT true,
  carrier text CHECK (carrier IS NULL OR length(carrier) <= 40),
  delivery_estimate text NOT NULL DEFAULT '' CHECK (length(delivery_estimate) <= 80),
  position integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER shipping_method_touch BEFORE UPDATE ON shipping_method FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ───────────────────────── Paramètres (une seule ligne) ─────────────────────────

CREATE TABLE shop_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  shop_name text NOT NULL DEFAULT 'La Bohème en Paillettes' CHECK (length(shop_name) BETWEEN 1 AND 80),
  tagline text NOT NULL DEFAULT '' CHECK (length(tagline) <= 160),
  intro_text text NOT NULL DEFAULT '' CHECK (length(intro_text) <= 600),
  about_title text NOT NULL DEFAULT '' CHECK (length(about_title) <= 120),
  about_text text NOT NULL DEFAULT '' CHECK (length(about_text) <= 6000),
  contact_email text NOT NULL DEFAULT '' CHECK (length(contact_email) <= 254),
  notification_email text NOT NULL DEFAULT '' CHECK (length(notification_email) <= 254),
  logo_image_id uuid REFERENCES image(id) ON DELETE SET NULL,
  favicon_image_id uuid REFERENCES image(id) ON DELETE SET NULL,
  hero_image_id uuid REFERENCES image(id) ON DELETE SET NULL,
  about_image_id uuid REFERENCES image(id) ON DELETE SET NULL,
  socials jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(socials) = 'array'),
  theme text NOT NULL DEFAULT 'boheme-sauge',
  low_stock_threshold integer NOT NULL DEFAULT 2 CHECK (low_stock_threshold BETWEEN 0 AND 100),
  orders_open boolean NOT NULL DEFAULT true,
  closed_message text NOT NULL DEFAULT '' CHECK (length(closed_message) <= 300),
  allow_promotion_codes boolean NOT NULL DEFAULT false,
  -- Fiscalité : NULL = pas encore renseigné (voir l'administration).
  vat_regime text CHECK (vat_regime IS NULL OR vat_regime IN ('franchise', 'assujetti')),
  vat_rate_bp integer NOT NULL DEFAULT 2000 CHECK (vat_rate_bp BETWEEN 0 AND 10000),
  -- Informations légales (mentions légales, factures).
  legal_name text NOT NULL DEFAULT '' CHECK (length(legal_name) <= 160),
  legal_status text NOT NULL DEFAULT '' CHECK (length(legal_status) <= 160),
  legal_siret text NOT NULL DEFAULT '' CHECK (length(legal_siret) <= 40),
  legal_registration text NOT NULL DEFAULT '' CHECK (length(legal_registration) <= 160),
  legal_vat_number text NOT NULL DEFAULT '' CHECK (length(legal_vat_number) <= 40),
  legal_address text NOT NULL DEFAULT '' CHECK (length(legal_address) <= 300),
  legal_publisher text NOT NULL DEFAULT '' CHECK (length(legal_publisher) <= 160),
  legal_host text NOT NULL DEFAULT '' CHECK (length(legal_host) <= 300),
  legal_mediator text NOT NULL DEFAULT '' CHECK (length(legal_mediator) <= 500),
  -- RGPD : effacement automatique des adresses de livraison (mois après la
  -- fin de la commande). NULL = désactivé tant que la durée n'est pas validée.
  address_retention_months integer CHECK (address_retention_months IS NULL OR address_retention_months BETWEEN 1 AND 240),
  version integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO shop_settings (id) VALUES (1);

CREATE TABLE legal_page (
  slug text PRIMARY KEY CHECK (slug IN ('mentions-legales', 'cgv', 'confidentialite', 'livraison-retours')),
  title text NOT NULL,
  body text NOT NULL DEFAULT '' CHECK (length(body) <= 60000),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ───────────────────────── Commandes ─────────────────────────

-- Statuts : pending (paiement en cours, stock réservé) → paid → preparing →
-- shipped → completed ; cancelled / refunded ; expired (paiement non abouti,
-- stock rendu). pending et expired ne sont pas des commandes pour la
-- créatrice : ils restent techniques.
CREATE TABLE customer_order (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL UNIQUE CHECK (number ~ '^BP-[0-9A-Z]{6}$'),
  access_token_hash text NOT NULL UNIQUE,
  access_token_enc text NOT NULL,
  idempotency_key uuid NOT NULL UNIQUE,
  status text NOT NULL CHECK (status IN ('pending', 'paid', 'preparing', 'shipped', 'completed', 'cancelled', 'refunded', 'expired')),
  email text NOT NULL CHECK (length(email) <= 254),
  first_name text NOT NULL CHECK (length(first_name) <= 80),
  last_name text NOT NULL CHECK (length(last_name) <= 80),
  phone text CHECK (phone IS NULL OR length(phone) <= 30),
  ship_line1 text CHECK (ship_line1 IS NULL OR length(ship_line1) <= 200),
  ship_line2 text CHECK (ship_line2 IS NULL OR length(ship_line2) <= 200),
  ship_postal_code text CHECK (ship_postal_code IS NULL OR length(ship_postal_code) <= 20),
  ship_city text CHECK (ship_city IS NULL OR length(ship_city) <= 100),
  ship_country text CHECK (ship_country IS NULL OR ship_country ~ '^[A-Z]{2}$'),
  shipping_method_id uuid REFERENCES shipping_method(id) ON DELETE SET NULL,
  shipping_method_name text NOT NULL,
  shipping_requires_address boolean NOT NULL,
  subtotal_cents integer NOT NULL CHECK (subtotal_cents >= 0),
  shipping_cents integer NOT NULL CHECK (shipping_cents >= 0),
  discount_cents integer NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
  total_cents integer NOT NULL CHECK (total_cents >= 0),
  currency text NOT NULL DEFAULT 'eur' CHECK (currency = 'eur'),
  vat_regime text CHECK (vat_regime IS NULL OR vat_regime IN ('franchise', 'assujetti')),
  vat_rate_bp integer,
  vat_cents integer CHECK (vat_cents IS NULL OR vat_cents >= 0),
  promo_code text CHECK (promo_code IS NULL OR length(promo_code) <= 60),
  payment_provider text NOT NULL,
  payment_session_id text UNIQUE,
  payment_url text CHECK (payment_url IS NULL OR length(payment_url) <= 2000),
  payment_intent_id text UNIQUE,
  payment_livemode boolean,
  reserved_until timestamptz,
  paid_at timestamptz,
  shipped_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  refunded_at timestamptz,
  expired_at timestamptz,
  refunded_cents integer NOT NULL DEFAULT 0,
  tracking_number text CHECK (tracking_number IS NULL OR length(tracking_number) <= 80),
  tracking_url text CHECK (tracking_url IS NULL OR (length(tracking_url) <= 500 AND tracking_url ~ '^https://')),
  invoice_number text UNIQUE,
  admin_note text NOT NULL DEFAULT '' CHECK (length(admin_note) <= 2000),
  needs_attention text CHECK (needs_attention IS NULL OR length(needs_attention) <= 500),
  anonymized_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (total_cents = subtotal_cents + shipping_cents - discount_cents),
  CHECK (refunded_cents BETWEEN 0 AND total_cents),
  CHECK (NOT shipping_requires_address OR anonymized_at IS NOT NULL OR
         (ship_line1 IS NOT NULL AND ship_postal_code IS NOT NULL AND ship_city IS NOT NULL AND ship_country IS NOT NULL)),
  CHECK (status <> 'pending' OR reserved_until IS NOT NULL),
  CHECK (status IN ('pending', 'expired') OR paid_at IS NOT NULL)
);
CREATE TRIGGER customer_order_touch BEFORE UPDATE ON customer_order FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE INDEX customer_order_status_idx ON customer_order (status, created_at DESC);
CREATE INDEX customer_order_pending_idx ON customer_order (reserved_until) WHERE status = 'pending';
CREATE INDEX customer_order_email_idx ON customer_order (lower(email));

-- Lignes de commande : copie figée de ce qui a été acheté (nom, prix, photo…).
-- La référence au produit ne sert qu'à la navigation et au stock ; elle
-- empêche aussi toute suppression définitive d'un produit déjà commandé.
CREATE TABLE order_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES customer_order(id) ON DELETE CASCADE,
  product_id uuid REFERENCES product(id) ON DELETE RESTRICT,
  product_name text NOT NULL,
  product_sku text,
  product_slug text NOT NULL,
  image_id uuid,
  unit_price_cents integer NOT NULL CHECK (unit_price_cents > 0),
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 99),
  line_total_cents integer NOT NULL,
  options jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(options) = 'object'),
  CHECK (line_total_cents = unit_price_cents * quantity)
);
CREATE INDEX order_item_order_idx ON order_item (order_id);
CREATE INDEX order_item_product_idx ON order_item (product_id);
CREATE INDEX order_item_image_idx ON order_item (image_id);

-- Journal des mouvements de stock (qui, quand, pourquoi).
CREATE TABLE stock_movement (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES product(id) ON DELETE CASCADE,
  delta integer NOT NULL CHECK (delta <> 0),
  stock_after integer NOT NULL CHECK (stock_after >= 0),
  reason text NOT NULL CHECK (reason IN ('reservation', 'release', 'admin', 'restock', 'late_payment')),
  order_id uuid REFERENCES customer_order(id) ON DELETE SET NULL,
  admin_id uuid REFERENCES admin_user(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX stock_movement_product_idx ON stock_movement (product_id, created_at DESC);

-- Webhooks de paiement déjà traités (idempotence : un événement reçu deux
-- fois n'est traité qu'une fois).
CREATE TABLE payment_event (
  id text PRIMARY KEY,
  type text NOT NULL,
  order_id uuid REFERENCES customer_order(id) ON DELETE SET NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);

-- Boîte d'envoi des e-mails transactionnels : un e-mail par commande et par
-- type (contrainte d'unicité), renvoyé automatiquement en cas d'échec.
CREATE TABLE email_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES customer_order(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('order_confirmation', 'admin_new_order', 'order_shipped', 'order_refunded', 'order_cancelled', 'admin_alert')),
  recipient text NOT NULL CHECK (length(recipient) <= 254),
  payload jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);
CREATE UNIQUE INDEX email_outbox_once_idx ON email_outbox (order_id, kind) WHERE order_id IS NOT NULL;
CREATE INDEX email_outbox_pending_idx ON email_outbox (next_attempt_at) WHERE status = 'pending';

-- Numérotation des factures : continue, sans trou, par année.
CREATE TABLE invoice_counter (
  year integer PRIMARY KEY,
  last_number integer NOT NULL DEFAULT 0
);

-- ───────────────────────── Sécurité d'accès (Supabase) ─────────────────────────
-- L'application accède à la base uniquement depuis le serveur. L'API
-- publique de Supabase (clé « anon ») ne doit rien pouvoir lire : RLS
-- activée partout, aucune politique = tout refusé, droits retirés.
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated';
    EXECUTE 'REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated';
    EXECUTE 'REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated';
  END IF;
END $$;
