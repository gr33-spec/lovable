-- Parcours (§48) : le calcul (moteur + appel IA n° 2) part après les questions de comptoir.
ALTER TABLE "takeoff" ADD COLUMN "calculStartedAt" TIMESTAMP(3);
ALTER TABLE "takeoff" ADD COLUMN "calculatedAt" TIMESTAMP(3);
-- Les quantitatifs déjà là sont calculés : ils s'ouvrent sur la liste, comme avant.
UPDATE "takeoff" SET "calculStartedAt" = "createdAt", "calculatedAt" = "createdAt";
