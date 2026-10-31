-- Avancement de l'import Sirene et autres états de travail du groupé (dette n° 1).
CREATE TABLE "parametre_groupe" (
    "cle" TEXT NOT NULL,
    "valeur" JSONB NOT NULL,
    "misAJourLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parametre_groupe_pkey" PRIMARY KEY ("cle")
);
