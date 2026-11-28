-- Additive (prompt maître point 11, 6 novembre 2026). Retour arrière : ALTER TABLE "regroupement_negocie" DROP COLUMN "campagne_le";
-- AlterTable
ALTER TABLE "regroupement_negocie" ADD COLUMN     "campagne_le" TIMESTAMPTZ(3);
