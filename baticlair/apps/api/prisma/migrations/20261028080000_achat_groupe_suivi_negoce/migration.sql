-- PAGE NÉGOCE (Greg, 28 octobre 2026, point 3) : suivi par négoce dans l'admin (vu, PDF téléchargé, Excel téléchargé, répondu).
-- AlterTable
ALTER TABLE "consultation_achat_groupe" ADD COLUMN     "vu_le" TIMESTAMPTZ(3),
ADD COLUMN     "pdf_telecharge_le" TIMESTAMPTZ(3),
ADD COLUMN     "excel_telecharge_le" TIMESTAMPTZ(3);
