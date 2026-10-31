-- AlterTable
ALTER TABLE "besoin_negocie" ADD COLUMN     "rappelOffreLe" TIMESTAMP(3),
ADD COLUMN     "signaleLe" TIMESTAMP(3);
-- AlterTable
ALTER TABLE "regroupement_negocie" ADD COLUMN     "ajoutAlerteLe" TIMESTAMP(3),
ADD COLUMN     "formationAlerteLe" TIMESTAMP(3),
ADD COLUMN     "rappelJ2Le" TIMESTAMP(3),
ADD COLUMN     "rappelJ5Le" TIMESTAMP(3);
