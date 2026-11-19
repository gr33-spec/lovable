-- Pages régionales et inscription par métier (Greg, 19 novembre 2026).
-- Additive : une colonne facultative sur l'entreprise (le département choisi à l'inscription) et la liste d'attente des
-- métiers pas encore ouverts. Aucune donnée existante n'est réécrite.
ALTER TABLE "company" ADD COLUMN "departement" TEXT;

CREATE TABLE "liste_attente_metier" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "metier" TEXT NOT NULL,
    "departement" TEXT,
    "source" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "liste_attente_metier_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "liste_attente_metier_email_metier_key" ON "liste_attente_metier"("email", "metier");
CREATE INDEX "liste_attente_metier_metier_idx" ON "liste_attente_metier"("metier");
CREATE INDEX "liste_attente_metier_departement_idx" ON "liste_attente_metier"("departement");
-- Retour arrière : DROP TABLE "liste_attente_metier"; ALTER TABLE "company" DROP COLUMN "departement";
