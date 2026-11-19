-- Le nouvel onboarding « essaie d'abord » (Greg, 19 novembre 2026). Additive : deux colonnes facultatives, nulles pour les
-- comptes existants (aucune donnée réécrite).
ALTER TABLE "company" ADD COLUMN "parcours_inscription" TEXT;
ALTER TABLE "company" ADD COLUMN "identite_confirmee_le" TIMESTAMPTZ(3);
-- Retour arrière : ALTER TABLE "company" DROP COLUMN "parcours_inscription"; ALTER TABLE "company" DROP COLUMN "identite_confirmee_le";
