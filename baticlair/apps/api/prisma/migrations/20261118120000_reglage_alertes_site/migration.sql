-- Greg, 18 novembre 2026 : une rubrique « Mon site » dans les réglages des alertes (allumée par défaut).
-- Retour arrière : ALTER TABLE "reglage_alertes" DROP COLUMN "site";
ALTER TABLE "reglage_alertes" ADD COLUMN "site" BOOLEAN NOT NULL DEFAULT true;
