-- « Mets ton négoce dans la boucle » (Greg, 23 octobre 2026) : le SIRET du négoce quand l'artisan l'a choisi dans Sirene,
-- pour ne jamais créer deux fois le même négoce (dédoublonnage par SIRET ou par e-mail).
-- AlterTable
ALTER TABLE "negoce" ADD COLUMN     "siret" TEXT;

-- CreateIndex
CREATE INDEX "negoce_siret_idx" ON "negoce"("siret");
