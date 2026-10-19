import { PDFDocument, StandardFonts } from "pdf-lib";
import { CONTEXTE_7954, DEVIS_7954 } from "../../../../packages/domain/test/devis-reels/devis-7954.js";

/**
 * Le devis 7954 ANONYMISÉ (décision du fondateur, 2026-10-13 : « anonymise-le comme D.2026.105 et lance la vraie lecture
 * en CI ») : régénéré à la volée depuis la transcription du dépôt (`packages/domain/test/devis-reels/devis-7954.ts` :
 * titres, désignations, quantités, unités ; ni nom, ni adresse, ni prix ; seule la ville reste, le bref attendu la cite).
 * Les prix sont fictifs. Le PDF du client ne passe jamais par le dépôt ni par la CI.
 */
export async function DEVIS_7954_PDF(): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const clean = (t: string) => t.replace(/[’]/g, "'").replace(/[–—]/g, "-").replace(/[^\x20-\x7E\u00A0-\u00FF]/g, " ");
  let page = pdf.addPage([595.28, 841.89]);
  let y = 800;
  const nouvelle = () => {
    page = pdf.addPage([595.28, 841.89]);
    y = 800;
  };
  const ecrire = (text: string, x: number, size = 8, f = font) => page.drawText(clean(text), { x, y, size, font: f });
  // Coupe une désignation longue en lignes de 70 caractères au plus.
  const couper = (t: string, max = 70) => {
    const out: string[] = [];
    let cur = "";
    for (const w of t.split(/\s+/)) {
      if ((cur + " " + w).trim().length > max) {
        out.push(cur);
        cur = w;
      } else cur = (cur + " " + w).trim();
    }
    if (cur) out.push(cur);
    return out;
  };
  ecrire("DEVIS N° 7954 (anonymisé)", 40, 13, bold);
  y -= 18;
  ecrire(`${CONTEXTE_7954.sujet} - ${CONTEXTE_7954.ville}`, 40, 9);
  for (const m of CONTEXTE_7954.mentions) {
    y -= 12;
    ecrire(m, 40, 7);
  }
  y -= 20;
  const cols = { ref: 40, des: 70, qte: 420, unite: 460, pu: 490, total: 535 };
  ecrire("N°", cols.ref, 8, bold);
  ecrire("Désignation", cols.des, 8, bold);
  ecrire("Qté", cols.qte, 8, bold);
  ecrire("U", cols.unite, 8, bold);
  ecrire("P.U. HT", cols.pu, 8, bold);
  ecrire("Total HT", cols.total, 8, bold);
  let titres: string[] = [];
  for (const l of DEVIS_7954) {
    const parts = l.section.split(" › ");
    const commun = parts.findIndex((p, i) => titres[i] !== p);
    const nouveaux = commun < 0 ? [] : parts.slice(commun);
    const lignes = couper(l.designation);
    if (y - 12 * (nouveaux.length + lignes.length) < 50) nouvelle();
    for (const [i, t] of nouveaux.entries()) {
      y -= 13;
      ecrire(t, cols.ref + 6 * (commun + i), 8.5, bold);
    }
    titres = parts;
    y -= 12;
    ecrire(l.ref, cols.ref);
    ecrire(lignes[0]!, cols.des);
    if (l.quantity) ecrire(l.quantity, cols.qte);
    if (l.unit) ecrire(l.unit, cols.unite);
    ecrire("10,00", cols.pu);
    ecrire("10,00", cols.total);
    for (const suite of lignes.slice(1)) {
      y -= 10;
      ecrire(suite, cols.des);
    }
  }
  if (y < 80) nouvelle();
  y -= 24;
  ecrire("Total HT (fictif)", 420, 9, bold);
  return pdf.save();
}
