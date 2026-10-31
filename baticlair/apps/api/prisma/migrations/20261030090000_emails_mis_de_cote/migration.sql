-- Correction après test de Greg (30 octobre 2026) : les e-mails reçus sur une adresse Mobiiz inconnue sont mis de côté.
CREATE TABLE "email_mis_de_cote" (
    "id" UUID NOT NULL,
    "adresse" TEXT NOT NULL,
    "de" TEXT NOT NULL,
    "objet" TEXT NOT NULL,
    "texte" TEXT,
    "email_id" TEXT,
    "pieces" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "recu_le" TIMESTAMPTZ(3) NOT NULL,
    "rattache_le" TIMESTAMPTZ(3),
    "company_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "email_mis_de_cote_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "email_mis_de_cote_rattache_le_idx" ON "email_mis_de_cote"("rattache_le");
