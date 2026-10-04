-- Fichiers envoyés en morceaux (requête limitée à 4,5 Mo chez l'hébergeur) : recollés au dernier morceau.
CREATE TABLE "upload_part" (
    "uploadId" UUID NOT NULL,
    "index" INTEGER NOT NULL,
    "companyId" UUID NOT NULL,
    "bytes" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upload_part_pkey" PRIMARY KEY ("uploadId","index")
);

CREATE INDEX "upload_part_createdAt_idx" ON "upload_part"("createdAt");

ALTER TABLE "upload_part" ADD CONSTRAINT "upload_part_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
