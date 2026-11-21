-- Réponses de l'artisan aux questions du calcul, pour ce chantier (PD-045).
ALTER TABLE "takeoff" ADD COLUMN     "answers" JSONB NOT NULL DEFAULT '{}';
