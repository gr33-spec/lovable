-- §47.4 / §47.5 : une confirmation de règle vient de l'écran ou d'un bon de commande (la preuve la plus forte).
ALTER TABLE "rule_confirmation" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'screen';
