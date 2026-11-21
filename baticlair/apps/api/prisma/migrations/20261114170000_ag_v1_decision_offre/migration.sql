-- ACHATS GROUPÉS V1 : LA DÉCISION SUR L'OFFRE (Greg, 14 novembre 2026, recette n° 2 : « deux boutons sur l'offre d'achat
-- groupé, "Commander à ce prix" et "Non merci" ; l'artisan peut refuser »). Avant : l'offre s'affichait avec un bouton
-- grisé « [bouton final : texte à fixer] », sans commande ni refus possibles.
-- Additive : trois colonnes facultatives, vides pour tout l'existant ; aucune ligne modifiée ni supprimée.
--   - offre_achat_groupe_v1.fournisseur_email : où part le bon de commande (sans lui, « Commander » reste fermé) ;
--   - besoin_groupe_v1.offre_decision : « commandee » ou « refusee » ; offre_decidee_le : quand.
--
-- Retour arrière :
--   ALTER TABLE "offre_achat_groupe_v1" DROP COLUMN "fournisseur_email";
--   ALTER TABLE "besoin_groupe_v1" DROP COLUMN "offre_decision", DROP COLUMN "offre_decidee_le";

ALTER TABLE "offre_achat_groupe_v1" ADD COLUMN "fournisseur_email" TEXT;
ALTER TABLE "besoin_groupe_v1" ADD COLUMN "offre_decision" TEXT, ADD COLUMN "offre_decidee_le" TIMESTAMPTZ(3);
