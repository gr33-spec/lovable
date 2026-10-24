-- AlterTable (étape 8 : la notification du jour de livraison, une fois)
ALTER TABLE "livraison" ADD COLUMN "prevenuLe" TIMESTAMP(3);
