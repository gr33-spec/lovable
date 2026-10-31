-- Multimétier (Greg, 25 octobre 2026) : négoces généralistes ou spécialistes, combinaisons commandées par part.
ALTER TABLE "negoce" ADD COLUMN "generaliste" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "compte_negoce" ADD COLUMN "generaliste" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "compte_negoce" ADD COLUMN "familles" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "choix_artisan" ADD COLUMN "parts" JSONB;
