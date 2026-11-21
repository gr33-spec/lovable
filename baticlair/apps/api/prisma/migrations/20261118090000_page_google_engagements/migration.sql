-- Mon site : lien de la fiche Google et engagements cochés par l'artisan (Greg, 18 novembre 2026). Additive.
-- Retour arrière : ALTER TABLE "page_entreprise" DROP COLUMN "lien_google", DROP COLUMN "engagements";
ALTER TABLE "page_entreprise" ADD COLUMN "lien_google" TEXT;
ALTER TABLE "page_entreprise" ADD COLUMN "engagements" TEXT[] DEFAULT ARRAY[]::TEXT[];
