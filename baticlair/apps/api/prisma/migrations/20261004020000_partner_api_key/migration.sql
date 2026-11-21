-- Clé API partenaire avec quota mensuel (plan v3 §1) : une clé par intégration, hachée, rattachée à une entreprise.
CREATE TABLE "partner_api_key" (
  "id" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "createdById" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "prefix" TEXT NOT NULL,
  "hash" TEXT NOT NULL,
  "monthlyQuota" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "partner_api_key_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "partner_api_key_hash_key" ON "partner_api_key"("hash");
CREATE INDEX "partner_api_key_companyId_idx" ON "partner_api_key"("companyId");
ALTER TABLE "partner_api_key" ADD CONSTRAINT "partner_api_key_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "quantitatif" ADD COLUMN "apiKeyId" UUID;
