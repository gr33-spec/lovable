-- LE LOT D'ENVOI D'UNE DEMANDE TRIÉE PAR MÉTIER (recette n° 2 du 14 novembre 2026, bloquant N1). Depuis le tri par métier du
-- négoce (B7), « Demander les prix à mes négoces » peut créer plusieurs demandes d'un coup, une par groupe de négoces qui
-- reçoivent les mêmes lignes. L'écran ne savait plus les reconnaître (il les prenait pour des « sélections envoyées à
-- part ») et ne montrait plus leurs offres. Cette colonne dit que ces demandes sont parties ensemble.
-- Additive : une colonne facultative, vide pour toutes les demandes existantes ; aucune ligne modifiée ni supprimée.
--
-- Retour arrière : ALTER TABLE "price_request" DROP COLUMN "lot";

ALTER TABLE "price_request" ADD COLUMN "lot" TEXT;
