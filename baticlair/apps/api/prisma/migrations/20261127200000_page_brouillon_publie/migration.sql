-- Brouillon et site publié (Greg, 27 novembre 2026, cahier 03). L'éditeur modifie le brouillon (les colonnes de la page) ;
-- le visiteur lit l'instantané publié. Une page déjà en ligne sans instantané reste lue comme avant ; son instantané est
-- pris juste avant son premier changement (rien de ce qui est en ligne ne bouge sans « Publier »). Migration additive.
ALTER TABLE "page_entreprise" ADD COLUMN "publie" JSONB;
ALTER TABLE "page_entreprise" ADD COLUMN "publie_le" TIMESTAMPTZ(3);
ALTER TABLE "page_entreprise" ADD COLUMN "modele_precedent" TEXT;

-- Retour arrière : ALTER TABLE "page_entreprise" DROP COLUMN "publie", DROP COLUMN "publie_le", DROP COLUMN "modele_precedent";
