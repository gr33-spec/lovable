-- Additive (Greg, 7 novembre 2026, achats groupés V1, V5.2 validée) : quatre tables nouvelles, deux colonnes facultatives.
-- Rien d'existant n'est modifié ni supprimé. Retour arrière : DROP TABLE "lot_ligne_v1", "offre_achat_groupe_v1", "historique_besoin_groupe_v1", "besoin_groupe_v1", "achat_groupe_v1" ;
-- ALTER TABLE "company" DROP COLUMN "habilitation_ag", DROP COLUMN "habilitation_ag_le".

-- AlterTable
ALTER TABLE "company" ADD COLUMN     "habilitation_ag" TEXT,
ADD COLUMN     "habilitation_ag_le" TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "achat_groupe_v1" (
    "id" UUID NOT NULL,
    "numero" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "cle" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "lot" TEXT NOT NULL,
    "departement" TEXT NOT NULL,
    "reception" TEXT NOT NULL,
    "date_besoin" DATE NOT NULL,
    "ouvert_jusquau" TIMESTAMPTZ(3) NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'ouvert',
    "conditionnement_unite" TEXT,
    "conditionnement_par_unite" DECIMAL(14,3),
    "reconfirmer_avant" TIMESTAMPTZ(3),
    "rappel_le" TIMESTAMPTZ(3),
    "consultation_le" TIMESTAMPTZ(3),
    "volume_transmis" DECIMAL(14,3),
    "offre_avant" TIMESTAMPTZ(3),
    "annule_le" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "achat_groupe_v1_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "besoin_groupe_v1" (
    "id" UUID NOT NULL,
    "achat_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "user_id" TEXT,
    "project_id" UUID,
    "article_key" TEXT,
    "designation" TEXT NOT NULL,
    "attributs" JSONB NOT NULL,
    "quantite" DECIMAL(14,3) NOT NULL,
    "quantite_saisie" DECIMAL(14,3) NOT NULL,
    "unite_saisie" TEXT NOT NULL,
    "par_unite" DECIMAL(14,3),
    "conversion_confirmee_le" TIMESTAMPTZ(3),
    "reception" TEXT NOT NULL,
    "lieu" TEXT NOT NULL,
    "contraintes" TEXT,
    "date_besoin" DATE NOT NULL,
    "statut" TEXT NOT NULL,
    "confirme_le" TIMESTAMPTZ(3),
    "reconfirme_le" TIMESTAMPTZ(3),
    "retire_le" TIMESTAMPTZ(3),
    "motif_retrait" TEXT,
    "precision_retrait" TEXT,
    "retrait_tardif" BOOLEAN NOT NULL DEFAULT false,
    "rappel_envoye_le" TIMESTAMPTZ(3),
    "offre_signalee_le" TIMESTAMPTZ(3),
    "cle_idempotence" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "besoin_groupe_v1_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historique_besoin_groupe_v1" (
    "id" UUID NOT NULL,
    "besoin_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "detail" JSONB,
    "transmis" BOOLEAN NOT NULL DEFAULT false,
    "le" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historique_besoin_groupe_v1_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offre_achat_groupe_v1" (
    "id" UUID NOT NULL,
    "achat_id" UUID NOT NULL,
    "fournisseur" TEXT,
    "prix_unitaire_ht" DECIMAL(14,4),
    "livraison_ht" DECIMAL(14,2),
    "tva_pct" DECIMAL(5,2) NOT NULL DEFAULT 20,
    "delai" TEXT,
    "lieu" TEXT,
    "paiement" TEXT,
    "validite" TEXT,
    "annulation" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "offre_achat_groupe_v1_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lot_ligne_v1" (
    "project_id" UUID NOT NULL,
    "article_key" TEXT NOT NULL,
    "company_id" UUID NOT NULL,
    "lot" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "lot_ligne_v1_pkey" PRIMARY KEY ("project_id","article_key")
);

-- CreateIndex
CREATE UNIQUE INDEX "achat_groupe_v1_numero_key" ON "achat_groupe_v1"("numero");

-- CreateIndex
CREATE INDEX "achat_groupe_v1_departement_cle_reception_statut_idx" ON "achat_groupe_v1"("departement", "cle", "reception", "statut");

-- CreateIndex
CREATE INDEX "achat_groupe_v1_statut_idx" ON "achat_groupe_v1"("statut");

-- CreateIndex
CREATE INDEX "besoin_groupe_v1_achat_id_statut_idx" ON "besoin_groupe_v1"("achat_id", "statut");

-- CreateIndex
CREATE INDEX "besoin_groupe_v1_company_id_statut_idx" ON "besoin_groupe_v1"("company_id", "statut");

-- CreateIndex
CREATE INDEX "besoin_groupe_v1_project_id_idx" ON "besoin_groupe_v1"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "besoin_groupe_v1_company_id_cle_idempotence_key" ON "besoin_groupe_v1"("company_id", "cle_idempotence");

-- CreateIndex
CREATE INDEX "historique_besoin_groupe_v1_besoin_id_le_idx" ON "historique_besoin_groupe_v1"("besoin_id", "le");

-- CreateIndex
CREATE UNIQUE INDEX "offre_achat_groupe_v1_achat_id_key" ON "offre_achat_groupe_v1"("achat_id");

-- CreateIndex
CREATE INDEX "lot_ligne_v1_company_id_idx" ON "lot_ligne_v1"("company_id");

-- AddForeignKey
ALTER TABLE "besoin_groupe_v1" ADD CONSTRAINT "besoin_groupe_v1_achat_id_fkey" FOREIGN KEY ("achat_id") REFERENCES "achat_groupe_v1"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "besoin_groupe_v1" ADD CONSTRAINT "besoin_groupe_v1_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historique_besoin_groupe_v1" ADD CONSTRAINT "historique_besoin_groupe_v1_besoin_id_fkey" FOREIGN KEY ("besoin_id") REFERENCES "besoin_groupe_v1"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offre_achat_groupe_v1" ADD CONSTRAINT "offre_achat_groupe_v1_achat_id_fkey" FOREIGN KEY ("achat_id") REFERENCES "achat_groupe_v1"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Une ligne de quantitatif n'est tenue que par UN besoin actif (« une ligne, un seul circuit »), même sous des requêtes simultanées.
CREATE UNIQUE INDEX "besoin_groupe_v1_ligne_active_key" ON "besoin_groupe_v1" ("project_id", "article_key") WHERE "statut" <> 'retire' AND "project_id" IS NOT NULL AND "article_key" IS NOT NULL;
