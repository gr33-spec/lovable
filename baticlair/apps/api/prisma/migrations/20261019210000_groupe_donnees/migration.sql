-- Section 5 du parcours groupé : le SIRET vérifié (INSEE) avant tout accès au groupé.
ALTER TABLE "company" ADD COLUMN "siretVerifieLe" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "besoin" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "takeoffId" UUID NOT NULL,
    "articleKey" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "cle" TEXT NOT NULL,
    "famille" TEXT NOT NULL,
    "quantite" DECIMAL(14,3) NOT NULL,
    "unite" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "adresseLivraison" TEXT NOT NULL,
    "fenetreTot" DATE NOT NULL,
    "fenetreTard" DATE NOT NULL,
    "statut" TEXT NOT NULL,
    "lotId" UUID,
    "signeLe" TIMESTAMP(3),
    "engageLe" TIMESTAMP(3),
    "retireLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "besoin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "negoce" (
    "id" UUID NOT NULL,
    "nom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "departement" TEXT NOT NULL,
    "familles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "stopLe" TIMESTAMP(3),
    "ajouteParId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "negoce_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "negoce_artisan" (
    "companyId" UUID NOT NULL,
    "negoceId" UUID NOT NULL,
    "rang" INTEGER NOT NULL DEFAULT 1,
    "numeroCompte" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "negoce_artisan_pkey" PRIMARY KEY ("companyId","negoceId")
);

-- CreateTable
CREATE TABLE "lot_groupe" (
    "id" UUID NOT NULL,
    "numero" SERIAL NOT NULL,
    "cle" TEXT NOT NULL,
    "famille" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "fenetreTot" DATE NOT NULL,
    "fenetreTard" DATE NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'ouvert',
    "envoyeLe" TIMESTAMP(3),
    "clotureLe" TIMESTAMP(3),
    "negoceRetenuId" UUID,
    "prixRetenu" DECIMAL(14,4),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lot_groupe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reponse_negoce" (
    "id" UUID NOT NULL,
    "lotId" UUID NOT NULL,
    "negoceId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "message" TEXT,
    "prix" JSONB NOT NULL DEFAULT '[]',
    "delaiJours" INTEGER,
    "statutExtraction" TEXT NOT NULL DEFAULT 'en_attente',
    "pasConcerneLe" TIMESTAMP(3),
    "deposeLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reponse_negoce_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reponse_negoce_fichier" (
    "id" UUID NOT NULL,
    "reponseId" UUID NOT NULL,
    "nom" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "contenu" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reponse_negoce_fichier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offre_artisan" (
    "id" UUID NOT NULL,
    "lotId" UUID NOT NULL,
    "besoinId" UUID NOT NULL,
    "prixUnitaire" DECIMAL(14,4) NOT NULL,
    "prixReference" DECIMAL(14,4),
    "economie" DECIMAL(14,2),
    "dateLivraison" DATE,
    "envoyeeLe" TIMESTAMP(3),
    "problemeLe" TIMESTAMP(3),
    "probleme" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offre_artisan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bon_commande" (
    "id" UUID NOT NULL,
    "offreId" UUID NOT NULL,
    "negoceId" UUID NOT NULL,
    "pdf" BYTEA,
    "envoyeLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bon_commande_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "livraison" (
    "id" UUID NOT NULL,
    "bonId" UUID NOT NULL,
    "datePrevue" DATE,
    "statut" TEXT NOT NULL DEFAULT 'prevue',
    "confirmeLe" TIMESTAMP(3),
    "relanceLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "livraison_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_groupe" (
    "id" UUID NOT NULL,
    "lotId" UUID NOT NULL,
    "evenement" TEXT NOT NULL,
    "details" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_groupe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "besoin_cle_zone_statut_idx" ON "besoin"("cle", "zone", "statut");

-- CreateIndex
CREATE INDEX "besoin_companyId_createdAt_idx" ON "besoin"("companyId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "besoin_takeoffId_articleKey_key" ON "besoin"("takeoffId", "articleKey");

-- CreateIndex
CREATE INDEX "negoce_departement_idx" ON "negoce"("departement");

-- CreateIndex
CREATE UNIQUE INDEX "negoce_email_departement_key" ON "negoce"("email", "departement");

-- CreateIndex
CREATE UNIQUE INDEX "lot_groupe_numero_key" ON "lot_groupe"("numero");

-- CreateIndex
CREATE INDEX "lot_groupe_cle_zone_statut_idx" ON "lot_groupe"("cle", "zone", "statut");

-- CreateIndex
CREATE UNIQUE INDEX "reponse_negoce_tokenHash_key" ON "reponse_negoce"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "reponse_negoce_lotId_negoceId_key" ON "reponse_negoce"("lotId", "negoceId");

-- CreateIndex
CREATE UNIQUE INDEX "offre_artisan_besoinId_key" ON "offre_artisan"("besoinId");

-- CreateIndex
CREATE UNIQUE INDEX "bon_commande_offreId_key" ON "bon_commande"("offreId");

-- CreateIndex
CREATE UNIQUE INDEX "livraison_bonId_key" ON "livraison"("bonId");

-- CreateIndex
CREATE INDEX "journal_groupe_lotId_createdAt_idx" ON "journal_groupe"("lotId", "createdAt");

-- AddForeignKey
ALTER TABLE "besoin" ADD CONSTRAINT "besoin_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "besoin" ADD CONSTRAINT "besoin_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "besoin" ADD CONSTRAINT "besoin_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "lot_groupe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "negoce" ADD CONSTRAINT "negoce_ajouteParId_fkey" FOREIGN KEY ("ajouteParId") REFERENCES "company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "negoce_artisan" ADD CONSTRAINT "negoce_artisan_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "negoce_artisan" ADD CONSTRAINT "negoce_artisan_negoceId_fkey" FOREIGN KEY ("negoceId") REFERENCES "negoce"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lot_groupe" ADD CONSTRAINT "lot_groupe_negoceRetenuId_fkey" FOREIGN KEY ("negoceRetenuId") REFERENCES "negoce"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reponse_negoce" ADD CONSTRAINT "reponse_negoce_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "lot_groupe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reponse_negoce" ADD CONSTRAINT "reponse_negoce_negoceId_fkey" FOREIGN KEY ("negoceId") REFERENCES "negoce"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reponse_negoce_fichier" ADD CONSTRAINT "reponse_negoce_fichier_reponseId_fkey" FOREIGN KEY ("reponseId") REFERENCES "reponse_negoce"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offre_artisan" ADD CONSTRAINT "offre_artisan_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "lot_groupe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offre_artisan" ADD CONSTRAINT "offre_artisan_besoinId_fkey" FOREIGN KEY ("besoinId") REFERENCES "besoin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bon_commande" ADD CONSTRAINT "bon_commande_offreId_fkey" FOREIGN KEY ("offreId") REFERENCES "offre_artisan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bon_commande" ADD CONSTRAINT "bon_commande_negoceId_fkey" FOREIGN KEY ("negoceId") REFERENCES "negoce"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "livraison" ADD CONSTRAINT "livraison_bonId_fkey" FOREIGN KEY ("bonId") REFERENCES "bon_commande"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_groupe" ADD CONSTRAINT "journal_groupe_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "lot_groupe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- §5 : un seul lot OUVERT par référence et par zone à la fois (Prisma ne décrit pas un index partiel).
CREATE UNIQUE INDEX "lot_groupe_un_ouvert_par_cle_zone" ON "lot_groupe"("cle", "zone") WHERE "statut" = 'ouvert';

-- Décision du fondateur (2026-10-20) : l'accord du négoce (commission de 2 % du HT du lot s'il est retenu) et sa facture au bon de commande.
-- CreateTable
CREATE TABLE "accord_negoce" (
    "id" UUID NOT NULL,
    "lotId" UUID NOT NULL,
    "negoceId" UUID NOT NULL,
    "versionContrat" TEXT NOT NULL,
    "tauxPourcent" DECIMAL(5,2) NOT NULL,
    "email" TEXT NOT NULL,
    "adresseIp" TEXT NOT NULL,
    "accepteLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accord_negoce_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facture_negoce" (
    "id" UUID NOT NULL,
    "lotId" UUID NOT NULL,
    "negoceId" UUID NOT NULL,
    "accordId" UUID NOT NULL,
    "numero" SERIAL NOT NULL,
    "totalLotHt" DECIMAL(14,2) NOT NULL,
    "montantHt" DECIMAL(14,2) NOT NULL,
    "pdf" BYTEA,
    "emiseLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "echeanceLe" DATE NOT NULL,
    "envoyeeLe" TIMESTAMP(3),
    "relanceeLe" TIMESTAMP(3),
    "payeeLe" TIMESTAMP(3),
    "statut" TEXT NOT NULL DEFAULT 'emise',

    CONSTRAINT "facture_negoce_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accord_negoce_lotId_negoceId_key" ON "accord_negoce"("lotId", "negoceId");

-- CreateIndex
CREATE UNIQUE INDEX "facture_negoce_lotId_key" ON "facture_negoce"("lotId");

-- CreateIndex
CREATE UNIQUE INDEX "facture_negoce_accordId_key" ON "facture_negoce"("accordId");

-- CreateIndex
CREATE UNIQUE INDEX "facture_negoce_numero_key" ON "facture_negoce"("numero");

-- CreateIndex
CREATE INDEX "facture_negoce_negoceId_statut_idx" ON "facture_negoce"("negoceId", "statut");

-- AddForeignKey
ALTER TABLE "accord_negoce" ADD CONSTRAINT "accord_negoce_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "lot_groupe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accord_negoce" ADD CONSTRAINT "accord_negoce_negoceId_fkey" FOREIGN KEY ("negoceId") REFERENCES "negoce"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facture_negoce" ADD CONSTRAINT "facture_negoce_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "lot_groupe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facture_negoce" ADD CONSTRAINT "facture_negoce_negoceId_fkey" FOREIGN KEY ("negoceId") REFERENCES "negoce"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facture_negoce" ADD CONSTRAINT "facture_negoce_accordId_fkey" FOREIGN KEY ("accordId") REFERENCES "accord_negoce"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


