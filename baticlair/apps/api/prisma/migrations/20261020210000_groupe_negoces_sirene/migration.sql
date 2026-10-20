-- Base négoces préremplie depuis l'API Sirene (plan du 20 octobre, bloc 3).
CREATE TABLE "negoce_sirene" (
    "siret" TEXT NOT NULL,
    "siren" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "adresse" TEXT NOT NULL,
    "codePostal" TEXT NOT NULL,
    "commune" TEXT NOT NULL,
    "departement" TEXT NOT NULL,
    "naf" TEXT NOT NULL,
    "importeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "negoce_sirene_pkey" PRIMARY KEY ("siret")
);

CREATE INDEX "negoce_sirene_departement_idx" ON "negoce_sirene"("departement");
