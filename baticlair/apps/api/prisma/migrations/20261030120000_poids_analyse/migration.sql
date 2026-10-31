-- Décision 3 de Greg (30 octobre 2026) : un devis de plus de 150 lignes compte pour 2 analyses. Colonne ajoutée, rien d'effacé.
ALTER TABLE "ai_analysis" ADD COLUMN "poids" INTEGER NOT NULL DEFAULT 1;
