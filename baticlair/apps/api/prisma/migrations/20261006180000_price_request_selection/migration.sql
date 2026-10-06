-- §48.5 : une demande peut ne porter que sur une sélection d'articles de la liste (vide = toute la liste).
ALTER TABLE "price_request" ADD COLUMN "itemKeys" TEXT[] DEFAULT ARRAY[]::TEXT[];
