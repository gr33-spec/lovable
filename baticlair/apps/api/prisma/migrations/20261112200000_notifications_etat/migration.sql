-- Additive (Greg, 12 novembre 2026, dossier de corrections UX, point 2 : notifications cohérentes et supprimables).
-- Une colonne facultative sur "alerte_courte" et une table nouvelle. Aucune donnée existante n'est modifiée ni supprimée.
-- RETOUR ARRIÈRE (jamais exécuté automatiquement) :
--   DROP TABLE "etat_a_faire";
--   ALTER TABLE "alerte_courte" DROP COLUMN "supprimee_le";

-- AlterTable
ALTER TABLE "alerte_courte" ADD COLUMN "supprimee_le" TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "etat_a_faire" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "cle" TEXT NOT NULL,
    "vu_le" TIMESTAMPTZ(3),
    "masque_le" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "etat_a_faire_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "etat_a_faire_company_id_cle_key" ON "etat_a_faire"("company_id", "cle");

-- AddForeignKey
ALTER TABLE "etat_a_faire" ADD CONSTRAINT "etat_a_faire_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
