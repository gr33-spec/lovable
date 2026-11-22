-- La messagerie (Greg, 22 novembre 2026) : « Envoyés », ce que Mobiiz a envoyé au nom de l'artisan. Migration additive.
CREATE TABLE "message_envoye" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "project_id" UUID,
    "recipient_id" UUID,
    "repond_a" UUID,
    "sorte" TEXT NOT NULL,
    "destinataire" TEXT NOT NULL,
    "objet" TEXT NOT NULL,
    "texte" TEXT NOT NULL,
    "pieces" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "envoye_le" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "message_envoye_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "message_envoye_company_id_envoye_le_idx" ON "message_envoye"("company_id", "envoye_le");
CREATE INDEX "message_envoye_recipient_id_idx" ON "message_envoye"("recipient_id");
ALTER TABLE "message_envoye" ADD CONSTRAINT "message_envoye_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Retour arrière : DROP TABLE "message_envoye";
