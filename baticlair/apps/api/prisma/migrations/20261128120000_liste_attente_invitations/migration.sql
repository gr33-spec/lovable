-- CHANTIER 05 (Greg, 28 novembre 2026) : liste d'attente par métier et département, annonces d'ouverture, invitations.
-- Migration additive : des colonnes facultatives (le jeton a sa valeur par défaut, donnée aussi aux lignes déjà là) et
-- quatre tables nouvelles. Aucune donnée réécrite ni supprimée.

-- AlterTable
ALTER TABLE "liste_attente_metier" ADD COLUMN     "company_id" UUID,
ADD COLUMN     "consentement_le" TIMESTAMPTZ(3),
ADD COLUMN     "consentement_version" TEXT,
ADD COLUMN     "desinscrit_le" TIMESTAMPTZ(3),
ADD COLUMN     "jeton" UUID NOT NULL DEFAULT gen_random_uuid(),
ADD COLUMN     "prevenu_le" TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "annonce_ouverture" (
    "id" UUID NOT NULL,
    "metier" TEXT NOT NULL,
    "departements" TEXT[],
    "auteur" TEXT NOT NULL,
    "total" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "terminee_le" TIMESTAMPTZ(3),

    CONSTRAINT "annonce_ouverture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "annonce_envoi" (
    "id" UUID NOT NULL,
    "annonce_id" UUID NOT NULL,
    "liste_attente_id" UUID NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'a_envoyer',
    "erreur" TEXT,
    "envoye_le" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "annonce_envoi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitation_artisan" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitation_artisan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitation_suivi" (
    "id" UUID NOT NULL,
    "inviteur_id" UUID NOT NULL,
    "invite_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitation_suivi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "annonce_ouverture_metier_idx" ON "annonce_ouverture"("metier");

-- CreateIndex
CREATE UNIQUE INDEX "annonce_envoi_liste_attente_id_key" ON "annonce_envoi"("liste_attente_id");

-- CreateIndex
CREATE INDEX "annonce_envoi_annonce_id_statut_idx" ON "annonce_envoi"("annonce_id", "statut");

-- CreateIndex
CREATE UNIQUE INDEX "invitation_artisan_company_id_key" ON "invitation_artisan"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "invitation_artisan_code_key" ON "invitation_artisan"("code");

-- CreateIndex
CREATE UNIQUE INDEX "invitation_suivi_invite_id_key" ON "invitation_suivi"("invite_id");

-- CreateIndex
CREATE INDEX "invitation_suivi_inviteur_id_idx" ON "invitation_suivi"("inviteur_id");

-- CreateIndex
CREATE UNIQUE INDEX "liste_attente_metier_jeton_key" ON "liste_attente_metier"("jeton");

-- CreateIndex
CREATE INDEX "liste_attente_metier_company_id_idx" ON "liste_attente_metier"("company_id");

-- AddForeignKey
ALTER TABLE "liste_attente_metier" ADD CONSTRAINT "liste_attente_metier_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "annonce_envoi" ADD CONSTRAINT "annonce_envoi_annonce_id_fkey" FOREIGN KEY ("annonce_id") REFERENCES "annonce_ouverture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "annonce_envoi" ADD CONSTRAINT "annonce_envoi_liste_attente_id_fkey" FOREIGN KEY ("liste_attente_id") REFERENCES "liste_attente_metier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation_artisan" ADD CONSTRAINT "invitation_artisan_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation_suivi" ADD CONSTRAINT "invitation_suivi_inviteur_id_fkey" FOREIGN KEY ("inviteur_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation_suivi" ADD CONSTRAINT "invitation_suivi_invite_id_fkey" FOREIGN KEY ("invite_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Retour arrière :
-- DROP TABLE "invitation_suivi"; DROP TABLE "invitation_artisan"; DROP TABLE "annonce_envoi"; DROP TABLE "annonce_ouverture";
-- ALTER TABLE "liste_attente_metier" DROP COLUMN "company_id", DROP COLUMN "consentement_le", DROP COLUMN "consentement_version",
--   DROP COLUMN "desinscrit_le", DROP COLUMN "jeton", DROP COLUMN "prevenu_le";
