-- Nouveau cap (22 octobre 2026) : le négoce donne obligatoirement un prix de livraison par zone (commune d'un chantier du lot).
ALTER TABLE "reponse_negoce" ADD COLUMN IF NOT EXISTS "livraison" JSONB NOT NULL DEFAULT '[]';
