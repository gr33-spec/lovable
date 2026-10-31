-- Recentrage (Greg, 25 octobre 2026) : demande perso (but, accord, chiffrage en ligne, relance, commande, suivi),
-- regroupements de gros articles identiques (participation, estimation, lanceur, validité d'offre, volume minimum).
ALTER TABLE "price_request" ADD COLUMN "but" TEXT;
ALTER TABLE "price_request" ADD COLUMN "accordIdentiteLe" TIMESTAMP(3);
ALTER TABLE "price_request" ADD COLUMN "closLe" TIMESTAMP(3);
ALTER TABLE "price_request_recipient" ADD COLUMN "tokenHash" TEXT;
ALTER TABLE "price_request_recipient" ADD COLUMN "prix" JSONB;
ALTER TABLE "price_request_recipient" ADD COLUMN "livraisonHt" DECIMAL(14,2);
ALTER TABLE "price_request_recipient" ADD COLUMN "delaiJours" INTEGER;
ALTER TABLE "price_request_recipient" ADD COLUMN "validiteJours" INTEGER;
ALTER TABLE "price_request_recipient" ADD COLUMN "reponduLe" TIMESTAMP(3);
ALTER TABLE "price_request_recipient" ADD COLUMN "refuseLe" TIMESTAMP(3);
ALTER TABLE "price_request_recipient" ADD COLUMN "relanceLe" TIMESTAMP(3);
ALTER TABLE "price_request_recipient" ADD COLUMN "commandeLe" TIMESTAMP(3);
ALTER TABLE "price_request_recipient" ADD COLUMN "suivi" TEXT;
ALTER TABLE "price_request_recipient" ADD COLUMN "confirmeLe" TIMESTAMP(3);
ALTER TABLE "price_request_recipient" ADD COLUMN "livreLe" TIMESTAMP(3);
ALTER TABLE "price_request_recipient" ADD COLUMN "negoceId" UUID;
CREATE UNIQUE INDEX "price_request_recipient_tokenHash_key" ON "price_request_recipient"("tokenHash");
ALTER TABLE "supplier" ADD COLUMN "negoceId" UUID;
ALTER TABLE "besoin" ADD COLUMN "participation" TEXT;
ALTER TABLE "besoin" ADD COLUMN "estimeHt" DECIMAL(14,2);
ALTER TABLE "besoin" ADD COLUMN "lanceur" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "grille_negoce" ADD COLUMN "validiteJours" INTEGER;
ALTER TABLE "grille_negoce" ADD COLUMN "refuseLe" TIMESTAMP(3);
ALTER TABLE "cycle_commande" ADD COLUMN "estimeHt" DECIMAL(14,2);
ALTER TABLE "cycle_commande" ADD COLUMN "statutVolume" TEXT;
