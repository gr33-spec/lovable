-- Le site après une résiliation (Greg, 28 novembre 2026, option 2) : la date de l'e-mail « ton site sera retiré dans
-- 7 jours », pour ne l'envoyer qu'une fois. Migration additive.
ALTER TABLE "page_entreprise" ADD COLUMN "retrait_prevenu_le" TIMESTAMPTZ(3);

-- Retour arrière : ALTER TABLE "page_entreprise" DROP COLUMN "retrait_prevenu_le";
