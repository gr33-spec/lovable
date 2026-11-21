-- Greg, 16 novembre 2026 : la commande chez un négoce porte la date de livraison souhaitée ; après la commande, l'artisan
-- choisit de prévenir (ou non) les autres négoces consultés ; 7 jours après les réponses, sans commande, un rappel de
-- suivi (« Où en es-tu avec cette demande ? »), jusqu'à « C'est réglé ».
-- Additive (colonnes facultatives, aucune donnée existante touchée). Retour arrière :
--   ALTER TABLE "price_request_recipient" DROP COLUMN "livraison_souhaitee";
--   ALTER TABLE "price_request" DROP COLUMN "autres_negoces_choix", DROP COLUMN "autres_negoces_le",
--     DROP COLUMN "suivi_rappel_le", DROP COLUMN "regle_le";
ALTER TABLE "price_request_recipient" ADD COLUMN "livraison_souhaitee" DATE;
ALTER TABLE "price_request" ADD COLUMN "autres_negoces_choix" TEXT;
ALTER TABLE "price_request" ADD COLUMN "autres_negoces_le" TIMESTAMPTZ(3);
ALTER TABLE "price_request" ADD COLUMN "suivi_rappel_le" TIMESTAMPTZ(3);
ALTER TABLE "price_request" ADD COLUMN "regle_le" TIMESTAMPTZ(3);
