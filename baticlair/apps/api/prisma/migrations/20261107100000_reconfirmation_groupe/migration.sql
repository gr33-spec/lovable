-- Additive (lot 4, 6 novembre 2026). Retour arrière : ALTER TABLE "besoin_negocie" DROP COLUMN "reconfirmation_demandee_le", DROP COLUMN "reconfirme_le";
-- AlterTable
ALTER TABLE "besoin_negocie" ADD COLUMN     "reconfirmation_demandee_le" TIMESTAMPTZ(3),
ADD COLUMN     "reconfirme_le" TIMESTAMPTZ(3);
