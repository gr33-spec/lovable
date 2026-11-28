-- Greg, 19 novembre 2026 : une liste faite pour un besoin groupé porte son origine ; elle vit dans Demandes › Groupées.
-- Additive : une colonne facultative, aucune donnée réécrite.
ALTER TABLE "project" ADD COLUMN "origine" TEXT;
-- Retour arrière : ALTER TABLE "project" DROP COLUMN "origine";
