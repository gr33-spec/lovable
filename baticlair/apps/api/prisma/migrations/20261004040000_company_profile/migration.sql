-- §45.3 : coordonnées et logo de l'entreprise, pour l'en-tête de la demande de devis et la signature du mail (§45.2).
ALTER TABLE "company" ADD COLUMN "address" TEXT;
ALTER TABLE "company" ADD COLUMN "siret" TEXT;
ALTER TABLE "company" ADD COLUMN "phone" TEXT;
ALTER TABLE "company" ADD COLUMN "contactEmail" TEXT;
ALTER TABLE "company" ADD COLUMN "logo" BYTEA;
ALTER TABLE "company" ADD COLUMN "logoType" TEXT;
