-- AlterTable
ALTER TABLE "compte_negoce" ADD COLUMN     "emailConfirmeLe" TIMESTAMP(3),
ADD COLUMN     "naf" TEXT,
ADD COLUMN     "raisonSociale" TEXT,
ADD COLUMN     "valideParAdminLe" TIMESTAMP(3),
ADD COLUMN     "verification" TEXT;

-- AlterTable
ALTER TABLE "supplier" ADD COLUMN     "prevenuLe" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "regroupement_negocie" (
    "id" UUID NOT NULL,
    "numero" SERIAL NOT NULL,
    "cle" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "famille" TEXT NOT NULL,
    "departement" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'en_collecte',
    "dateBesoinMin" DATE,
    "chasseurEmail" TEXT,
    "prisEnChargeLe" TIMESTAMP(3),
    "offreEnvoyeeLe" TIMESTAMP(3),
    "commandeLe" TIMESTAMP(3),
    "abandonneLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regroupement_negocie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "besoin_negocie" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "projectId" UUID,
    "articleKey" TEXT,
    "priceRequestId" UUID,
    "designation" TEXT NOT NULL,
    "cle" TEXT NOT NULL,
    "famille" TEXT NOT NULL,
    "quantite" DECIMAL(14,3) NOT NULL,
    "unite" TEXT NOT NULL,
    "departement" TEXT NOT NULL,
    "livraison" TEXT NOT NULL,
    "dateBesoin" DATE NOT NULL,
    "statut" TEXT NOT NULL,
    "regroupementId" UUID,
    "notifieLe" TIMESTAMP(3),
    "accepteLe" TIMESTAMP(3),
    "refuseLe" TIMESTAMP(3),
    "bonNumero" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "besoin_negocie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offre_negociee" (
    "id" UUID NOT NULL,
    "regroupementId" UUID NOT NULL,
    "negoceNom" TEXT NOT NULL,
    "negoceEmail" TEXT NOT NULL,
    "negoceTelephone" TEXT,
    "prixNegocieHt" DECIMAL(14,4) NOT NULL,
    "commissionPct" DECIMAL(5,2) NOT NULL,
    "prixAfficheHt" DECIMAL(14,4) NOT NULL,
    "livraisonHt" DECIMAL(14,2) NOT NULL,
    "conditions" TEXT,
    "valideJusquau" DATE NOT NULL,
    "saisieParEmail" TEXT NOT NULL,
    "envoyeeLe" TIMESTAMP(3),
    "transmiseLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offre_negociee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appel_chasseur" (
    "id" UUID NOT NULL,
    "regroupementId" UUID NOT NULL,
    "negoce" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "parEmail" TEXT NOT NULL,
    "le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appel_chasseur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "observations_prix" (
    "id" UUID NOT NULL,
    "article" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "prixUnitaireHt" DECIMAL(14,4) NOT NULL,
    "quantite" DECIMAL(14,3),
    "unite" TEXT NOT NULL,
    "palier" TEXT,
    "departement" TEXT NOT NULL,
    "le" DATE NOT NULL,
    "type" TEXT NOT NULL,
    "source" TEXT NOT NULL,

    CONSTRAINT "observations_prix_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "regroupement_negocie_numero_key" ON "regroupement_negocie"("numero");

-- CreateIndex
CREATE INDEX "regroupement_negocie_departement_cle_statut_idx" ON "regroupement_negocie"("departement", "cle", "statut");

-- CreateIndex
CREATE INDEX "besoin_negocie_companyId_statut_idx" ON "besoin_negocie"("companyId", "statut");

-- CreateIndex
CREATE INDEX "besoin_negocie_departement_cle_statut_idx" ON "besoin_negocie"("departement", "cle", "statut");

-- CreateIndex
CREATE INDEX "besoin_negocie_regroupementId_idx" ON "besoin_negocie"("regroupementId");

-- CreateIndex
CREATE UNIQUE INDEX "offre_negociee_regroupementId_key" ON "offre_negociee"("regroupementId");

-- CreateIndex
CREATE INDEX "appel_chasseur_regroupementId_le_idx" ON "appel_chasseur"("regroupementId", "le");

-- CreateIndex
CREATE INDEX "observations_prix_article_departement_le_idx" ON "observations_prix"("article", "departement", "le");

-- CreateIndex
CREATE UNIQUE INDEX "observations_prix_source_article_key" ON "observations_prix"("source", "article");

-- AddForeignKey
ALTER TABLE "besoin_negocie" ADD CONSTRAINT "besoin_negocie_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "besoin_negocie" ADD CONSTRAINT "besoin_negocie_regroupementId_fkey" FOREIGN KEY ("regroupementId") REFERENCES "regroupement_negocie"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offre_negociee" ADD CONSTRAINT "offre_negociee_regroupementId_fkey" FOREIGN KEY ("regroupementId") REFERENCES "regroupement_negocie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appel_chasseur" ADD CONSTRAINT "appel_chasseur_regroupementId_fkey" FOREIGN KEY ("regroupementId") REFERENCES "regroupement_negocie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

