-- CreateEnum
CREATE TYPE "DocumentPurpose" AS ENUM ('client_quote', 'supplier_quote');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('stored', 'read', 'failed');

-- CreateEnum
CREATE TYPE "ProcessingStatus" AS ENUM ('processing', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "PageRoute" AS ENUM ('text', 'vision', 'skip');

-- CreateEnum
CREATE TYPE "AiExecutionStatus" AS ENUM ('success', 'invalid_output', 'refused', 'provider_error', 'timeout');

-- CreateTable
CREATE TABLE "document" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "purpose" "DocumentPurpose" NOT NULL,
    "trade" TEXT NOT NULL DEFAULT 'roofing',
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "pageCount" INTEGER,
    "status" "DocumentStatus" NOT NULL DEFAULT 'stored',
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_blob" (
    "documentId" UUID NOT NULL,
    "bytes" BYTEA NOT NULL,

    CONSTRAINT "document_blob_pkey" PRIMARY KEY ("documentId")
);

-- CreateTable
CREATE TABLE "document_processing" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "pipelineVersion" TEXT NOT NULL,
    "status" "ProcessingStatus" NOT NULL,
    "errorCode" TEXT,
    "pagesTotal" INTEGER NOT NULL DEFAULT 0,
    "pagesText" INTEGER NOT NULL DEFAULT 0,
    "pagesVision" INTEGER NOT NULL DEFAULT 0,
    "pagesSkipped" INTEGER NOT NULL DEFAULT 0,
    "estimatedMicroUsd" BIGINT NOT NULL DEFAULT 0,
    "estimate" JSONB,
    "actualMicroUsd" BIGINT NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "document_processing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_page" (
    "processingId" UUID NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "route" "PageRoute" NOT NULL,
    "reason" TEXT NOT NULL,
    "widthPt" DECIMAL(9,2) NOT NULL,
    "heightPt" DECIMAL(9,2) NOT NULL,
    "chars" INTEGER NOT NULL,
    "metrics" JSONB NOT NULL,
    "lines" JSONB NOT NULL,

    CONSTRAINT "document_page_pkey" PRIMARY KEY ("processingId","pageNumber")
);

-- CreateTable
CREATE TABLE "ai_execution" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "projectId" UUID,
    "documentId" UUID,
    "processingId" UUID,
    "task" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "promptVersion" INTEGER NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "pagesText" INTEGER NOT NULL DEFAULT 0,
    "pagesVision" INTEGER NOT NULL DEFAULT 0,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "cacheReadTokens" INTEGER NOT NULL DEFAULT 0,
    "cacheWrite5mTokens" INTEGER NOT NULL DEFAULT 0,
    "cacheWrite1hTokens" INTEGER NOT NULL DEFAULT 0,
    "batch" BOOLEAN NOT NULL DEFAULT false,
    "costMicroUsd" BIGINT NOT NULL,
    "priceTableVersion" TEXT NOT NULL,
    "status" "AiExecutionStatus" NOT NULL,
    "errorCode" TEXT,
    "durationMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_execution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "document_companyId_sha256_idx" ON "document"("companyId", "sha256");

-- CreateIndex
CREATE INDEX "document_projectId_createdAt_idx" ON "document"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "document_processing_documentId_startedAt_idx" ON "document_processing"("documentId", "startedAt" DESC);

-- CreateIndex
CREATE INDEX "ai_execution_companyId_createdAt_idx" ON "ai_execution"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "ai_execution_projectId_idx" ON "ai_execution"("projectId");

-- CreateIndex
CREATE INDEX "ai_execution_documentId_idx" ON "ai_execution"("documentId");

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "document_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "document_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_blob" ADD CONSTRAINT "document_blob_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_processing" ADD CONSTRAINT "document_processing_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_page" ADD CONSTRAINT "document_page_processingId_fkey" FOREIGN KEY ("processingId") REFERENCES "document_processing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_execution" ADD CONSTRAINT "ai_execution_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_execution" ADD CONSTRAINT "ai_execution_processingId_fkey" FOREIGN KEY ("processingId") REFERENCES "document_processing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
