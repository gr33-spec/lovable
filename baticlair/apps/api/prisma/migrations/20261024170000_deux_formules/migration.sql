-- Les deux formules de l'abonnement (Greg, 24 octobre 2026) : mensuel 49 € HT, annuel 349 € HT.
ALTER TABLE "abonnement" ADD COLUMN "formule" TEXT NOT NULL DEFAULT 'mensuel';
ALTER TABLE "facture_abonnement" ADD COLUMN "formule" TEXT NOT NULL DEFAULT 'mensuel';
