-- Additive (Greg, 7 novembre 2026, coût réellement livré). Retour arrière : ALTER TABLE "price_request_recipient" DROP COLUMN "livraisons", DROP COLUMN "minimum_commande_ht", DROP COLUMN "dechargement";
-- AlterTable
ALTER TABLE "price_request_recipient" ADD COLUMN     "dechargement" TEXT,
ADD COLUMN     "livraisons" TEXT,
ADD COLUMN     "minimum_commande_ht" DECIMAL(14,2);
