-- Métier du chantier, choisi à la création quand le devis ne le dit pas ; null = celui de l'entreprise.
ALTER TABLE "project" ADD COLUMN "trade" TEXT;
