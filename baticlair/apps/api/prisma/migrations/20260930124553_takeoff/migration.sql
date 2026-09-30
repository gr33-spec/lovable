-- CreateEnum
CREATE TYPE "TakeoffStatus" AS ENUM ('draft', 'validated');

-- CreateTable
CREATE TABLE "takeoff" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "analysisId" UUID,
    "trade" TEXT NOT NULL,
    "status" "TakeoffStatus" NOT NULL DEFAULT 'draft',
    "promptId" TEXT NOT NULL,
    "promptVersion" INTEGER NOT NULL,
    "model" TEXT NOT NULL,
    "notes" JSONB NOT NULL DEFAULT '[]',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validatedAt" TIMESTAMP(3),
    "validatedById" TEXT,

    CONSTRAINT "takeoff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "takeoff_line" (
    "id" UUID NOT NULL,
    "takeoffId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "designation" TEXT NOT NULL,
    "quantityRaw" TEXT,
    "unitRaw" TEXT,
    "reference" TEXT,
    "sourceRefs" JSONB NOT NULL DEFAULT '[]',
    "sourcePages" JSONB NOT NULL DEFAULT '[]',
    "origin" TEXT NOT NULL DEFAULT 'ai',
    "edited" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "takeoff_line_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "takeoff_documentId_key" ON "takeoff"("documentId");

-- CreateIndex
CREATE INDEX "takeoff_companyId_projectId_idx" ON "takeoff"("companyId", "projectId");

-- CreateIndex
CREATE INDEX "takeoff_line_takeoffId_position_idx" ON "takeoff_line"("takeoffId", "position");

-- AddForeignKey
ALTER TABLE "takeoff" ADD CONSTRAINT "takeoff_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "takeoff" ADD CONSTRAINT "takeoff_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "takeoff_line" ADD CONSTRAINT "takeoff_line_takeoffId_fkey" FOREIGN KEY ("takeoffId") REFERENCES "takeoff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
