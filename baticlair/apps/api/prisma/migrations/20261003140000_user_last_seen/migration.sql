-- Dernière connexion (politique de confidentialité : effacement 3 ans après). Les comptes existants partent d'aujourd'hui.
ALTER TABLE "user" ADD COLUMN "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX "user_lastSeenAt_idx" ON "user"("lastSeenAt");
