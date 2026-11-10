-- Additive (Greg, 10 novembre 2026, missions entre entreprises, « Messages et réponses », cloche) : treize tables nouvelles.
-- Rien d'existant n'est modifié ni supprimé (aucune colonne ajoutée à une table existante).
-- RETOUR ARRIÈRE (jamais exécuté automatiquement, voir docs/ux-complet.md) :
--   DROP TABLE "lecture_boite", "profil_public", "reglage_alertes", "alerte_courte", "historique_mission",
--     "annonce_enregistree", "signalement_mission", "blocage_entreprise", "fichier_pro", "message_mission",
--     "conversation_mission", "reponse_mission", "annonce_mission";

-- CreateTable
CREATE TABLE "annonce_mission" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'publiee',
    "metier" TEXT NOT NULL,
    "autre_metier" TEXT,
    "lieu" TEXT NOT NULL,
    "departement" TEXT NOT NULL,
    "rayon_km" INTEGER,
    "debut" DATE NOT NULL,
    "fin" DATE,
    "types" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "description" TEXT NOT NULL,
    "niveau" TEXT,
    "experience" TEXT,
    "qualifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "equipe" TEXT,
    "contexte" TEXT,
    "mode_chiffrage" TEXT,
    "budget_min" DECIMAL(12,2),
    "budget_max" DECIMAL(12,2),
    "frais" TEXT,
    "conditions" TEXT,
    "tarif_jour" DECIMAL(10,2),
    "tarif_unite" TEXT,
    "duree_min_jours" INTEGER,
    "negociable" BOOLEAN NOT NULL DEFAULT true,
    "tarif_visible" BOOLEAN NOT NULL DEFAULT true,
    "consultations" INTEGER NOT NULL DEFAULT 0,
    "fermee_le" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "annonce_mission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reponse_mission" (
    "id" UUID NOT NULL,
    "annonce_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'envoyee',
    "niveau" TEXT NOT NULL,
    "experience_ans" INTEGER NOT NULL,
    "equipe" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "tarif_jour" DECIMAL(10,2),
    "tarif_unite" TEXT,
    "jours" TEXT,
    "deplacement" TEXT,
    "document_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "reponse_mission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_mission" (
    "id" UUID NOT NULL,
    "annonce_id" UUID NOT NULL,
    "annonceur_id" UUID NOT NULL,
    "autre_id" UUID NOT NULL,
    "ouverte_par" UUID NOT NULL,
    "coordonnees_annonceur_le" TIMESTAMPTZ(3),
    "coordonnees_autre_le" TIMESTAMPTZ(3),
    "lu_annonceur_le" TIMESTAMPTZ(3),
    "lu_autre_le" TIMESTAMPTZ(3),
    "archivee_annonceur_le" TIMESTAMPTZ(3),
    "archivee_autre_le" TIMESTAMPTZ(3),
    "bloquee_le" TIMESTAMPTZ(3),
    "bloquee_par" UUID,
    "dernier_message_le" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_mission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_mission" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "texte" TEXT NOT NULL,
    "cle" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_mission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fichier_pro" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "portee" TEXT NOT NULL,
    "categorie" TEXT,
    "annonce_id" UUID,
    "message_id" UUID,
    "titre" TEXT,
    "nom" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "taille" INTEGER NOT NULL,
    "contenu" BYTEA NOT NULL,
    "sur_profil" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fichier_pro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocage_entreprise" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "cible_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocage_entreprise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signalement_mission" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "cible_id" UUID NOT NULL,
    "conversation_id" UUID,
    "annonce_id" UUID,
    "motif" TEXT NOT NULL,
    "precision" TEXT,
    "traite_le" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signalement_mission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "annonce_enregistree" (
    "company_id" UUID NOT NULL,
    "annonce_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "annonce_enregistree_pkey" PRIMARY KEY ("company_id","annonce_id")
);

-- CreateTable
CREATE TABLE "historique_mission" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "annonce_id" UUID,
    "conversation_id" UUID,
    "action" TEXT NOT NULL,
    "detail" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historique_mission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerte_courte" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "categorie" TEXT NOT NULL,
    "genre" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "cle" TEXT NOT NULL,
    "lu_le" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alerte_courte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reglage_alertes" (
    "company_id" UUID NOT NULL,
    "prix" BOOLEAN NOT NULL DEFAULT true,
    "groupe" BOOLEAN NOT NULL DEFAULT true,
    "missions" BOOLEAN NOT NULL DEFAULT true,
    "conseils" BOOLEAN NOT NULL DEFAULT false,
    "email" BOOLEAN NOT NULL DEFAULT true,
    "push" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "reglage_alertes_pkey" PRIMARY KEY ("company_id")
);

-- CreateTable
CREATE TABLE "profil_public" (
    "company_id" UUID NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT false,
    "presentation" TEXT,
    "metiers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "services" TEXT,
    "equipe" TEXT,
    "ville" TEXT,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "profil_public_pkey" PRIMARY KEY ("company_id")
);

-- CreateTable
CREATE TABLE "lecture_boite" (
    "company_id" UUID NOT NULL,
    "cle" TEXT NOT NULL,
    "lu_le" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lecture_boite_pkey" PRIMARY KEY ("company_id","cle")
);

-- CreateIndex
CREATE INDEX "annonce_mission_type_statut_departement_idx" ON "annonce_mission"("type", "statut", "departement");

-- CreateIndex
CREATE INDEX "annonce_mission_company_id_created_at_idx" ON "annonce_mission"("company_id", "created_at");

-- CreateIndex
CREATE INDEX "reponse_mission_company_id_idx" ON "reponse_mission"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "reponse_mission_annonce_id_company_id_key" ON "reponse_mission"("annonce_id", "company_id");

-- CreateIndex
CREATE INDEX "conversation_mission_annonceur_id_dernier_message_le_idx" ON "conversation_mission"("annonceur_id", "dernier_message_le");

-- CreateIndex
CREATE INDEX "conversation_mission_autre_id_dernier_message_le_idx" ON "conversation_mission"("autre_id", "dernier_message_le");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_mission_annonce_id_annonceur_id_autre_id_key" ON "conversation_mission"("annonce_id", "annonceur_id", "autre_id");

-- CreateIndex
CREATE INDEX "message_mission_conversation_id_created_at_idx" ON "message_mission"("conversation_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "message_mission_conversation_id_cle_key" ON "message_mission"("conversation_id", "cle");

-- CreateIndex
CREATE INDEX "fichier_pro_company_id_portee_idx" ON "fichier_pro"("company_id", "portee");

-- CreateIndex
CREATE INDEX "fichier_pro_annonce_id_idx" ON "fichier_pro"("annonce_id");

-- CreateIndex
CREATE INDEX "fichier_pro_message_id_idx" ON "fichier_pro"("message_id");

-- CreateIndex
CREATE INDEX "blocage_entreprise_cible_id_idx" ON "blocage_entreprise"("cible_id");

-- CreateIndex
CREATE UNIQUE INDEX "blocage_entreprise_company_id_cible_id_key" ON "blocage_entreprise"("company_id", "cible_id");

-- CreateIndex
CREATE INDEX "signalement_mission_traite_le_created_at_idx" ON "signalement_mission"("traite_le", "created_at");

-- CreateIndex
CREATE INDEX "historique_mission_annonce_id_idx" ON "historique_mission"("annonce_id");

-- CreateIndex
CREATE INDEX "historique_mission_conversation_id_idx" ON "historique_mission"("conversation_id");

-- CreateIndex
CREATE INDEX "alerte_courte_company_id_created_at_idx" ON "alerte_courte"("company_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "alerte_courte_company_id_cle_key" ON "alerte_courte"("company_id", "cle");

-- AddForeignKey
ALTER TABLE "annonce_mission" ADD CONSTRAINT "annonce_mission_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reponse_mission" ADD CONSTRAINT "reponse_mission_annonce_id_fkey" FOREIGN KEY ("annonce_id") REFERENCES "annonce_mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reponse_mission" ADD CONSTRAINT "reponse_mission_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_mission" ADD CONSTRAINT "conversation_mission_annonce_id_fkey" FOREIGN KEY ("annonce_id") REFERENCES "annonce_mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_mission" ADD CONSTRAINT "conversation_mission_annonceur_id_fkey" FOREIGN KEY ("annonceur_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_mission" ADD CONSTRAINT "conversation_mission_autre_id_fkey" FOREIGN KEY ("autre_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_mission" ADD CONSTRAINT "message_mission_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversation_mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fichier_pro" ADD CONSTRAINT "fichier_pro_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fichier_pro" ADD CONSTRAINT "fichier_pro_annonce_id_fkey" FOREIGN KEY ("annonce_id") REFERENCES "annonce_mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fichier_pro" ADD CONSTRAINT "fichier_pro_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "message_mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocage_entreprise" ADD CONSTRAINT "blocage_entreprise_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocage_entreprise" ADD CONSTRAINT "blocage_entreprise_cible_id_fkey" FOREIGN KEY ("cible_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signalement_mission" ADD CONSTRAINT "signalement_mission_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "annonce_enregistree" ADD CONSTRAINT "annonce_enregistree_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "annonce_enregistree" ADD CONSTRAINT "annonce_enregistree_annonce_id_fkey" FOREIGN KEY ("annonce_id") REFERENCES "annonce_mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historique_mission" ADD CONSTRAINT "historique_mission_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerte_courte" ADD CONSTRAINT "alerte_courte_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reglage_alertes" ADD CONSTRAINT "reglage_alertes_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profil_public" ADD CONSTRAINT "profil_public_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lecture_boite" ADD CONSTRAINT "lecture_boite_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
