-- La commande commune du mois (décision de Greg, 22 octobre 2026) : cycles, grilles des négoces, choix des artisans.
-- AlterTable
ALTER TABLE "besoin" ADD COLUMN     "cycleId" UUID,
ADD COLUMN     "nature" TEXT;

-- CreateTable
CREATE TABLE "cycle_commande" (
    "id" UUID NOT NULL,
    "numero" SERIAL NOT NULL,
    "mois" TEXT NOT NULL,
    "famille" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "clotureLe" TIMESTAMP(3) NOT NULL,
    "reponseAvant" TIMESTAMP(3) NOT NULL,
    "relanceLe" TIMESTAMP(3) NOT NULL,
    "phase" TEXT NOT NULL DEFAULT 'inscriptions',
    "closLe" TIMESTAMP(3),
    "resultatsLe" TIMESTAMP(3),
    "lignes" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cycle_commande_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grille_negoce" (
    "id" UUID NOT NULL,
    "cycleId" UUID NOT NULL,
    "negoceId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "prix" JSONB NOT NULL DEFAULT '{}',
    "livraison" JSONB,
    "statutExtraction" TEXT NOT NULL DEFAULT 'en_attente',
    "deposeLe" TIMESTAMP(3),
    "relanceLe" TIMESTAMP(3),
    "resultatLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grille_negoce_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grille_negoce_fichier" (
    "id" UUID NOT NULL,
    "grilleId" UUID NOT NULL,
    "nom" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "contenu" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grille_negoce_fichier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "choix_artisan" (
    "id" UUID NOT NULL,
    "cycleId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "negoceId" UUID NOT NULL,
    "totalHt" DECIMAL(14,2) NOT NULL,
    "livraisonHt" DECIMAL(14,2) NOT NULL,
    "commandeLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "choix_artisan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cycle_commande_numero_key" ON "cycle_commande"("numero");

-- CreateIndex
CREATE INDEX "cycle_commande_phase_idx" ON "cycle_commande"("phase");

-- CreateIndex
CREATE UNIQUE INDEX "cycle_commande_mois_famille_zone_key" ON "cycle_commande"("mois", "famille", "zone");

-- CreateIndex
CREATE UNIQUE INDEX "grille_negoce_tokenHash_key" ON "grille_negoce"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "grille_negoce_cycleId_negoceId_key" ON "grille_negoce"("cycleId", "negoceId");

-- CreateIndex
CREATE UNIQUE INDEX "choix_artisan_cycleId_companyId_key" ON "choix_artisan"("cycleId", "companyId");

-- CreateIndex
CREATE INDEX "besoin_cycleId_idx" ON "besoin"("cycleId");

-- AddForeignKey
ALTER TABLE "besoin" ADD CONSTRAINT "besoin_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "cycle_commande"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grille_negoce" ADD CONSTRAINT "grille_negoce_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "cycle_commande"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grille_negoce" ADD CONSTRAINT "grille_negoce_negoceId_fkey" FOREIGN KEY ("negoceId") REFERENCES "negoce"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grille_negoce_fichier" ADD CONSTRAINT "grille_negoce_fichier_grilleId_fkey" FOREIGN KEY ("grilleId") REFERENCES "grille_negoce"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "choix_artisan" ADD CONSTRAINT "choix_artisan_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "cycle_commande"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "choix_artisan" ADD CONSTRAINT "choix_artisan_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "choix_artisan" ADD CONSTRAINT "choix_artisan_negoceId_fkey" FOREIGN KEY ("negoceId") REFERENCES "negoce"("id") ON DELETE CASCADE ON UPDATE CASCADE;

