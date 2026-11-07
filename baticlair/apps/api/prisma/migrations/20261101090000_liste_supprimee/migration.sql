-- CreateTable
CREATE TABLE "liste_supprimee" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "user_id" TEXT,
    "supprimee_le" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "liste_supprimee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "liste_supprimee_company_id_project_id_key" ON "liste_supprimee"("company_id", "project_id");

-- AddForeignKey
ALTER TABLE "liste_supprimee" ADD CONSTRAINT "liste_supprimee_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

