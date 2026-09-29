-- DropIndex
DROP INDEX "project_companyId_status_updatedAt_idx";

-- AlterTable
ALTER TABLE "project" ADD COLUMN     "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "idempotency_record" (
    "id" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "responseStatus" INTEGER,
    "responseBody" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_record_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idempotency_record_createdAt_idx" ON "idempotency_record"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_record_userId_key_key" ON "idempotency_record"("userId", "key");

-- CreateIndex
CREATE INDEX "project_companyId_status_lastActivityAt_id_idx" ON "project"("companyId", "status", "lastActivityAt" DESC, "id" DESC);

-- Reprise des données : la dernière activité connue d'un chantier existant
-- est sa dernière modification (aucune donnée perdue, ordre conservé).
UPDATE "project" SET "lastActivityAt" = "updatedAt";

-- Recherche sans accents ni casse (« refection dupont » trouve « Réfection
-- toiture — M. Dupont »), rapide même avec des milliers de chantiers.
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- unaccent() n'est pas IMMUTABLE : enveloppe requise pour l'indexer.
CREATE OR REPLACE FUNCTION immutable_unaccent(text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
  AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$;

CREATE INDEX "project_search_trgm_idx" ON "project" USING gin (
  immutable_unaccent(lower("name" || ' ' || coalesce("clientName", '') || ' ' || coalesce("address", ''))) gin_trgm_ops
);
