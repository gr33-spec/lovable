-- Greg, 14 novembre 2026 : le code promo utilisé au paiement (« FONDATEUR »), pour dire qui l'utilise dans l'espace admin.
-- Additive ; retour arrière : ALTER TABLE "abonnement" DROP COLUMN "code_promo";
ALTER TABLE "abonnement" ADD COLUMN "code_promo" TEXT;
