-- Les références des artisans (Greg, 31 octobre 2026, soir) : un intitulé écrit par deux entreprises, ou commandé en achat
-- groupé, devient une référence partagée ; l'admin peut en écarter une (jamais supprimée des intitulés écrits).
CREATE TABLE "reference_ecartee" (
    "cle" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reference_ecartee_pkey" PRIMARY KEY ("cle")
);
