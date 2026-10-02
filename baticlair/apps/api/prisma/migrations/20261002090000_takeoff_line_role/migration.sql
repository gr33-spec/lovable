-- Rôle de la quantité d'une ligne du devis : mesure d'ouvrage, à commander, ou indéterminé.
ALTER TABLE "takeoff_line" ADD COLUMN "role" TEXT;
