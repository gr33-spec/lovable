-- Signalement de bugs (Greg, 13 novembre 2026) : une table NOUVELLE, rien de l'existant n'est modifié.
-- Retour arrière :
--   DROP TABLE "signalement";
CREATE TABLE "signalement" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statut" TEXT NOT NULL DEFAULT 'nouveau',
    "origine" TEXT NOT NULL,
    "page" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "email" TEXT,
    "companyId" UUID,
    "userId" TEXT,
    "contexte" TEXT,
    "capture" BYTEA,
    "captureType" TEXT,
    "resume" TEXT,
    "gravite" TEXT,
    "correctionValidee" TIMESTAMP(3),
    "corrigeLe" TIMESTAMP(3),
    "mailCorrigeLe" TIMESTAMP(3),

    CONSTRAINT "signalement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "signalement_statut_createdAt_idx" ON "signalement"("statut", "createdAt");
