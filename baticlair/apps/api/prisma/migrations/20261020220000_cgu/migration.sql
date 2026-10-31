-- Acceptation des CGU à la création du compte (pages légales, plan du 20 octobre).
ALTER TABLE "user" ADD COLUMN "cguAccepteLe" TIMESTAMP(3);
ALTER TABLE "user" ADD COLUMN "cguVersion" TEXT;
