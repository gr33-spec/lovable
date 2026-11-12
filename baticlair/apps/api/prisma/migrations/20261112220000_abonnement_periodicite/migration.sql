-- Additive (Greg, 12 novembre 2026, dossier de corrections UX, point 13 : abonnement mensuel ou annuel).
-- Une colonne avec valeur par défaut : tous les abonnements existants restent « mensuel », rien d'autre ne change.
-- RETOUR ARRIÈRE (jamais exécuté automatiquement) :
--   ALTER TABLE "abonnement" DROP COLUMN "periodicite";

-- AlterTable
ALTER TABLE "abonnement" ADD COLUMN "periodicite" TEXT NOT NULL DEFAULT 'mensuel';
