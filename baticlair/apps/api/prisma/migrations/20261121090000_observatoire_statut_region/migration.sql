-- Greg, 21 novembre 2026 (prix, point 1) : l'observatoire distingue un prix proposé d'un prix commandé, et garde la région.
-- Additive : deux colonnes, aucune donnée réécrite (les lignes déjà là restent « propose », région vide).
ALTER TABLE "observations_prix" ADD COLUMN "statut" TEXT NOT NULL DEFAULT 'propose';
ALTER TABLE "observations_prix" ADD COLUMN "region" TEXT;
-- Retour arrière : ALTER TABLE "observations_prix" DROP COLUMN "region"; ALTER TABLE "observations_prix" DROP COLUMN "statut";
