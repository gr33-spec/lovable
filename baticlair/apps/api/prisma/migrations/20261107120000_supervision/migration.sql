-- Additive (lot 6, 6 novembre 2026). Retour arrière : DROP TABLE "famille_materiau"; DROP TABLE "exception_supervision";
-- CreateTable
CREATE TABLE "famille_materiau" (
    "code" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "famille_materiau_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "exception_supervision" (
    "id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "gravite" INTEGER NOT NULL DEFAULT 1,
    "cle" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "detail" TEXT,
    "lien" TEXT,
    "company_id" UUID,
    "statut" TEXT NOT NULL DEFAULT 'ouverte',
    "occurrences" INTEGER NOT NULL DEFAULT 1,
    "dernier_le" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolu_le" TIMESTAMPTZ(3),
    "resolu_par" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exception_supervision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exception_supervision_cle_key" ON "exception_supervision"("cle");

-- CreateIndex
CREATE INDEX "exception_supervision_statut_gravite_idx" ON "exception_supervision"("statut", "gravite");
