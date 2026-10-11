-- §51.5 : la lecture du devis par le modèle (fiche, bref, questions, fournitures par ligne), gardée telle quelle.
ALTER TABLE "takeoff" ADD COLUMN "lecture" JSONB;
