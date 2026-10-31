import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { LOGO_MONO_PNG_BASE64, LOGO_MONO_TAILLE } from "./logo-mono.js";

/**
 * LE BON DE COMMANDE (business model final, Greg, 25 octobre 2026) : le seul document de Mobiiz où des champs restent
 * remplissables (formulaire PDF) : numéro de compte client, date de livraison souhaitée, contact sur le chantier,
 * observations. Le reste est figé : l'acheteur, le vendeur, les lignes, les prix HT, le total livré.
 */
export interface BonDeCommande {
  numero: string;
  date: string;
  acheteur: { nom: string; adresse: string | null; telephone: string | null; email: string | null };
  vendeur: { nom: string; email: string | null };
  livraison: string | null;
  lignes: { designation: string; quantite: string; unite: string; prixHt: string; totalHt: string }[];
  livraisonHt: string;
  totalHt: string;
  mentions: string[];
}

const safe = (t: string) => t.replace(/≈/g, "env.").replace(/→/g, "->").replace(/[^\x20-\x7E\xA0-\xFFŒœ–—‘’“”…€•]/g, "?");
const PAGE = { w: 595.28, h: 841.89, m: 40 };

export const CHAMPS_BON = ["Numéro de compte client", "Date de livraison souhaitée", "Contact sur le chantier", "Observations"] as const;

export async function bonDeCommandePdf(b: BonDeCommande): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Bon de commande ${b.numero}`);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const gras = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([PAGE.w, PAGE.h]);
  let y = PAGE.h - PAGE.m;
  const logo = await pdf.embedPng(Buffer.from(LOGO_MONO_PNG_BASE64, "base64"));
  const hLogo = 20;
  page.drawImage(logo, { x: PAGE.m, y: y - hLogo, width: (hLogo * LOGO_MONO_TAILLE.largeur) / LOGO_MONO_TAILLE.hauteur, height: hLogo });
  y -= hLogo + 18;
  const texte = (t: string, x: number, taille = 10, f = font) => page.drawText(safe(t), { x, y, size: taille, font: f, color: rgb(0.1, 0.1, 0.1) });
  texte(`Bon de commande n° ${b.numero}`, PAGE.m, 16, gras);
  texte(b.date, PAGE.w - PAGE.m - font.widthOfTextAtSize(safe(b.date), 10), 10);
  y -= 26;
  texte("Acheteur", PAGE.m, 9, gras);
  texte("Vendeur", PAGE.w / 2, 9, gras);
  y -= 13;
  const gauche = [b.acheteur.nom, b.acheteur.adresse, b.acheteur.telephone, b.acheteur.email].filter((x): x is string => !!x);
  const droite = [b.vendeur.nom, b.vendeur.email].filter((x): x is string => !!x);
  for (let i = 0; i < Math.max(gauche.length, droite.length); i++) {
    if (gauche[i]) texte(gauche[i]!, PAGE.m);
    if (droite[i]) texte(droite[i]!, PAGE.w / 2);
    y -= 13;
  }
  if (b.livraison) {
    y -= 4;
    texte(`Livraison : ${b.livraison}`, PAGE.m);
    y -= 13;
  }
  y -= 10;
  const cols = [PAGE.m, 330, 400, 470, PAGE.w - PAGE.m];
  const entete = ["Article", "Quantité", "Prix HT", "Total HT"];
  entete.forEach((t, i) => texte(t, cols[i]!, 9, gras));
  y -= 6;
  page.drawLine({ start: { x: PAGE.m, y }, end: { x: PAGE.w - PAGE.m, y }, thickness: 0.5, color: rgb(0.6, 0.6, 0.6) });
  y -= 13;
  for (const l of b.lignes) {
    const designation = safe(l.designation);
    let d = designation;
    while (font.widthOfTextAtSize(d, 10) > cols[1]! - cols[0]! - 8 && d.length > 4) d = d.slice(0, -2);
    texte(d === designation ? d : `${d}…`, cols[0]!);
    texte(`${l.quantite} ${l.unite}`, cols[1]!);
    texte(l.prixHt, cols[2]!);
    texte(l.totalHt, cols[3]!);
    y -= 14;
    if (y < 260) break;
  }
  texte("Livraison", cols[0]!);
  texte(b.livraisonHt, cols[3]!);
  y -= 16;
  texte("Total HT livré", cols[0]!, 11, gras);
  texte(b.totalHt, cols[3]!, 11, gras);
  y -= 30;

  // Les seuls champs remplissables.
  const form = pdf.getForm();
  for (const nom of CHAMPS_BON) {
    texte(nom, PAGE.m, 9, gras);
    y -= 4;
    const haut = nom === "Observations" ? 48 : 20;
    const champ = form.createTextField(nom);
    if (nom === "Observations") champ.enableMultiline();
    champ.addToPage(page, { x: PAGE.m, y: y - haut, width: PAGE.w - 2 * PAGE.m, height: haut, font, borderColor: rgb(0.6, 0.6, 0.6) });
    y -= haut + 14;
  }
  for (const m of b.mentions) {
    texte(m, PAGE.m, 8);
    y -= 11;
  }
  return pdf.save();
}
