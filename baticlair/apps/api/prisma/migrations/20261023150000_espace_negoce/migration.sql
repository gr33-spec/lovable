-- ESPACE NÉGOCE AUTONOME (Greg, 23 octobre 2026) : un compte par négoce (SIRET ou e-mail), ses dépôts, ses paliers de
-- livraison, ses départements (abonnements), la grille garantie 30 jours (négoce retenu, commandes sur grille garantie),
-- les prix non garantis d'une grille. Les anciens champs de livraison d'une grille (départ, franco, prix au-delà) sont
-- repris : un dépôt, un palier payant jusqu'à 1 000 km.
-- AlterTable
ALTER TABLE "cycle_commande" ADD COLUMN     "garantieJusquau" TIMESTAMP(3),
ADD COLUMN     "retenuId" UUID;

-- AlterTable
ALTER TABLE "grille_negoce" ADD COLUMN     "nonGarantis" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "negoce" ADD COLUMN     "compteId" UUID;

-- CreateTable
CREATE TABLE "compte_negoce" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "siret" TEXT,
    "enseigne" TEXT NOT NULL,
    "telephone" TEXT,
    "livraison" JSONB,
    "departements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "invitationLe" TIMESTAMP(3),
    "rappels" INTEGER NOT NULL DEFAULT 0,
    "inscritLe" TIMESTAMP(3),
    "conditionsAccepteesLe" TIMESTAMP(3),
    "conditionsVersion" TEXT,
    "derniereConnexionLe" TIMESTAMP(3),
    "desabonneLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compte_negoce_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "depot_negoce" (
    "id" UUID NOT NULL,
    "compteId" UUID NOT NULL,
    "adresse" TEXT NOT NULL,
    "codePostal" TEXT,
    "commune" TEXT,
    "departement" TEXT,
    "lat" DOUBLE PRECISION,
    "lon" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "depot_negoce_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commande_garantie" (
    "id" UUID NOT NULL,
    "numero" SERIAL NOT NULL,
    "cycleId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "negoceId" UUID NOT NULL,
    "adresseLivraison" TEXT NOT NULL,
    "lignes" JSONB NOT NULL,
    "marchandiseHt" DECIMAL(14,2) NOT NULL,
    "livraisonHt" DECIMAL(14,2) NOT NULL,
    "totalHt" DECIMAL(14,2) NOT NULL,
    "commandeLe" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commande_garantie_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "compte_negoce_email_key" ON "compte_negoce"("email");

-- CreateIndex
CREATE UNIQUE INDEX "compte_negoce_siret_key" ON "compte_negoce"("siret");

-- CreateIndex
CREATE INDEX "depot_negoce_compteId_idx" ON "depot_negoce"("compteId");

-- CreateIndex
CREATE UNIQUE INDEX "commande_garantie_numero_key" ON "commande_garantie"("numero");

-- CreateIndex
CREATE INDEX "commande_garantie_cycleId_idx" ON "commande_garantie"("cycleId");

-- CreateIndex
CREATE INDEX "commande_garantie_companyId_idx" ON "commande_garantie"("companyId");

-- CreateIndex
CREATE INDEX "negoce_compteId_idx" ON "negoce"("compteId");

-- AddForeignKey
ALTER TABLE "negoce" ADD CONSTRAINT "negoce_compteId_fkey" FOREIGN KEY ("compteId") REFERENCES "compte_negoce"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "depot_negoce" ADD CONSTRAINT "depot_negoce_compteId_fkey" FOREIGN KEY ("compteId") REFERENCES "compte_negoce"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commande_garantie" ADD CONSTRAINT "commande_garantie_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "cycle_commande"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commande_garantie" ADD CONSTRAINT "commande_garantie_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commande_garantie" ADD CONSTRAINT "commande_garantie_negoceId_fkey" FOREIGN KEY ("negoceId") REFERENCES "negoce"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Reprise des anciennes livraisons de grille : { depart, francoKm, prixAuDela, distances } → dépôts + paliers.
UPDATE "grille_negoce"
SET "livraison" = jsonb_build_object(
  'depots', jsonb_build_array(jsonb_build_object('adresse', "livraison"->>'depart', 'lat', NULL, 'lon', NULL)),
  'paliers', jsonb_build_object(
    'gratuiteJusquaKm', ("livraison"->>'francoKm')::numeric,
    'paliers', jsonb_build_array(jsonb_build_object('jusquaKm', 1000, 'prixHt', ("livraison"->>'prixAuDela')::numeric)),
    'maxKm', 1000),
  'distances', COALESCE("livraison"->'distances', '{}'::jsonb))
WHERE "livraison" IS NOT NULL AND "livraison" ? 'depart';
