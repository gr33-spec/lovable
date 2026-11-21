-- Spécialités des négoces du carnet et instantané à l'envoi (Greg, 1er novembre 2026). ADDITIVE : deux colonnes, rien
-- de modifié ni de supprimé ; l'ancien code les ignore.
ALTER TABLE "supplier" ADD COLUMN "specialites" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "price_request_recipient" ADD COLUMN "instantane" JSONB;
