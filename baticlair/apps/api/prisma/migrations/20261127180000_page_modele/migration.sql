-- Les modèles de site (Greg, 27 novembre 2026 : « mêmes données, habillages complètement différents, passage d'un
-- modèle à l'autre en un clic sans rien perdre »). Le modèle n'est qu'un choix d'habillage : le contenu ne bouge pas.
-- Nul : le modèle par défaut. Migration additive.
ALTER TABLE "page_entreprise" ADD COLUMN "modele" TEXT;

-- Retour arrière : ALTER TABLE "page_entreprise" DROP COLUMN "modele";
