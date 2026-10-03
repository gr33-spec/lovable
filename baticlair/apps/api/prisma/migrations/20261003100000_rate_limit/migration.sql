-- Limitation de débit : compteurs partagés entre les instances de l'API.
CREATE TABLE "rate_limit" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "lastRequest" BIGINT NOT NULL,
    CONSTRAINT "rate_limit_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "rate_limit_key_key" ON "rate_limit"("key");

CREATE TABLE "api_rate_limit" (
    "key" TEXT NOT NULL,
    "hits" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "api_rate_limit_pkey" PRIMARY KEY ("key")
);
CREATE INDEX "api_rate_limit_expiresAt_idx" ON "api_rate_limit"("expiresAt");
