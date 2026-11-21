-- §47.5 retour fournisseur : « commandé tel quel » / « modifié » et les écarts avec la liste envoyée.
ALTER TABLE "price_request" ADD COLUMN "orderFeedback" JSONB;
