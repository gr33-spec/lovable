-- ACHAT GROUPÉ PAR MÉTIER (Greg, 27 octobre 2026, 2e message) : panier, engagement, réponse ligne par ligne, validation admin, publication.
-- AlterTable
ALTER TABLE "besoin_negocie" ADD COLUMN     "commande_recue_le" TIMESTAMPTZ(3),
ADD COLUMN     "commande_token_hash" TEXT,
ADD COLUMN     "coordonnees_consultation_id" UUID,
ADD COLUMN     "coordonnees_transmises_le" TIMESTAMPTZ(3),
ADD COLUMN     "engage_le" TIMESTAMPTZ(3),
ADD COLUMN     "livre_le" TIMESTAMPTZ(3),
ADD COLUMN     "non_commande_le" TIMESTAMPTZ(3),
ADD COLUMN     "offert" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "offre_vue_le" TIMESTAMPTZ(3),
ADD COLUMN     "probleme_le" TIMESTAMPTZ(3),
ADD COLUMN     "probleme_texte" TEXT,
ADD COLUMN     "sortie_le" TIMESTAMPTZ(3),
ADD COLUMN     "sortie_motif" TEXT;

-- AlterTable
ALTER TABLE "company" ADD COLUMN     "achats_groupes_exclus_jusquau" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "consultation_achat_groupe" ADD COLUMN     "ecartee_le" TIMESTAMPTZ(3),
ADD COLUMN     "lignes" JSONB,
ADD COLUMN     "prix_corriges" JSONB,
ADD COLUMN     "prix_lignes" JSONB;

-- AlterTable
ALTER TABLE "regroupement_negocie" ADD COLUMN     "commande_avant_le" TIMESTAMPTZ(3),
ADD COLUMN     "corrections_admin" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ia_meilleure_id" UUID,
ADD COLUMN     "publie_le" TIMESTAMPTZ(3),
ADD COLUMN     "validation_alerte_le" TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "ligne_achat_groupe" (
    "id" UUID NOT NULL,
    "besoin_id" UUID NOT NULL,
    "regroupement_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "cle" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "famille" TEXT NOT NULL,
    "unite" TEXT NOT NULL,
    "quantite" DECIMAL(14,3) NOT NULL,
    "project_id" UUID,
    "article_key" TEXT,
    "designation_origine" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ligne_achat_groupe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conditions_ouverture_negoce" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "pieces" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "paiement" TEXT,
    "autre" TEXT,
    "maj_le" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conditions_ouverture_negoce_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "correction_offre_achat_groupe" (
    "id" UUID NOT NULL,
    "consultation_id" UUID NOT NULL,
    "regroupement_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "cle" TEXT,
    "avant" DECIMAL(14,4),
    "apres" DECIMAL(14,4),
    "admin_email" TEXT NOT NULL,
    "le" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "correction_offre_achat_groupe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ligne_achat_groupe_regroupement_id_idx" ON "ligne_achat_groupe"("regroupement_id");

-- CreateIndex
CREATE UNIQUE INDEX "ligne_achat_groupe_besoin_id_cle_unite_key" ON "ligne_achat_groupe"("besoin_id", "cle", "unite");

-- CreateIndex
CREATE UNIQUE INDEX "conditions_ouverture_negoce_email_key" ON "conditions_ouverture_negoce"("email");

-- CreateIndex
CREATE INDEX "correction_offre_achat_groupe_regroupement_id_idx" ON "correction_offre_achat_groupe"("regroupement_id");

-- CreateIndex
CREATE UNIQUE INDEX "besoin_negocie_commande_token_hash_key" ON "besoin_negocie"("commande_token_hash");

-- AddForeignKey
ALTER TABLE "ligne_achat_groupe" ADD CONSTRAINT "ligne_achat_groupe_besoin_id_fkey" FOREIGN KEY ("besoin_id") REFERENCES "besoin_negocie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ligne_achat_groupe" ADD CONSTRAINT "ligne_achat_groupe_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

