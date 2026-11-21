-- Infos chantier facultatives : la note de l'artisan sur le chantier, et les croquis déposés (jamais lus par l'IA).
ALTER TABLE "project" ADD COLUMN "siteNotes" TEXT;
ALTER TYPE "DocumentPurpose" ADD VALUE 'sketch';
