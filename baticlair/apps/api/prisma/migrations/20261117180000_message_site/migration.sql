-- « Demander un devis » depuis le site de l'artisan (Greg, 17 novembre 2026) : la copie du message dans « Messages et
-- réponses ». Additive. Retour arrière : DROP TABLE "message_site";
CREATE TABLE "message_site" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "nom" TEXT NOT NULL,
    "telephone" TEXT,
    "email" TEXT,
    "commune" TEXT,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lu_le" TIMESTAMPTZ(3),

    CONSTRAINT "message_site_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "message_site_company_id_created_at_idx" ON "message_site"("company_id", "created_at");

ALTER TABLE "message_site" ADD CONSTRAINT "message_site_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
