-- §47.4 : confirmations « C'est bon » d'une règle « à vérifier », une par entreprise ; trois entreprises la valident.
CREATE TABLE "rule_confirmation" (
    "companyId" UUID NOT NULL,
    "ruleKey" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rule_confirmation_pkey" PRIMARY KEY ("companyId","ruleKey")
);

CREATE INDEX "rule_confirmation_ruleKey_idx" ON "rule_confirmation"("ruleKey");

ALTER TABLE "rule_confirmation" ADD CONSTRAINT "rule_confirmation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
