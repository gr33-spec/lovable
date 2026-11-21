-- AlterTable
ALTER TABLE "price_request" ADD COLUMN     "classifiedAt" TIMESTAMP(3),
ADD COLUMN     "retainedSupplierIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "supplier_offer" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "analysisId" UUID,
    "promptId" TEXT NOT NULL,
    "promptVersion" INTEGER NOT NULL,
    "model" TEXT NOT NULL,
    "totalHT" TEXT,
    "totalVAT" TEXT,
    "totalTTC" TEXT,
    "globalDiscountRate" TEXT,
    "globalDiscountAmount" TEXT,
    "deliveryIncluded" BOOLEAN,
    "notes" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_offer_line" (
    "id" UUID NOT NULL,
    "offerId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "reference" TEXT,
    "quantityRaw" TEXT,
    "unitRaw" TEXT,
    "unitPrice" TEXT,
    "discountRate" TEXT,
    "lineTotal" TEXT,
    "packagingQuantity" TEXT,
    "packagingUnit" TEXT,
    "requestIndex" INTEGER,
    "matchConfidence" TEXT,
    "matchConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "aiDoubt" TEXT,
    "sourceRefs" JSONB NOT NULL DEFAULT '[]',
    "edited" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_offer_line_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "supplier_offer_documentId_key" ON "supplier_offer"("documentId");

-- CreateIndex
CREATE INDEX "supplier_offer_line_offerId_position_idx" ON "supplier_offer_line"("offerId", "position");

-- AddForeignKey
ALTER TABLE "supplier_offer" ADD CONSTRAINT "supplier_offer_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_offer" ADD CONSTRAINT "supplier_offer_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_offer_line" ADD CONSTRAINT "supplier_offer_line_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "supplier_offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
