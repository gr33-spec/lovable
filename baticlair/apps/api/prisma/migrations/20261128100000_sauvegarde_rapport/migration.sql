-- La sauvegarde nocturne dit son résultat à Mobiiz (Greg, 28 novembre 2026) : alerte en cas d'échec, carte « Santé ». Migration additive.
CREATE TABLE "sauvegarde_rapport" (
    "id" UUID NOT NULL,
    "recu_le" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statut" TEXT NOT NULL,
    "essai" BOOLEAN NOT NULL DEFAULT false,
    "etape" TEXT,
    "run_id" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "tables" INTEGER,
    "lignes" INTEGER,
    "octets" INTEGER,
    CONSTRAINT "sauvegarde_rapport_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "sauvegarde_rapport_essai_recu_le_idx" ON "sauvegarde_rapport"("essai", "recu_le");

-- Retour arrière : DROP TABLE "sauvegarde_rapport";
