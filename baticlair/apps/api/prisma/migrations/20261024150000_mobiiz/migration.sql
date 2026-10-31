-- CreateTable
CREATE TABLE "abonnement" (
    "companyId" UUID NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'aucun',
    "fournisseur" TEXT NOT NULL,
    "periodeDebut" TIMESTAMP(3),
    "periodeFin" TIMESTAMP(3),
    "echecLe" TIMESTAMP(3),
    "resiliationDemandeeLe" TIMESTAMP(3),
    "resilieLe" TIMESTAMP(3),
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "tvaIntra" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "abonnement_pkey" PRIMARY KEY ("companyId")
);

-- CreateTable
CREATE TABLE "evenement_abonnement" (
    "id" UUID NOT NULL,
    "companyId" UUID,
    "type" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "refExterne" TEXT,
    "donnees" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evenement_abonnement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facture_abonnement" (
    "id" UUID NOT NULL,
    "numero" TEXT NOT NULL,
    "serie" TEXT NOT NULL,
    "rang" INTEGER NOT NULL,
    "companyId" UUID,
    "raisonSociale" TEXT NOT NULL,
    "siret" TEXT,
    "adresse" TEXT,
    "tvaIntra" TEXT,
    "periodeDebut" TIMESTAMP(3) NOT NULL,
    "periodeFin" TIMESTAMP(3) NOT NULL,
    "montantHtCentimes" INTEGER NOT NULL,
    "tvaCentimes" INTEGER NOT NULL,
    "ttcCentimes" INTEGER NOT NULL,
    "tauxTva" DECIMAL(5,2) NOT NULL,
    "emiseLe" TIMESTAMP(3) NOT NULL,
    "refExterne" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "facture_abonnement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compteur_facture" (
    "serie" TEXT NOT NULL,
    "dernier" INTEGER NOT NULL,

    CONSTRAINT "compteur_facture_pkey" PRIMARY KEY ("serie")
);

-- CreateTable
CREATE TABLE "regle_apprise" (
    "id" UUID NOT NULL,
    "portee" TEXT NOT NULL,
    "proprietaire" TEXT NOT NULL,
    "companyId" UUID,
    "metier" TEXT NOT NULL,
    "cle" TEXT NOT NULL,
    "champ" TEXT NOT NULL,
    "valeur" TEXT NOT NULL,
    "statut" TEXT NOT NULL,
    "occurrences" JSONB NOT NULL DEFAULT '[]',
    "decideLe" TIMESTAMP(3),
    "decidePar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regle_apprise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_admin" (
    "id" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "cible" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "code_admin" (
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expireLe" TIMESTAMP(3) NOT NULL,
    "tentatives" INTEGER NOT NULL DEFAULT 0,
    "valideLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "code_admin_pkey" PRIMARY KEY ("sessionId")
);

-- CreateTable
CREATE TABLE "compteur_jour" (
    "jour" TEXT NOT NULL,
    "cle" TEXT NOT NULL,
    "n" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "compteur_jour_pkey" PRIMARY KEY ("jour","cle")
);

-- CreateIndex
CREATE UNIQUE INDEX "abonnement_stripeCustomerId_key" ON "abonnement"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "abonnement_stripeSubscriptionId_key" ON "abonnement"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "abonnement_statut_periodeFin_idx" ON "abonnement"("statut", "periodeFin");

-- CreateIndex
CREATE UNIQUE INDEX "evenement_abonnement_refExterne_key" ON "evenement_abonnement"("refExterne");

-- CreateIndex
CREATE INDEX "evenement_abonnement_companyId_type_idx" ON "evenement_abonnement"("companyId", "type");

-- CreateIndex
CREATE INDEX "evenement_abonnement_type_createdAt_idx" ON "evenement_abonnement"("type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "facture_abonnement_numero_key" ON "facture_abonnement"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "facture_abonnement_refExterne_key" ON "facture_abonnement"("refExterne");

-- CreateIndex
CREATE INDEX "facture_abonnement_companyId_emiseLe_idx" ON "facture_abonnement"("companyId", "emiseLe");

-- CreateIndex
CREATE UNIQUE INDEX "facture_abonnement_serie_rang_key" ON "facture_abonnement"("serie", "rang");

-- CreateIndex
CREATE INDEX "regle_apprise_portee_statut_idx" ON "regle_apprise"("portee", "statut");

-- CreateIndex
CREATE INDEX "regle_apprise_companyId_statut_idx" ON "regle_apprise"("companyId", "statut");

-- CreateIndex
CREATE UNIQUE INDEX "regle_apprise_portee_proprietaire_metier_cle_champ_valeur_key" ON "regle_apprise"("portee", "proprietaire", "metier", "cle", "champ", "valeur");

-- CreateIndex
CREATE INDEX "journal_admin_createdAt_idx" ON "journal_admin"("createdAt");

-- AddForeignKey
ALTER TABLE "abonnement" ADD CONSTRAINT "abonnement_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facture_abonnement" ADD CONSTRAINT "facture_abonnement_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regle_apprise" ADD CONSTRAINT "regle_apprise_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

