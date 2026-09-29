-- Adresse publique des variantes d'une image, fournie par le stockage au
-- moment de l'envoi (certains stockages, comme Vercel Blob, choisissent le
-- nom de domaine). NULL : adresse calculée à partir de l'identifiant.
ALTER TABLE image ADD COLUMN base_url text CHECK (base_url IS NULL OR (length(base_url) <= 500 AND base_url ~ '^(https://|/)[^\s<>"]+$'));

-- Créations d'exemple (démonstration) : repérables pour être supprimées d'un clic.
ALTER TABLE product ADD COLUMN is_demo boolean NOT NULL DEFAULT false;
