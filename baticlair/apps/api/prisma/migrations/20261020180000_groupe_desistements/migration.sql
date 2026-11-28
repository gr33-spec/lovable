-- CreateTable (désistements, à part : décision du fondateur, 2026-10-20)
CREATE TABLE "desistement" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "lotId" UUID NOT NULL,
    "bonId" UUID NOT NULL,
    "raison" TEXT,
    "sanction" TEXT NOT NULL,
    "excluJusquau" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "desistement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "desistement_companyId_createdAt_idx" ON "desistement"("companyId", "createdAt");

-- AddForeignKey
ALTER TABLE "desistement" ADD CONSTRAINT "desistement_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "desistement" ADD CONSTRAINT "desistement_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "lot_groupe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
