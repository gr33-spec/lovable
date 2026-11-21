-- §43.4 : notifications demandées au premier envoi fournisseur, reproposées au troisième, réglables dans Compte.
ALTER TABLE "user" ADD COLUMN "notificationsPromptCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "user" ADD COLUMN "notificationsEnabledAt" TIMESTAMP(3);
