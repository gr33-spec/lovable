-- Additive (lot 5, 6 novembre 2026). Retour arrière : ALTER TABLE "ligne_rapprochement" DROP COLUMN "rayon_km"; ALTER TABLE "regroupement_negocie" DROP COLUMN "mode_livraison";
-- AlterTable
ALTER TABLE "ligne_rapprochement" ADD COLUMN     "rayon_km" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "regroupement_negocie" ADD COLUMN     "mode_livraison" TEXT NOT NULL DEFAULT 'livraison';
