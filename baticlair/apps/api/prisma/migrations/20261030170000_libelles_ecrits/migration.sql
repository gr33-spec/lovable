-- Les intitulés écrits dans « Écris ta liste » (Greg, 30 octobre 2026) : proposés à tous dès deux entreprises.
CREATE TABLE "libelle_ecrit" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "cle" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "unite" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "libelle_ecrit_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "libelle_ecrit_cle_company_id_key" ON "libelle_ecrit"("cle", "company_id");
CREATE INDEX "libelle_ecrit_cle_idx" ON "libelle_ecrit"("cle");
ALTER TABLE "libelle_ecrit" ADD CONSTRAINT "libelle_ecrit_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
