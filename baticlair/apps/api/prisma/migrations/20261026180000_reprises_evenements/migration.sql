-- CreateTable
CREATE TABLE "reprise" (
    "id" UUID NOT NULL,
    "sorte" TEXT NOT NULL,
    "cle" TEXT NOT NULL,
    "charge" JSONB NOT NULL,
    "etat" TEXT NOT NULL DEFAULT 'en_attente',
    "tentatives" INTEGER NOT NULL DEFAULT 0,
    "prochaine_le" TIMESTAMPTZ(3) NOT NULL,
    "derniere_erreur" TEXT,
    "company_id" UUID,
    "fini_le" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "reprise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evenement_traite" (
    "source" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "recu_le" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evenement_traite_pkey" PRIMARY KEY ("source","id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reprise_cle_key" ON "reprise"("cle");

-- CreateIndex
CREATE INDEX "reprise_etat_prochaine_le_idx" ON "reprise"("etat", "prochaine_le");

-- CreateIndex
CREATE INDEX "reprise_company_id_idx" ON "reprise"("company_id");

-- CreateIndex
CREATE INDEX "evenement_traite_recu_le_idx" ON "evenement_traite"("recu_le");

