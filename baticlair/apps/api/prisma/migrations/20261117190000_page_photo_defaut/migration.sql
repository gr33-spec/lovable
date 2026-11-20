-- La photo par défaut choisie dans la galerie de « Mon site » (Greg, 17 novembre 2026). Additive.
-- Retour arrière : ALTER TABLE "page_entreprise" DROP COLUMN "photo_defaut";
ALTER TABLE "page_entreprise" ADD COLUMN "photo_defaut" TEXT;
