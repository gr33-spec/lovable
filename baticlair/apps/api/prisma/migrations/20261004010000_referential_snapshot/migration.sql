-- Version figée par chantier : le référentiel enregistré à la version rencontrée, relu pour chaque recalcul.
CREATE TABLE "referential_snapshot" (
  "trade" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "data" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "referential_snapshot_pkey" PRIMARY KEY ("version")
);
