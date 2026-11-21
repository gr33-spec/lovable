-- Croquis par ligne du quantitatif : la photo ou le PDF d'une couvertine, d'un habillage… rattaché à UN article
-- (clé de l'article dans la liste d'achats) avec la précision de l'artisan. Jamais lu par l'IA ; joint à la commande.
ALTER TABLE "document" ADD COLUMN "itemKey" TEXT;
ALTER TABLE "document" ADD COLUMN "note" TEXT;
