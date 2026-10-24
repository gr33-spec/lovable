import { PDFDocument, StandardFonts, type PDFFont } from "pdf-lib";

/**
 * Un PDF de texte simple (la demande aux négoces, le contrat de commission) : un titre, des blocs faits de lignes ou de
 * tableaux. Les caractères que la police standard ne sait pas écrire sont remplacés, jamais une erreur.
 */
export interface BlocPdf {
  titre?: string;
  lignes: readonly (string | readonly string[])[];
}

const safe = (t: string) => t.replace(/≈/g, "env.").replace(/→/g, "->").replace(/[^\x20-\x7E\xA0-\xFFŒœ–—‘’“”…€•]/g, "?");
const PAGE = { w: 595.28, h: 841.89, marge: 40 };

function couper(font: PDFFont, texte: string, taille: number, largeur: number): string[] {
  const mots = safe(texte).split(" ");
  const lignes: string[] = [];
  let courante = "";
  for (const mot of mots) {
    const essai = courante ? `${courante} ${mot}` : mot;
    if (font.widthOfTextAtSize(essai, taille) <= largeur || !courante) courante = essai;
    else {
      lignes.push(courante);
      courante = mot;
    }
  }
  if (courante) lignes.push(courante);
  return lignes;
}

export async function pdfDeTexte(titre: string, blocs: readonly BlocPdf[]): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const gras = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([PAGE.w, PAGE.h]);
  let y = PAGE.h - PAGE.marge;
  const largeur = PAGE.w - 2 * PAGE.marge;
  const ecrire = (texte: string, taille: number, f: PDFFont) => {
    for (const l of couper(f, texte, taille, largeur)) {
      if (y < PAGE.marge + taille) {
        page = pdf.addPage([PAGE.w, PAGE.h]);
        y = PAGE.h - PAGE.marge;
      }
      page.drawText(l, { x: PAGE.marge, y, size: taille, font: f });
      y -= taille * 1.45;
    }
  };
  ecrire(titre, 14, gras);
  y -= 8;
  for (const bloc of blocs) {
    if (bloc.titre) {
      y -= 6;
      ecrire(bloc.titre, 11, gras);
    }
    bloc.lignes.forEach((l, i) => {
      if (typeof l === "string") ecrire(l, 10, font);
      else ecrire(l.join("  ·  "), 10, i === 0 ? gras : font);
    });
    y -= 6;
  }
  return pdf.save();
}
