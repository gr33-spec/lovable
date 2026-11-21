-- CreateEnum
CREATE TYPE "RecipientStatus" AS ENUM ('to_send', 'sent', 'received', 'declined');

-- CreateTable
CREATE TABLE "supplier" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "notes" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_request" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "takeoffId" UUID NOT NULL,
    "lines" JSONB NOT NULL,
    "message" TEXT,
    "dueDate" DATE,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_request_recipient" (
    "id" UUID NOT NULL,
    "priceRequestId" UUID NOT NULL,
    "supplierId" UUID NOT NULL,
    "status" "RecipientStatus" NOT NULL DEFAULT 'to_send',
    "sentAt" TIMESTAMP(3),
    "documentId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_request_recipient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "supplier_companyId_archivedAt_name_idx" ON "supplier"("companyId", "archivedAt", "name");

-- CreateIndex
CREATE INDEX "price_request_companyId_projectId_createdAt_idx" ON "price_request"("companyId", "projectId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "price_request_recipient_documentId_key" ON "price_request_recipient"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "price_request_recipient_priceRequestId_supplierId_key" ON "price_request_recipient"("priceRequestId", "supplierId");

-- AddForeignKey
ALTER TABLE "supplier" ADD CONSTRAINT "supplier_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_request" ADD CONSTRAINT "price_request_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_request" ADD CONSTRAINT "price_request_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_request_recipient" ADD CONSTRAINT "price_request_recipient_priceRequestId_fkey" FOREIGN KEY ("priceRequestId") REFERENCES "price_request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_request_recipient" ADD CONSTRAINT "price_request_recipient_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_request_recipient" ADD CONSTRAINT "price_request_recipient_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
