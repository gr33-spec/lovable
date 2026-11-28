-- MON SITE, LA COULEUR DES BOUTONS (Greg, 17 novembre 2026) : une colonne NOUVELLE, nulle par défaut (= jaune Mobiiz).
-- Aucune donnée existante modifiée. Retour arrière :
--   ALTER TABLE "page_entreprise" DROP COLUMN "couleur_boutons";

-- AlterTable
ALTER TABLE "page_entreprise" ADD COLUMN "couleur_boutons" TEXT;
