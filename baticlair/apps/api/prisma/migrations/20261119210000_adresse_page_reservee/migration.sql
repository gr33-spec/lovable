-- Greg, 19 novembre 2026 : l'adresse du site d'une entreprise supprimée n'est jamais redonnée à une autre (un QR code
-- imprimé ne doit jamais mener chez quelqu'un d'autre). Additive : une table et un déclencheur, aucune donnée réécrite.
CREATE TABLE "adresse_page_reservee" (
  "adresse" TEXT NOT NULL,
  "liberee_le" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "adresse_page_reservee_pkey" PRIMARY KEY ("adresse")
);

-- Avant la suppression d'une entreprise (quel que soit le chemin), son adresse et ses anciennes adresses sont mises de côté.
CREATE FUNCTION "reserver_adresses_page"() RETURNS trigger AS $$
BEGIN
  INSERT INTO "adresse_page_reservee" ("adresse")
    SELECT "adresse" FROM "page_entreprise" WHERE "company_id" = OLD."id"
    UNION SELECT "adresse" FROM "ancienne_adresse_page" WHERE "company_id" = OLD."id"
  ON CONFLICT DO NOTHING;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "reserver_adresses_page_avant_suppression"
  BEFORE DELETE ON "company"
  FOR EACH ROW EXECUTE FUNCTION "reserver_adresses_page"();

-- Retour arrière :
-- DROP TRIGGER "reserver_adresses_page_avant_suppression" ON "company";
-- DROP FUNCTION "reserver_adresses_page"();
-- DROP TABLE "adresse_page_reservee";
