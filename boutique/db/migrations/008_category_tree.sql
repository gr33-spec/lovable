-- Catégories en arborescence : catégorie → sous-catégorie → sous-sous-catégorie
-- (3 niveaux au plus). Aucune catégorie n'est codée en dur : la créatrice
-- crée, renomme, déplace, masque et archive tout depuis l'administration.
--
-- Règles garanties par la base :
--  * une catégorie ne peut pas être sa propre ancêtre (pas de boucle) ;
--  * profondeur maximale : 3 niveaux ;
--  * adresse (slug) unique parmi les catégories d'un même parent :
--    /boutique/boucles-d-oreilles/coeurs et /boutique/pampilles/coeurs coexistent ;
--  * une catégorie contenant des produits ou des sous-catégories ne peut pas
--    être supprimée (ON DELETE RESTRICT).

ALTER TABLE category ADD COLUMN parent_id uuid REFERENCES category(id) ON DELETE RESTRICT;
ALTER TABLE category ADD COLUMN archived_at timestamptz;
ALTER TABLE category ADD CONSTRAINT category_not_own_parent CHECK (parent_id IS NULL OR parent_id <> id);
CREATE INDEX category_parent_idx ON category (parent_id, position);

ALTER TABLE category DROP CONSTRAINT category_slug_key;
CREATE UNIQUE INDEX category_sibling_slug_uniq ON category (coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), slug);

CREATE FUNCTION category_check_tree() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  cur uuid := NEW.parent_id;
  depth integer := 1;
BEGIN
  WHILE cur IS NOT NULL LOOP
    IF cur = NEW.id THEN
      RAISE EXCEPTION 'Une catégorie ne peut pas être rangée dans une de ses sous-catégories' USING ERRCODE = 'check_violation';
    END IF;
    depth := depth + 1;
    IF depth > 3 THEN
      RAISE EXCEPTION 'Trois niveaux de catégories au maximum' USING ERRCODE = 'check_violation';
    END IF;
    SELECT parent_id INTO cur FROM category WHERE id = cur;
  END LOOP;
  RETURN NEW;
END $$;
CREATE TRIGGER category_tree BEFORE INSERT OR UPDATE OF parent_id ON category FOR EACH ROW EXECUTE FUNCTION category_check_tree();

-- Anciennes adresses d'une catégorie renommée ou déplacée : redirection permanente.
CREATE TABLE category_redirect (
  old_path text PRIMARY KEY CHECK (length(old_path) <= 300),
  category_id uuid NOT NULL REFERENCES category(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE category_redirect ENABLE ROW LEVEL SECURITY;

-- Catégories publiques : visibles, non archivées, et dont TOUS les parents
-- le sont aussi. « path » est l'adresse complète (pampilles/coeurs).
CREATE VIEW shop_category WITH (security_invoker = true) AS
WITH RECURSIVE t AS (
  SELECT c.id, c.parent_id, c.slug, c.name, c.description, c.position, c.updated_at,
         1 AS depth, c.slug::text AS path, ARRAY[c.name]::text[] AS names, ARRAY[c.id] AS ancestors
  FROM category c WHERE c.parent_id IS NULL AND c.is_visible AND c.archived_at IS NULL
  UNION ALL
  SELECT c.id, c.parent_id, c.slug, c.name, c.description, c.position, c.updated_at,
         t.depth + 1, t.path || '/' || c.slug, t.names || c.name, t.ancestors || c.id
  FROM category c JOIN t ON c.parent_id = t.id
  WHERE c.is_visible AND c.archived_at IS NULL AND t.depth < 3
)
SELECT * FROM t;

-- Forme « adresse » d'un texte (minuscules, sans accents, tirets) : sert à
-- filtrer par caractéristique (motif=mariniere) quelle que soit l'écriture.
CREATE FUNCTION slugish(t text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT btrim(regexp_replace(norm(t), '[^a-z0-9]+', '-', 'g'), '-')
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON shop_category, category_redirect FROM anon, authenticated';
    EXECUTE 'REVOKE ALL ON FUNCTION slugish(text), category_check_tree() FROM anon, authenticated';
  END IF;
END $$;

-- Recherche : les caractéristiques (motif, matière…) sont aussi cherchables.
CREATE OR REPLACE FUNCTION product_before_write() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_text := norm(concat_ws(' ', NEW.name, NEW.sku, array_to_string(NEW.tags, ' '), array_to_string(NEW.colors, ' '),
                                    (SELECT string_agg(f->>'value', ' ') FROM jsonb_array_elements(NEW.features) f)));
  IF TG_OP = 'UPDATE' THEN
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END $$;
ALTER TABLE product DISABLE TRIGGER product_write;
UPDATE product SET search_text = norm(concat_ws(' ', name, sku, array_to_string(tags, ' '), array_to_string(colors, ' '),
                                                (SELECT string_agg(f->>'value', ' ') FROM jsonb_array_elements(features) f)));
ALTER TABLE product ENABLE TRIGGER product_write;
