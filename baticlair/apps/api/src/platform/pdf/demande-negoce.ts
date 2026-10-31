import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { qrCode } from "../qr/qr.js";
import { LOGO_MONO_PNG_BASE64, LOGO_MONO_TAILLE } from "./logo-mono.js";

/**
 * PAGE NÉGOCE (Greg, 28 octobre 2026, point 3) : la demande en PDF, « Télécharger en PDF » et jointe à l'e-mail.
 * Logo Mobiiz, titre, date de livraison souhaitée, date limite de réponse, « De la part de vos clients X et Y, via Mobiiz »
 * (seulement SES clients), le tableau (référence catalogue, désignation, quantité cumulée, unité), les règles en une ligne,
 * un QR code vers le lien de réponse. Aucun champ à remplir, jamais le nom ni la commune d'une autre entreprise, lisible
 * imprimé en A4 noir et blanc. Et l'offre du négoce en PDF, jointe à l'e-mail de confirmation.
 */
export interface DemandeNegocePdf {
  titre: string;
  livraisonAvantLe: string;
  reponseAvantLe: string;
  dePart: string;
  lignes: readonly { reference: string; designation: string; quantite: string; unite: string }[];
  regles: string;
  lien: string;
}

export interface OffreNegocePdf {
  titre: string;
  negoce: string;
  envoyeeLe: string;
  lignes: readonly { reference: string; designation: string; quantite: string; unite: string; prixHt: string | null; totalHt: string | null }[];
  totalHt: string;
  manquantes: readonly string[];
  delai: string | null;
  commentaire: string | null;
}

const safe = (t: string) => t.replace(/≈/g, "env.").replace(/→/g, "->").replace(/×/g, "x").replace(/[^\x20-\x7E\xA0-\xFFŒœ–—‘’“”…€•]/g, "?");
const PAGE = { w: 595.28, h: 841.89, m: 40 };
const ENCRE = rgb(0.05, 0.06, 0.08);
const GRIS = rgb(0.45, 0.45, 0.45);

class Feuille {
  page!: PDFPage;
  y = 0;
  constructor(
    private readonly pdf: PDFDocument,
    readonly font: PDFFont,
    readonly gras: PDFFont,
  ) {
    this.nouvelle();
  }
  nouvelle() {
    this.page = this.pdf.addPage([PAGE.w, PAGE.h]);
    this.y = PAGE.h - PAGE.m;
  }
  texte(t: string, x: number, taille = 10, f = this.font, couleur = ENCRE) {
    this.page.drawText(safe(t), { x, y: this.y, size: taille, font: f, color: couleur });
  }
  tronque(t: string, largeur: number, taille = 10, f = this.font) {
    const s = safe(t);
    let d = s;
    while (f.widthOfTextAtSize(d, taille) > largeur && d.length > 4) d = d.slice(0, -2);
    return d === s ? d : `${d}…`;
  }
  /** Un paragraphe replié sur la largeur de la page. */
  paragraphe(t: string, taille = 10, f = this.font, couleur = ENCRE, largeur = PAGE.w - 2 * PAGE.m) {
    const mots = safe(t).split(/\s+/);
    let ligne = "";
    const lignes: string[] = [];
    for (const m of mots) {
      const essai = ligne ? `${ligne} ${m}` : m;
      if (f.widthOfTextAtSize(essai, taille) > largeur && ligne) {
        lignes.push(ligne);
        ligne = m;
      } else ligne = essai;
    }
    if (ligne) lignes.push(ligne);
    for (const l of lignes) {
      this.page.drawText(l, { x: PAGE.m, y: this.y, size: taille, font: f, color: couleur });
      this.y -= taille * 1.35;
    }
  }
  ligneFine() {
    this.page.drawLine({ start: { x: PAGE.m, y: this.y }, end: { x: PAGE.w - PAGE.m, y: this.y }, thickness: 0.5, color: rgb(0.6, 0.6, 0.6) });
  }
  async logo() {
    const logo = await this.pdf.embedPng(Buffer.from(LOGO_MONO_PNG_BASE64, "base64"));
    const h = 20;
    this.page.drawImage(logo, { x: PAGE.m, y: this.y - h, width: (h * LOGO_MONO_TAILLE.largeur) / LOGO_MONO_TAILLE.hauteur, height: h });
    this.y -= h + 18;
  }
  /** Le QR code dessiné module par module : net imprimé, sans image. */
  qr(texte: string, x: number, yHaut: number, taillePt: number) {
    const q = qrCode(texte);
    const marge = 4;
    const module = taillePt / (q.taille + 2 * marge);
    this.page.drawRectangle({ x, y: yHaut - taillePt, width: taillePt, height: taillePt, color: rgb(1, 1, 1) });
    for (let r = 0; r < q.taille; r++) {
      for (let c = 0; c < q.taille; c++) {
        if (!q.modules[r * q.taille + c]) continue;
        this.page.drawRectangle({ x: x + (c + marge) * module, y: yHaut - (r + marge + 1) * module, width: module + 0.15, height: module + 0.15, color: ENCRE });
      }
    }
  }
}

const COLS_DEMANDE = [PAGE.m, 150, 420, 490, PAGE.w - PAGE.m];

export async function demandeNegocePdf(d: DemandeNegocePdf): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(d.titre);
  const f = new Feuille(pdf, await pdf.embedFont(StandardFonts.Helvetica), await pdf.embedFont(StandardFonts.HelveticaBold));
  await f.logo();
  f.texte(d.titre, PAGE.m, 16, f.gras);
  f.y -= 22;
  f.texte(`Livraison souhaitée avant le ${d.livraisonAvantLe}`, PAGE.m, 10);
  f.y -= 14;
  f.texte(`Réponse attendue avant le ${d.reponseAvantLe}`, PAGE.m, 10, f.gras);
  f.y -= 18;
  f.paragraphe(d.dePart, 10, f.font, GRIS);
  f.y -= 10;
  const entete = () => {
    ["Référence", "Désignation", "Quantité", "Unité"].forEach((t, i) => f.texte(t, COLS_DEMANDE[i]!, 9, f.gras));
    f.y -= 6;
    f.ligneFine();
    f.y -= 13;
  };
  entete();
  for (const l of d.lignes) {
    if (f.y < PAGE.m + 40) {
      f.nouvelle();
      entete();
    }
    f.texte(f.tronque(l.reference, COLS_DEMANDE[1]! - COLS_DEMANDE[0]! - 8, 9), COLS_DEMANDE[0]!, 9, f.font, GRIS);
    f.texte(f.tronque(l.designation, COLS_DEMANDE[2]! - COLS_DEMANDE[1]! - 8), COLS_DEMANDE[1]!);
    const q = safe(l.quantite);
    f.texte(q, COLS_DEMANDE[3]! - 8 - f.font.widthOfTextAtSize(q, 10), 10);
    f.texte(l.unite, COLS_DEMANDE[3]!);
    f.y -= 14;
  }
  f.y -= 2;
  f.ligneFine();
  f.y -= 18;
  const QR = 110;
  if (f.y < PAGE.m + QR + 40) f.nouvelle();
  f.paragraphe(d.regles, 9, f.font, ENCRE);
  f.y -= 8;
  f.texte("Répondre en ligne, sans inscription :", PAGE.m, 10, f.gras);
  f.y -= 14;
  f.paragraphe(d.lien, 9, f.font, GRIS, PAGE.w - 2 * PAGE.m - QR - 16);
  f.qr(d.lien, PAGE.w - PAGE.m - QR, f.y + 14 * 2 + 10, QR);
  return pdf.save();
}

const COLS_OFFRE = [PAGE.m, 130, 330, 400, 460, PAGE.w - PAGE.m];

export async function offreNegocePdf(o: OffreNegocePdf): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Offre ${o.negoce} · ${o.titre}`);
  const f = new Feuille(pdf, await pdf.embedFont(StandardFonts.Helvetica), await pdf.embedFont(StandardFonts.HelveticaBold));
  await f.logo();
  f.texte(`Votre offre · ${o.titre}`, PAGE.m, 16, f.gras);
  f.y -= 22;
  f.texte(o.negoce, PAGE.m, 10);
  f.y -= 14;
  f.texte(`Envoyée le ${o.envoyeeLe}`, PAGE.m, 10, f.font, GRIS);
  f.y -= 24;
  const entete = () => {
    ["Référence", "Désignation", "Quantité", "Prix HT", "Total HT"].forEach((t, i) => f.texte(t, COLS_OFFRE[i]!, 9, f.gras));
    f.y -= 6;
    f.ligneFine();
    f.y -= 13;
  };
  entete();
  for (const l of o.lignes) {
    if (f.y < PAGE.m + 80) {
      f.nouvelle();
      entete();
    }
    f.texte(f.tronque(l.reference, COLS_OFFRE[1]! - COLS_OFFRE[0]! - 8, 9), COLS_OFFRE[0]!, 9, f.font, GRIS);
    f.texte(f.tronque(l.designation, COLS_OFFRE[2]! - COLS_OFFRE[1]! - 8), COLS_OFFRE[1]!);
    f.texte(`${l.quantite} ${l.unite}`, COLS_OFFRE[2]!);
    f.texte(l.prixHt ?? "non fourni", COLS_OFFRE[3]!, 10, f.font, l.prixHt ? ENCRE : GRIS);
    if (l.totalHt) f.texte(l.totalHt, COLS_OFFRE[4]!);
    f.y -= 14;
  }
  f.y -= 2;
  f.ligneFine();
  f.y -= 16;
  f.texte("Total HT livré", COLS_OFFRE[0]!, 11, f.gras);
  f.texte(o.totalHt, COLS_OFFRE[4]!, 11, f.gras);
  f.y -= 18;
  if (o.manquantes.length) f.paragraphe(`Non fourni : ${o.manquantes.join(", ")}.`, 9, f.font, GRIS);
  if (o.delai) f.paragraphe(`Délai de livraison : ${o.delai}.`, 10);
  if (o.commentaire) f.paragraphe(`Commentaire : ${o.commentaire}`, 10);
  f.y -= 6;
  f.paragraphe("Offre ferme sur le volume engagé jusqu'à la date de commande, livraison comprise. Une seule offre, sans deuxième tour.", 9, f.font, GRIS);
  return pdf.save();
}
