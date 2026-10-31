-- R7 (Greg, 26 et 27 octobre 2026) : l'adresse Mobiiz par artisan, les e-mails reçus dessus, l'étiquette de réponse d'une demande.
-- AlterTable
ALTER TABLE "company" ADD COLUMN     "adresse_mobiiz_vue_le" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "price_request_recipient" ADD COLUMN     "etiquette" TEXT;

-- CreateTable
CREATE TABLE "adresse_mobiiz" (
    "adresse" TEXT NOT NULL,
    "company_id" UUID NOT NULL,
    "courante" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adresse_mobiiz_pkey" PRIMARY KEY ("adresse")
);

-- CreateTable
CREATE TABLE "email_recu_artisan" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "adresse" TEXT NOT NULL,
    "recipient_id" UUID,
    "project_id" UUID,
    "de" TEXT NOT NULL,
    "objet" TEXT NOT NULL,
    "texte" TEXT,
    "recu_le" TIMESTAMPTZ(3) NOT NULL,
    "lu_le" TIMESTAMPTZ(3),
    "trop_lourdes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_recu_artisan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_recu_fichier" (
    "id" UUID NOT NULL,
    "email_id" UUID NOT NULL,
    "nom" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "taille" INTEGER NOT NULL,
    "contenu" BYTEA NOT NULL,
    "document_id" UUID,

    CONSTRAINT "email_recu_fichier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "adresse_mobiiz_company_id_idx" ON "adresse_mobiiz"("company_id");

-- CreateIndex
CREATE INDEX "email_recu_artisan_company_id_recu_le_idx" ON "email_recu_artisan"("company_id", "recu_le");

-- CreateIndex
CREATE INDEX "email_recu_artisan_project_id_idx" ON "email_recu_artisan"("project_id");

-- CreateIndex
CREATE INDEX "email_recu_fichier_email_id_idx" ON "email_recu_fichier"("email_id");

-- CreateIndex
CREATE UNIQUE INDEX "price_request_recipient_etiquette_key" ON "price_request_recipient"("etiquette");

-- AddForeignKey
ALTER TABLE "adresse_mobiiz" ADD CONSTRAINT "adresse_mobiiz_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_recu_artisan" ADD CONSTRAINT "email_recu_artisan_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_recu_artisan" ADD CONSTRAINT "email_recu_artisan_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "price_request_recipient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_recu_fichier" ADD CONSTRAINT "email_recu_fichier_email_id_fkey" FOREIGN KEY ("email_id") REFERENCES "email_recu_artisan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

