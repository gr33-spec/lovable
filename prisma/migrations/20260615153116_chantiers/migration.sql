/*
  Warnings:

  - Added the required column `nom` to the `DemandeDevis` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Analysis" ADD COLUMN     "demandeId" TEXT;

-- AlterTable
ALTER TABLE "DemandeDestinataire" ADD COLUMN     "relances" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "DemandeDevis" ADD COLUMN     "lastAnalysisReponses" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "nom" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "SupplierReply" ADD COLUMN     "bodyText" TEXT NOT NULL DEFAULT '';

-- AddForeignKey
ALTER TABLE "Analysis" ADD CONSTRAINT "Analysis_demandeId_fkey" FOREIGN KEY ("demandeId") REFERENCES "DemandeDevis"("id") ON DELETE SET NULL ON UPDATE CASCADE;
