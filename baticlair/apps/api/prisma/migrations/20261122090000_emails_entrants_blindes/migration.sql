-- Les e-mails entrants blindés (Greg, 22 novembre 2026) : migration additive.
ALTER TABLE "email_recu_artisan" ADD COLUMN "indesirable" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "email_recu_artisan" ADD COLUMN "indesirable_par" TEXT;
ALTER TABLE "email_recu_artisan" ADD COLUMN "raisons" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "email_recu_artisan" ADD COLUMN "authentifie" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "email_recu_artisan" ADD COLUMN "pieces_bloquees" TEXT[] DEFAULT ARRAY[]::TEXT[];

CREATE TABLE "email_entrant" (
    "id" UUID NOT NULL,
    "adresse" TEXT NOT NULL,
    "company_id" UUID,
    "de" TEXT NOT NULL,
    "objet" TEXT NOT NULL,
    "suspect" BOOLEAN NOT NULL,
    "raisons" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pieces_bloquees" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "spf" TEXT,
    "dkim" TEXT,
    "dmarc" TEXT,
    "email_id" TEXT,
    "recu_le" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "email_entrant_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "email_entrant_adresse_recu_le_idx" ON "email_entrant"("adresse", "recu_le");
CREATE INDEX "email_entrant_suspect_recu_le_idx" ON "email_entrant"("suspect", "recu_le");

-- Retour arrière : DROP TABLE "email_entrant"; ALTER TABLE "email_recu_artisan" DROP COLUMN "pieces_bloquees", DROP COLUMN "authentifie", DROP COLUMN "raisons", DROP COLUMN "indesirable_par", DROP COLUMN "indesirable";
