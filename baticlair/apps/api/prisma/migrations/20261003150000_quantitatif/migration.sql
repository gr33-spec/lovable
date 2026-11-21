-- Porte d'entrée /v1/quantitatifs (référentiel §38) : un quantitatif part d'un PDF ou de lignes envoyées
-- par un partenaire (sans document). La version du référentiel est enregistrée avec chaque liste (§27.1.6).
ALTER TABLE "takeoff" ALTER COLUMN "documentId" DROP NOT NULL;
ALTER TABLE "takeoff" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'pdf';
ALTER TABLE "takeoff" ADD COLUMN "referentialVersion" TEXT;
ALTER TABLE "takeoff_line" ADD COLUMN "priceRaw" TEXT;

CREATE TABLE "quantitatif" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "source" TEXT NOT NULL,
    "documentId" UUID,
    "takeoffId" UUID,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "quantitatif_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "quantitatif_companyId_createdAt_idx" ON "quantitatif"("companyId", "createdAt");
ALTER TABLE "quantitatif" ADD CONSTRAINT "quantitatif_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quantitatif" ADD CONSTRAINT "quantitatif_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
