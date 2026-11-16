-- MA PAGE MOBIIZ (Greg, 16 novembre 2026) : la page publique de chaque entreprise. Cinq tables NOUVELLES, aucune
-- donnée existante modifiée. Retour arrière :
--   DROP TABLE "contact_page", "signalement_page", "ancienne_adresse_page", "photo_page", "page_entreprise";

-- CreateTable
CREATE TABLE "page_entreprise" (
    "company_id" UUID NOT NULL,
    "adresse" TEXT NOT NULL,
    "adresse_changee_le" TIMESTAMPTZ(3),
    "visible" BOOLEAN NOT NULL DEFAULT false,
    "masquee_le" TIMESTAMPTZ(3),
    "masquee_motif" TEXT,
    "modele" TEXT NOT NULL DEFAULT 'photo',
    "couleur" TEXT,
    "fond" TEXT,
    "pictos" BOOLEAN NOT NULL DEFAULT true,
    "motif" BOOLEAN NOT NULL DEFAULT true,
    "accroche" TEXT,
    "presentation" TEXT,
    "telephone" TEXT,
    "zone" TEXT,
    "horaires" TEXT,
    "site_web" TEXT,
    "creee_en" INTEGER,
    "certifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "afficher_adresse" BOOLEAN NOT NULL DEFAULT false,
    "couverture_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "page_entreprise_pkey" PRIMARY KEY ("company_id")
);

-- CreateTable
CREATE TABLE "photo_page" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'galerie',
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "legende" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'traitement',
    "largeur" INTEGER NOT NULL DEFAULT 0,
    "hauteur" INTEGER NOT NULL DEFAULT 0,
    "octets" INTEGER NOT NULL DEFAULT 0,
    "variantes" JSONB NOT NULL DEFAULT '[]',
    "partage" TEXT,
    "cles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photo_page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ancienne_adresse_page" (
    "adresse" TEXT NOT NULL,
    "company_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ancienne_adresse_page_pkey" PRIMARY KEY ("adresse")
);

-- CreateTable
CREATE TABLE "signalement_page" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "motif" TEXT NOT NULL,
    "precision" TEXT,
    "ip_hash" TEXT,
    "traite_le" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signalement_page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_page" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "ip_hash" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_page_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "page_entreprise_adresse_key" ON "page_entreprise"("adresse");

-- CreateIndex
CREATE INDEX "page_entreprise_visible_masquee_le_idx" ON "page_entreprise"("visible", "masquee_le");

-- CreateIndex
CREATE INDEX "photo_page_company_id_role_ordre_idx" ON "photo_page"("company_id", "role", "ordre");

-- CreateIndex
CREATE INDEX "ancienne_adresse_page_company_id_idx" ON "ancienne_adresse_page"("company_id");

-- CreateIndex
CREATE INDEX "signalement_page_traite_le_created_at_idx" ON "signalement_page"("traite_le", "created_at");

-- CreateIndex
CREATE INDEX "signalement_page_company_id_idx" ON "signalement_page"("company_id");

-- CreateIndex
CREATE INDEX "contact_page_company_id_created_at_idx" ON "contact_page"("company_id", "created_at");

-- CreateIndex
CREATE INDEX "contact_page_ip_hash_created_at_idx" ON "contact_page"("ip_hash", "created_at");

-- AddForeignKey
ALTER TABLE "page_entreprise" ADD CONSTRAINT "page_entreprise_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_page" ADD CONSTRAINT "photo_page_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ancienne_adresse_page" ADD CONSTRAINT "ancienne_adresse_page_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signalement_page" ADD CONSTRAINT "signalement_page_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_page" ADD CONSTRAINT "contact_page_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

