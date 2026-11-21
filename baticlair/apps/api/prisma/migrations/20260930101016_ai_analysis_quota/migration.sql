-- CreateEnum
CREATE TYPE "AiAnalysisStatus" AS ENUM ('started', 'completed', 'failed');

-- AlterTable
ALTER TABLE "ai_execution" ADD COLUMN     "analysisId" UUID,
ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "company" ADD COLUMN     "monthlyAnalysisLimit" INTEGER;

-- CreateTable
CREATE TABLE "ai_analysis" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "userId" TEXT,
    "projectId" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "kind" "DocumentPurpose" NOT NULL,
    "status" "AiAnalysisStatus" NOT NULL,
    "billable" BOOLEAN NOT NULL DEFAULT false,
    "billingMonth" TEXT,
    "costMicroUsd" BIGINT NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ai_analysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_analysis_documentId_key" ON "ai_analysis"("documentId");

-- CreateIndex
CREATE INDEX "ai_analysis_companyId_billingMonth_idx" ON "ai_analysis"("companyId", "billingMonth");

-- CreateIndex
CREATE INDEX "ai_analysis_companyId_userId_billingMonth_idx" ON "ai_analysis"("companyId", "userId", "billingMonth");

-- CreateIndex
CREATE INDEX "ai_execution_analysisId_idx" ON "ai_execution"("analysisId");

-- AddForeignKey
ALTER TABLE "ai_analysis" ADD CONSTRAINT "ai_analysis_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
