-- Additive (Greg, 12 novembre 2026, dossier de corrections UX, point 12 : logo ou photo du profil Missions).
-- Une table nouvelle. Aucune table existante n'est modifiée, aucune donnée n'est touchée.
-- RETOUR ARRIÈRE (jamais exécuté automatiquement) :
--   DROP TABLE "image_profil";

-- CreateTable
CREATE TABLE "image_profil" (
    "company_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "contenu" BYTEA NOT NULL,
    "taille" INTEGER NOT NULL,
    "cote" INTEGER NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "image_profil_pkey" PRIMARY KEY ("company_id")
);

-- AddForeignKey
ALTER TABLE "image_profil" ADD CONSTRAINT "image_profil_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
