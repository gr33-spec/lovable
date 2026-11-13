-- Le cœur métier du catalogue (Greg, 13 novembre 2026) : deux colonnes ADDITIVES sur catalogue_article.
--  - a_verifier : l'admin marque une donnée à vérifier ;
--  - metiers_secondaires : les métiers où l'article se lit en plus du sien (une fiche, plusieurs rattachements).
-- Aucun article n'est modifié, déplacé ni supprimé ; aucune clé ne change.
-- Retour arrière :
--   ALTER TABLE "catalogue_article" DROP COLUMN "a_verifier", DROP COLUMN "metiers_secondaires";
ALTER TABLE "catalogue_article" ADD COLUMN "a_verifier" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "catalogue_article" ADD COLUMN "metiers_secondaires" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
