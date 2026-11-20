-- Assistant Mobiiz (31 octobre 2026) : le modèle et la couleur du PDF « Demande de prix ». Additive, deux colonnes nullables.
ALTER TABLE "company" ADD COLUMN "pdf_modele" TEXT;
ALTER TABLE "company" ADD COLUMN "pdf_couleur" TEXT;
