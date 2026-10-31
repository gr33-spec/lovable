-- BatiClair Groupé : le SIRET vérifié, l'accord du négoce (commission de 2 % du HT du lot s'il est retenu) et sa facture.
-- Ces objets avaient été ajoutés à la migration du 19 octobre après son application sur les bases de prévisualisation
-- et de parcours : ils sont repris ici, et chaque ordre tolère un objet déjà présent.

ALTER TABLE "company" ADD COLUMN IF NOT EXISTS "siretVerifieLe" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "accord_negoce" (
    "id" UUID NOT NULL,
    "lotId" UUID NOT NULL,
    "negoceId" UUID NOT NULL,
    "versionContrat" TEXT NOT NULL,
    "tauxPourcent" DECIMAL(5,2) NOT NULL,
    "email" TEXT NOT NULL,
    "adresseIp" TEXT NOT NULL,
    "accepteLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accord_negoce_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "facture_negoce" (
    "id" UUID NOT NULL,
    "lotId" UUID NOT NULL,
    "negoceId" UUID NOT NULL,
    "accordId" UUID NOT NULL,
    "numero" SERIAL NOT NULL,
    "totalLotHt" DECIMAL(14,2) NOT NULL,
    "montantHt" DECIMAL(14,2) NOT NULL,
    "pdf" BYTEA,
    "emiseLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "echeanceLe" DATE NOT NULL,
    "envoyeeLe" TIMESTAMP(3),
    "relanceeLe" TIMESTAMP(3),
    "payeeLe" TIMESTAMP(3),
    "statut" TEXT NOT NULL DEFAULT 'emise',

    CONSTRAINT "facture_negoce_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "accord_negoce_lotId_negoceId_key" ON "accord_negoce"("lotId", "negoceId");
CREATE UNIQUE INDEX IF NOT EXISTS "facture_negoce_lotId_key" ON "facture_negoce"("lotId");
CREATE UNIQUE INDEX IF NOT EXISTS "facture_negoce_accordId_key" ON "facture_negoce"("accordId");
CREATE UNIQUE INDEX IF NOT EXISTS "facture_negoce_numero_key" ON "facture_negoce"("numero");
CREATE INDEX IF NOT EXISTS "facture_negoce_negoceId_statut_idx" ON "facture_negoce"("negoceId", "statut");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'accord_negoce_lotId_fkey') THEN
    ALTER TABLE "accord_negoce" ADD CONSTRAINT "accord_negoce_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "lot_groupe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'accord_negoce_negoceId_fkey') THEN
    ALTER TABLE "accord_negoce" ADD CONSTRAINT "accord_negoce_negoceId_fkey" FOREIGN KEY ("negoceId") REFERENCES "negoce"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'facture_negoce_lotId_fkey') THEN
    ALTER TABLE "facture_negoce" ADD CONSTRAINT "facture_negoce_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "lot_groupe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'facture_negoce_negoceId_fkey') THEN
    ALTER TABLE "facture_negoce" ADD CONSTRAINT "facture_negoce_negoceId_fkey" FOREIGN KEY ("negoceId") REFERENCES "negoce"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'facture_negoce_accordId_fkey') THEN
    ALTER TABLE "facture_negoce" ADD CONSTRAINT "facture_negoce_accordId_fkey" FOREIGN KEY ("accordId") REFERENCES "accord_negoce"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
