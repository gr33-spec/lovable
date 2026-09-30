-- AlterTable
ALTER TABLE "company" ADD COLUMN     "trades" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Les entreprises créées avant le multi-métiers étaient des couvreurs (MVP couverture).
UPDATE "company" SET "trades" = ARRAY['roofing']::TEXT[];
