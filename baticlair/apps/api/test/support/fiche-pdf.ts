import { PDFDocument, StandardFonts } from "pdf-lib";
import type { FicheMetier } from "@baticlair/domain";

/**
 * §52 : le devis d'épreuve de la section 6 d'une fiche métier, mis en PDF comme un devis d'artisan (en-tête, tableau
 * désignation / quantité / unité), pour la vraie lecture du métier au retour du crédit (`lecture-reelle.ts
 * fixture:fiche:<code>`). Devis écrit à la main, anonyme : ni nom, ni adresse, ni prix.
 */
export async function FICHE_PDF(f: FicheMetier): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const clean = (t: string) => t.replace(/[’]/g, "'").replace(/[–—]/g, "-").replace(/[^\x20-\x7E\u00A0-\u00FF]/g, " ");
  let page = pdf.addPage([595.28, 841.89]);
  let y = 800;
  const ecrire = (text: string, x: number, size = 9, f2 = font) => page.drawText(clean(text), { x, y, size, font: f2 });
  ecrire(`DEVIS D'ÉPREUVE - ${f.nom} (anonyme)`, 40, 13, bold);
  y -= 26;
  ecrire("Désignation", 40, 9, bold);
  ecrire("Qté", 450, 9, bold);
  ecrire("Unité", 500, 9, bold);
  for (const l of f.test.devis) {
    y -= 16;
    if (y < 60) {
      page = pdf.addPage([595.28, 841.89]);
      y = 800;
    }
    ecrire(`${l.ligne}  ${l.designation}`, 40);
    ecrire(l.quantite, 450);
    ecrire(l.unite, 500);
  }
  return pdf.save();
}
