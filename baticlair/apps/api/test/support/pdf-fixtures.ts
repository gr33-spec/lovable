import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

/**
 * Faux documents de couvreur générés à la volée (aucune donnée réelle).
 * Page « texte » : un vrai tableau de devis ; page « scan » : uniquement
 * des formes, sans couche texte ; page « CGV » : conditions générales.
 */
export type FixturePage = "devis" | "scan" | "cgv" | "totaux";

const DEVIS_LINES: [string, string, string, string, string][] = [
  ["TUI-RC12", "Tuile romane canal rouge 12,5 u/m²", "1 250 u", "1,12", "1 400,00"],
  ["FAI-R", "Faîtière ronde à emboîtement", "42 u", "4,85", "203,70"],
  ["LIT-2738", "Liteau sapin traité classe 2 27x38", "480 ml", "0,62", "297,60"],
  ["ECR-HPV", "Écran sous-toiture HPV 1,5x50 m", "4 rouleau", "89,00", "356,00"],
  ["CRO-INOX", "Crochet inox ardoise 100 mm", "2 paquet", "18,40", "36,80"],
  ["GOU-ZN33", "Gouttière zinc demi-ronde dév. 33", "36 ml", "14,20", "511,20"],
];

export async function makePdf(pages: FixturePage[]): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (const kind of pages) {
    const page = pdf.addPage([595.28, 841.89]);
    let y = 780;
    const write = (text: string, x = 40, size = 10) => {
      page.drawText(text, { x, y, size, font });
    };
    if (kind === "devis") {
      write("DEVIS N° 2026-118 – Toitures Martin", 40, 14);
      y -= 30;
      const cols = [40, 110, 330, 420, 490];
      ["Réf.", "Désignation", "Qté", "P.U. HT", "Total HT"].forEach((h, i) => write(h, cols[i]));
      for (const row of DEVIS_LINES) {
        y -= 18;
        row.forEach((cell, i) => write(cell, cols[i]));
      }
      y -= 30;
      write("Total HT 2 805,30   TVA 10 % 280,53   Total TTC 3 085,83");
    } else if (kind === "totaux") {
      write("Total HT 12 450,00");
      y -= 16;
      write("TVA 10 % 1 245,00");
      y -= 16;
      write("Total TTC 13 695,00");
    } else if (kind === "cgv") {
      write("CONDITIONS GÉNÉRALES DE VENTE", 40, 12);
      const text = [
        "Article 1 – Objet. Les présentes conditions générales s'appliquent à toutes les ventes conclues.",
        "Article 2 – Clause de réserve de propriété : les marchandises restent la propriété du vendeur",
        "jusqu'au paiement intégral du prix. En cas de litige, le tribunal de commerce est seul compétent.",
        "Pénalités de retard : trois fois le taux d'intérêt légal, et indemnité forfaitaire pour frais de recouvrement.",
      ];
      for (const t of text) {
        y -= 16;
        write(t, 40, 9);
      }
    } else {
      // « Scan » : des rectangles gris, aucune couche texte.
      for (let i = 0; i < 20; i++) {
        page.drawRectangle({ x: 40, y: 780 - i * 30, width: 500, height: 12, color: rgb(0.7, 0.7, 0.7) });
      }
    }
  }
  return pdf.save();
}
