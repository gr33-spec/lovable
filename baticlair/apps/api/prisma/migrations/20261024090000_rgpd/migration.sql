-- RGPD (24 octobre 2026) : opposition aux contacts, archive anonyme des commandes, preuves d'acceptation, e-mails coupés.
ALTER TABLE "company" ADD COLUMN IF NOT EXISTS "emailsCoupesLe" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "exclusion_contact" (
    "id" UUID NOT NULL,
    "sorte" TEXT NOT NULL,
    "empreinte" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "exclusion_contact_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "exclusion_contact_sorte_empreinte_key" ON "exclusion_contact"("sorte", "empreinte");

CREATE TABLE IF NOT EXISTS "archive_commande" (
    "id" UUID NOT NULL,
    "sorte" TEXT NOT NULL,
    "mois" TEXT NOT NULL,
    "negoceNom" TEXT NOT NULL,
    "totalHt" DECIMAL(14,2) NOT NULL,
    "commandeLe" TIMESTAMP(3) NOT NULL,
    "artisan" TEXT NOT NULL,
    "archiveLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "archive_commande_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "archive_commande_archiveLe_idx" ON "archive_commande"("archiveLe");

CREATE TABLE IF NOT EXISTS "preuve_acceptation" (
    "id" UUID NOT NULL,
    "sorte" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "accepteLe" TIMESTAMP(3) NOT NULL,
    "email" TEXT NOT NULL,
    "finCompteLe" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "preuve_acceptation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "preuve_acceptation_finCompteLe_idx" ON "preuve_acceptation"("finCompteLe");
