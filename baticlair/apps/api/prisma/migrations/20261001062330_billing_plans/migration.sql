-- AlterTable
ALTER TABLE "company" ADD COLUMN     "plan" TEXT NOT NULL DEFAULT 'trial',
ADD COLUMN     "planActivatedAt" TIMESTAMP(3),
ADD COLUMN     "requestedPlan" TEXT,
ADD COLUMN     "requestedPlanAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "project" ADD COLUMN     "demo" BOOLEAN NOT NULL DEFAULT false;

-- Les chantiers de démonstration déjà créés ne comptent pas dans la formule.
UPDATE "project" SET "demo" = true WHERE "name" = 'Démo – Toiture Martin' AND "clientName" = 'M. Martin (fictif)';
