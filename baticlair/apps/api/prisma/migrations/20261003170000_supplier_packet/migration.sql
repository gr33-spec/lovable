-- Prompt A (§41.1) : ce que la lecture renvoie en plus, gardé pour l'annexe fournisseur (§42).
ALTER TABLE "takeoff" ADD COLUMN "context" JSONB;
ALTER TABLE "takeoff_line" ADD COLUMN "material" TEXT;
ALTER TABLE "takeoff_line" ADD COLUMN "dimensions" JSONB;

-- §43 : le contenu envoyé au fournisseur (trois blocs), figé avec la demande.
ALTER TABLE "price_request" ADD COLUMN "packet" JSONB;

-- §42.2 : case « Joindre le détail du chantier », mémorisée par entreprise.
ALTER TABLE "company" ADD COLUMN "attachQuoteDetail" BOOLEAN NOT NULL DEFAULT true;
