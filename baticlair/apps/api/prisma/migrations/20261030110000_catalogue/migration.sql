-- Correction après test de Greg (30 octobre 2026, point 3) : le catalogue complet en données, et la ligne libre.
CREATE TABLE "catalogue_article" (
    "cle" TEXT NOT NULL,
    "metier" TEXT NOT NULL,
    "famille" TEXT NOT NULL,
    "produit" TEXT NOT NULL,
    "variante" TEXT,
    "designation" TEXT NOT NULL,
    "unite" TEXT NOT NULL,
    "synonymes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "masque" BOOLEAN NOT NULL DEFAULT false,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "ajoute" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "catalogue_article_pkey" PRIMARY KEY ("cle")
);
CREATE INDEX "catalogue_article_metier_masque_idx" ON "catalogue_article"("metier", "masque");
ALTER TABLE "ligne_achat_groupe" ADD COLUMN "libre" BOOLEAN NOT NULL DEFAULT false;
