-- Mémoire de l'entreprise et journal des corrections (PD-045).

-- CreateTable
CREATE TABLE "company_preference" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "explicit" BOOLEAN NOT NULL DEFAULT false,
    "confirmations" JSONB NOT NULL DEFAULT '[]',
    "lastContradictedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_preference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "correction_event" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "projectId" UUID,
    "takeoffId" UUID,
    "takeoffLineId" UUID,
    "action" TEXT NOT NULL,
    "cause" TEXT,
    "reason" TEXT,
    "before" JSONB,
    "after" JSONB,
    "documentExcerpt" JSONB NOT NULL DEFAULT '[]',
    "context" JSONB NOT NULL DEFAULT '{}',
    "patternKey" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "correction_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "company_preference_companyId_kind_key_idx" ON "company_preference"("companyId", "kind", "key");

-- CreateIndex
CREATE INDEX "correction_event_companyId_createdAt_idx" ON "correction_event"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "correction_event_patternKey_idx" ON "correction_event"("patternKey");

-- AddForeignKey
ALTER TABLE "company_preference" ADD CONSTRAINT "company_preference_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "correction_event" ADD CONSTRAINT "correction_event_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
