-- Rapprochement continu (Greg, 6 novembre 2026) : deux tables NOUVELLES, aucune colonne existante modifiée ni supprimée.
-- Retour arrière : DROP TABLE "proposition_rapprochement"; DROP TABLE "ligne_rapprochement";
-- CreateTable
CREATE TABLE "ligne_rapprochement" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "article_key" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "cle" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "famille" TEXT NOT NULL,
    "quantite" DECIMAL(14,3) NOT NULL,
    "unite" TEXT NOT NULL,
    "departement" TEXT NOT NULL,
    "mode_livraison" TEXT NOT NULL DEFAULT 'livraison',
    "date_max" DATE,
    "jusquau" TIMESTAMPTZ(3) NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'disponible',
    "retrait_motif" TEXT,
    "retire_le" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ligne_rapprochement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proposition_rapprochement" (
    "id" UUID NOT NULL,
    "ligne_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "cible" TEXT NOT NULL,
    "niveau" TEXT NOT NULL,
    "differences" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "score" INTEGER NOT NULL,
    "notifie_le" TIMESTAMPTZ(3),
    "relance_le" TIMESTAMPTZ(3),
    "reponse" TEXT,
    "repondu_le" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proposition_rapprochement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ligne_rapprochement_statut_departement_type_idx" ON "ligne_rapprochement"("statut", "departement", "type");

-- CreateIndex
CREATE UNIQUE INDEX "ligne_rapprochement_company_id_project_id_article_key_key" ON "ligne_rapprochement"("company_id", "project_id", "article_key");

-- CreateIndex
CREATE INDEX "proposition_rapprochement_company_id_reponse_idx" ON "proposition_rapprochement"("company_id", "reponse");

-- CreateIndex
CREATE UNIQUE INDEX "proposition_rapprochement_ligne_id_cible_key" ON "proposition_rapprochement"("ligne_id", "cible");

-- AddForeignKey
ALTER TABLE "ligne_rapprochement" ADD CONSTRAINT "ligne_rapprochement_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposition_rapprochement" ADD CONSTRAINT "proposition_rapprochement_ligne_id_fkey" FOREIGN KEY ("ligne_id") REFERENCES "ligne_rapprochement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposition_rapprochement" ADD CONSTRAINT "proposition_rapprochement_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
