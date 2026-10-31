-- Achat groupé automatique (Greg, 27 octobre 2026) : négoces des participants, consultation par négoce, désistements, alertes, factures de commission mensuelles.
-- AlterTable
ALTER TABLE "besoin_negocie" ADD COLUMN     "consultation_commande_id" UUID,
ADD COLUMN     "desiste_le" TIMESTAMPTZ(3),
ADD COLUMN     "prix_commande_ht" DECIMAL(14,4);

-- AlterTable
ALTER TABLE "company" ADD COLUMN     "alertes_achats_groupes" TEXT NOT NULL DEFAULT 'toutes',
ADD COLUMN     "naf" TEXT;

-- AlterTable
ALTER TABLE "regroupement_negocie" ADD COLUMN     "analyse_le" TIMESTAMPTZ(3),
ADD COLUMN     "cloture_le" TIMESTAMPTZ(3),
ADD COLUMN     "commission_pct" DECIMAL(5,2),
ADD COLUMN     "consulte_le" TIMESTAMPTZ(3),
ADD COLUMN     "meilleure_id" UUID,
ADD COLUMN     "mode" TEXT NOT NULL DEFAULT 'humain',
ADD COLUMN     "pas_assez_le" TIMESTAMPTZ(3),
ADD COLUMN     "reponse_avant_le" TIMESTAMPTZ(3),
ADD COLUMN     "unite" TEXT;

-- CreateTable
CREATE TABLE "negoce_participant" (
    "id" UUID NOT NULL,
    "besoin_id" UUID NOT NULL,
    "regroupement_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "supplier_id" UUID,
    "nom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telephone" TEXT,
    "siret" TEXT,
    "prevenu_le" TIMESTAMPTZ(3),
    "rappel_le" TIMESTAMPTZ(3),
    "parti_le" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "negoce_participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultation_achat_groupe" (
    "id" UUID NOT NULL,
    "regroupement_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "telephone" TEXT,
    "clients" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "quantite" DECIMAL(14,3) NOT NULL,
    "token_hash" TEXT NOT NULL,
    "commission_pct" DECIMAL(5,2) NOT NULL,
    "envoye_le" TIMESTAMPTZ(3),
    "conditions_acceptees_le" TIMESTAMPTZ(3),
    "repondu_le" TIMESTAMPTZ(3),
    "prix_unitaire_ht" DECIMAL(14,4),
    "delai_jours" INTEGER,
    "commentaire" TEXT,
    "pdf" BYTEA,
    "pdf_nom" TEXT,
    "lecture" JSONB,
    "lu_le" TIMESTAMPTZ(3),
    "cout_ia_eur" DECIMAL(10,4),
    "statut" TEXT NOT NULL DEFAULT 'envoyee',
    "raisons" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consultation_achat_groupe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "desistement_achat_groupe" (
    "id" UUID NOT NULL,
    "besoin_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "regroupement_id" UUID NOT NULL,
    "quantite" DECIMAL(14,3) NOT NULL,
    "apres_cloture" BOOLEAN NOT NULL,
    "raison" TEXT,
    "le" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "desistement_achat_groupe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerte_achat_groupe" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "regroupement_id" UUID NOT NULL,
    "jour" DATE NOT NULL,
    "envoyee_le" TIMESTAMPTZ(3),
    "resume" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alerte_achat_groupe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facture_commission_mensuelle" (
    "id" UUID NOT NULL,
    "mois" TEXT NOT NULL,
    "negoce_email" TEXT NOT NULL,
    "negoce_nom" TEXT NOT NULL,
    "total_ht" DECIMAL(14,2) NOT NULL,
    "commission_ht" DECIMAL(14,2) NOT NULL,
    "bons" JSONB NOT NULL,
    "preparee_le" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "envoyee_le" TIMESTAMPTZ(3),

    CONSTRAINT "facture_commission_mensuelle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "negoce_participant_regroupement_id_idx" ON "negoce_participant"("regroupement_id");

-- CreateIndex
CREATE UNIQUE INDEX "negoce_participant_besoin_id_email_key" ON "negoce_participant"("besoin_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "consultation_achat_groupe_token_hash_key" ON "consultation_achat_groupe"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "consultation_achat_groupe_regroupement_id_email_key" ON "consultation_achat_groupe"("regroupement_id", "email");

-- CreateIndex
CREATE INDEX "desistement_achat_groupe_regroupement_id_idx" ON "desistement_achat_groupe"("regroupement_id");

-- CreateIndex
CREATE INDEX "desistement_achat_groupe_company_id_le_idx" ON "desistement_achat_groupe"("company_id", "le");

-- CreateIndex
CREATE INDEX "alerte_achat_groupe_company_id_jour_idx" ON "alerte_achat_groupe"("company_id", "jour");

-- CreateIndex
CREATE UNIQUE INDEX "alerte_achat_groupe_company_id_regroupement_id_key" ON "alerte_achat_groupe"("company_id", "regroupement_id");

-- CreateIndex
CREATE UNIQUE INDEX "facture_commission_mensuelle_mois_negoce_email_key" ON "facture_commission_mensuelle"("mois", "negoce_email");

-- AddForeignKey
ALTER TABLE "negoce_participant" ADD CONSTRAINT "negoce_participant_besoin_id_fkey" FOREIGN KEY ("besoin_id") REFERENCES "besoin_negocie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "negoce_participant" ADD CONSTRAINT "negoce_participant_regroupement_id_fkey" FOREIGN KEY ("regroupement_id") REFERENCES "regroupement_negocie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultation_achat_groupe" ADD CONSTRAINT "consultation_achat_groupe_regroupement_id_fkey" FOREIGN KEY ("regroupement_id") REFERENCES "regroupement_negocie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "desistement_achat_groupe" ADD CONSTRAINT "desistement_achat_groupe_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "desistement_achat_groupe" ADD CONSTRAINT "desistement_achat_groupe_regroupement_id_fkey" FOREIGN KEY ("regroupement_id") REFERENCES "regroupement_negocie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerte_achat_groupe" ADD CONSTRAINT "alerte_achat_groupe_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerte_achat_groupe" ADD CONSTRAINT "alerte_achat_groupe_regroupement_id_fkey" FOREIGN KEY ("regroupement_id") REFERENCES "regroupement_negocie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

