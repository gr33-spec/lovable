-- Additive (Greg, 6 novembre 2026, parcours du négoce). Retour arrière : ALTER TABLE "price_request_recipient" DROP COLUMN "intention", DROP COLUMN "intention_le", DROP COLUMN "refus_motif", DROP COLUMN "precision_question", DROP COLUMN "precision_demandee_le", DROP COLUMN "precision_reponse", DROP COLUMN "precision_repondue_le";
-- AlterTable
ALTER TABLE "price_request_recipient" ADD COLUMN     "intention" TEXT,
ADD COLUMN     "intention_le" TIMESTAMPTZ(3),
ADD COLUMN     "precision_demandee_le" TIMESTAMPTZ(3),
ADD COLUMN     "precision_question" TEXT,
ADD COLUMN     "precision_repondue_le" TIMESTAMPTZ(3),
ADD COLUMN     "precision_reponse" TEXT,
ADD COLUMN     "refus_motif" TEXT;
