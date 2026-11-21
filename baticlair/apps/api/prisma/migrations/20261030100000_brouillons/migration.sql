-- Correction après test de Greg (30 octobre 2026, point 2) : les parcours commencés sont gardés sur le serveur.
CREATE TABLE "brouillon" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "cle" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "etape" INTEGER NOT NULL DEFAULT 1,
    "donnees" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "brouillon_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "brouillon_company_id_cle_key" ON "brouillon"("company_id", "cle");
CREATE INDEX "brouillon_company_id_updated_at_idx" ON "brouillon"("company_id", "updated_at");
ALTER TABLE "brouillon" ADD CONSTRAINT "brouillon_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
