-- LOT FINAL (Greg, 29 octobre 2026) : identité de l'artisan au premier envoi, modèle de message, relances.
ALTER TABLE "company" ADD COLUMN "prenom" TEXT;
ALTER TABLE "company" ADD COLUMN "modele_message" TEXT;
ALTER TABLE "company" ADD COLUMN "tutoie_negoces" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "price_request_recipient" ADD COLUMN "rappel_mi_le" TIMESTAMPTZ(3);
ALTER TABLE "price_request_recipient" ADD COLUMN "rappel_veille_le" TIMESTAMPTZ(3);
ALTER TABLE "negoce_participant" ADD COLUMN "rappel_mi_le" TIMESTAMPTZ(3);
ALTER TABLE "negoce_participant" ADD COLUMN "rappel_veille_le" TIMESTAMPTZ(3);
ALTER TABLE "consultation_achat_groupe" ADD COLUMN "relance_le" TIMESTAMPTZ(3);
