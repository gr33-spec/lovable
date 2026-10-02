-- AlterTable : titres du devis au-dessus de chaque ligne (lot, marque, logement, pièce).
ALTER TABLE "takeoff_line" ADD COLUMN     "section" JSONB NOT NULL DEFAULT '[]';
