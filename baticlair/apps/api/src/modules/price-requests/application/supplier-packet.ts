import { MENTION_RATIOS, priceLeak, NEW_PROJECT_NAME } from "@baticlair/domain";
import { NOM_APP, CONDITIONS_PDF, hexCouleurPdf, MODELE_PDF_DEFAUT, PHRASE_REPONSE_PDF, quantiteEtUnite, TITRE_PDF, type ModelePdf } from "@baticlair/domain";
// Le test du prix (§42.2, §43.5) vit dans le domaine, à côté du bref (§50.7) qui s'en sert aussi.
export { priceLeak };
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";

/**
 * CE QUE REÇOIT LE FOURNISSEUR (référentiel §42, §43, §45) : une DEMANDE DE DEVIS, jamais une commande.
 * Un mail court (§45.2) et un seul PDF structuré (§45.3), assemblés depuis des données déjà calculées, sans IA.
 * L'aperçu avant envoi (§45.9), l'export « Exporter la liste en PDF » et le PDF joint sont trois rendus du MÊME
 * document (`packetDocument`). Aucun prix n'y entre : les montants du devis client n'existent pas ici.
 */
export interface PacketSupply {
  designation: string;
  /** Dans l'unité de vente, avec la longueur à couvrir quand elle diffère (« 4 longueurs de 4 m (13 ml à couvrir) »). */
  quantite: string;
  /** Ce qui sert au comptoir (« pour façonner 13 ml de bande, développé 33 cm », « croquis joint »). */
  precision: string | null;
  /** En fin de tableau, groupe « consommables » (§45.3, §45.8). */
  consommable?: boolean;
  /** Clé de l'article dans la liste : l'aperçu (§45.9) corrige la liste elle-même. Jamais imprimée. */
  cle?: string;
}

/** L'en-tête et la signature : les coordonnées du compte, jamais saisies à l'envoi (§45.2, §45.3). */
export interface PacketSender {
  /** Prénom ou nom de l'artisan (signature du mail). */
  nom: string;
  adresse: string | null;
  siret: string | null;
  telephone: string | null;
  email: string | null;
}

export interface SupplierPacket {
  entreprise: string;
  chantier: string;
  commune: string | null;
  /** Date de la demande, AAAA-MM-JJ. */
  date: string;
  /** Lignes prêtes à charger, en texte (« désignation : quantité ») ; les demandes d'avant le §45 n'ont que celles-ci. */
  articles: string[];
  /** Bloc 3 « À préciser avec vous » : la ligne du devis et sa mesure, « merci de proposer ce que vous avez ». */
  a_chiffrer: string[];
  /** Bloc 1 « Le chantier en bref » : 5 à 8 faits confirmés, jamais une hypothèse de l'app. */
  resume: string[];
  /** Bloc 4 (§42) : le devis sans les prix, une ligne par ouvrage. */
  detail: { libelle: string; mesure: string | null; precisions: string[] }[];
  /** Case « Joindre le détail du devis » (§42.2) : bloc 4 et PS du mail. */
  joindre_detail: boolean;
  /** Lien « une question ? » (§43.2, v3.1) ; null tant qu'il n'existe pas. */
  question_lien: string | null;
  /** Croquis joints à un article (dimensions d'une couvertine…) : rendus en pages du PDF, joints au mail. */
  croquis?: { article: string; id: string; nom: string; commentaire: string | null }[];
  /** §45 : bloc 2 « Fournitures à chiffrer », tableau désignation · quantité · précision. */
  fournitures?: PacketSupply[];
  /** §45.2 : la première phrase du mail, tirée du devis (« Je vous envoie la liste des fournitures pour… »). */
  phrase?: string;
  /** §45.2 : la signature et l'en-tête. */
  expediteur?: PacketSender;
  /** §45.3 : référence courte du chantier, à droite de l'en-tête. */
  reference?: string;
  /** Le mot de l'artisan, s'il en a écrit un, en paragraphe du mail. */
  message?: string | null;
  /** Réponse souhaitée avant le… (date en toutes lettres). */
  echeance?: string | null;
  /** Lot final, point 3 : le prénom de l'artisan (signature « Jean, Toitures Martin »). */
  prenom?: string | null;
  /** Lot final, point 3 : la famille de la demande (« couverture »), dans l'objet. */
  famille?: string | null;
  /** Lot final, point 4 : tutoiement choisi dans l'aperçu (vouvoiement par défaut). */
  tutoie?: boolean;
  /** §52 : le métier n'a pas encore été relu par un artisan ; le PDF porte « Ratios en cours de validation ». */
  ratios_en_validation?: boolean;
  /** Assistant (Greg, 31 octobre 2026, points 9 et 11) : l'adresse du chantier, si l'artisan la donne. */
  adresse_chantier?: string | null;
  /** Assistant, point 11 : « Livraison sur chantier le 12 novembre », « Retrait au dépôt »… si l'artisan le dit. */
  livraison?: string | null;
}

/** Le fichier d'un croquis, lu au moment de rendre le PDF (jamais gardé dans la demande figée). */
export interface SketchFile {
  id: string;
  mimeType: string;
  bytes: Uint8Array;
}

const dateFr = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!)).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).replace(/^1 /, "1er ");
};

/**
 * « Test » → « chantier Test » ; un nom qui le dit déjà reste tel quel. Un chantier encore sans nom (créé depuis le « + »,
 * devis sans client ni ville : test complet du 21 octobre, « chantier Nouveau chantier » dans l'objet) devient « chantier ».
 */
export const chantierLabel = (name: string) => (name.trim() === NEW_PROJECT_NAME ? "chantier" : /^chantier\b/i.test(name.trim()) ? name.trim() : `chantier ${name.trim()}`);

/** §45.2 : « Demande de devis · [entreprise] · [nom du chantier] ([ville]) ». */
export function packetSubject(p: SupplierPacket): string {
  // Lot final, point 3 (Greg) : « Entreprise Dupont : demande de prix couverture, Paimpol ».
  const quoi = ["demande de prix", p.famille?.trim().toLowerCase()].filter(Boolean).join(" ");
  return `${p.entreprise.trim() || "Demande de prix"}${p.entreprise.trim() ? ` : ${quoi}` : ""}${p.commune ? `, ${p.commune}` : ""}`;
}

/** Le pied du mail, discret (lot final, point 3). */
export const PIED_MAIL_NEGOCE = `${NOM_APP}, des artisans qui achètent ensemble.`;

/** La signature : « Jean, Toitures Martin » (lot final, point 3). Jamais l'e-mail personnel de l'artisan. */
export function packetSignature(p: SupplierPacket): string {
  const prenom = p.prenom?.trim() || p.expediteur?.nom?.trim().split(/\s+/)[0] || "";
  return [prenom, p.entreprise.trim()].filter(Boolean).join(", ");
}

/** Le texte libre par défaut, le seul que l'artisan peut modifier dans l'aperçu (lot final, point 4). */
export function texteLibreParDefaut(p: SupplierPacket): string {
  const tu = !!p.tutoie;
  const phrase = (p.phrase ?? `Je vous envoie la liste des fournitures pour le ${chantierLabel(p.chantier)}${p.commune ? ` à ${p.commune}` : ""}.`).replace(/\bJe vous envoie\b/, tu ? "Je t'envoie" : "Je vous envoie");
  return `${phrase} ${tu ? "Tu peux me chiffrer l'ensemble ?" : "Pouvez-vous me chiffrer l'ensemble ?"}`;
}

/** Le lien de réponse tel que l'aperçu le montre (le vrai est propre à chaque négoce, créé à l'envoi). */
export const LIEN_APERCU = "(votre lien personnel)";

/**
 * LE MAIL AU NÉGOCE (lot final, point 3, Greg) : vouvoiement par défaut, adressé au prénom du commercial s'il est connu ;
 * le texte libre de l'artisan (modifiable), UNE phrase de pression (« Je consulte plusieurs fournisseurs, réponse
 * souhaitée avant le … »), « Répondre en ligne » sans inscription, « vous pouvez aussi répondre à ce mail », le
 * portable (jamais l'e-mail personnel), la signature et un pied discret. Aucune invitation à s'inscrire, aucune commission.
 */
export function packetMail(p: SupplierPacket, o: { prenomCommercial?: string | null; lien?: string | null } = {}): string {
  const tu = !!p.tutoie;
  const prenom = o.prenomCommercial?.trim();
  const tel = p.expediteur?.telephone?.trim();
  return [
    `${tu ? "Salut" : "Bonjour"}${prenom ? ` ${prenom}` : ""},`,
    p.message?.trim() || texteLibreParDefaut(p),
    p.echeance ? `Je consulte plusieurs fournisseurs, réponse souhaitée avant le ${p.echeance}.` : "Je consulte plusieurs fournisseurs, réponse souhaitée rapidement.",
    [
      ...(o.lien ? [`${tu ? "Réponds" : "Répondre"} en ligne, sans inscription : ${o.lien}`] : []),
      tu ? "Tu peux aussi répondre directement à ce mail, il m'arrive." : "Vous pouvez aussi répondre directement à ce mail, il m'arrive.",
      `La liste est en pièce jointe (PDF)${p.joindre_detail ? ", avec le détail du devis sans prix" : ""}.`,
      ...(tel ? [`Un doute ? ${tu ? "Appelle-moi" : "Appelez-moi"} au ${tel}.`] : []),
    ].join("\n"),
    packetSignature(p),
    `--\n${PIED_MAIL_NEGOCE}`,
  ].join("\n\n");
}

export { mailEnHtml } from "../../../platform/email/mail-html.js";

/** Les demandes d'avant le §45 : « Ardoises : 9 200 pièces » → une ligne du tableau. */
function supplies(p: SupplierPacket): PacketSupply[] {
  if (p.fournitures) return p.fournitures;
  return p.articles.map((a) => {
    const i = a.lastIndexOf(" : ");
    return i > 0 ? { designation: a.slice(0, i), quantite: a.slice(i + 3), precision: null } : { designation: a, quantite: "", precision: null };
  });
}

/** LE DOCUMENT (§45.3), tel que le fournisseur le reçoit : le PDF et l'aperçu (§45.9) en sont deux rendus. */
export interface PacketDocument {
  entete: {
    entreprise: string;
    /** Adresse, SIRET, téléphone et mail (ce que le compte en a). */
    coordonnees: string[];
    titre: string;
    chantier: string;
    ville: string | null;
    date: string;
    reference: string | null;
    /** §52 : « Ratios en cours de validation » quand le métier n'a pas encore été relu par un artisan, sinon null. */
    mention: string | null;
  };
  destinataire: string | null;
  blocs: (
    /** `numero` 0 : un bloc sans numéro (le bref, en petit dans un cadre). */
    | { numero: number; titre: string; kind: "list"; lignes: string[] }
    | { numero: number; titre: string; kind: "table"; colonnes: [string, string, string]; lignes: PacketSupply[] }
  )[];
  croquis: { article: string; nom: string; commentaire: string | null }[];
  /** Assistant, point 9 : l'adresse du chantier et la livraison, quand elles sont connues (rien d'inventé). */
  chantierInfos: string[];
  /**
   * Assistant, point 10 : « Merci d'envoyer votre proposition commerciale à l'adresse suivante : » et l'adresse où la
   * réponse revient (celle qui sert déjà de « Répondre à » du mail ; jamais une adresse inventée), puis les conditions.
   */
  reponse: { phrase: string; adresse: string; conditions: string } | null;
  pied: { question: string | null; mention: string };
}

const BREF = "Le chantier en bref";

export function packetDocument(p: SupplierPacket, options: { destinataire?: string | null; reponse?: string | null } = {}): PacketDocument {
  const s = p.expediteur;
  const coordonnees = [s?.adresse, s?.siret ? `SIRET ${s.siret}` : null, [s?.telephone, s?.email].filter(Boolean).join(" · ") || null].filter((x): x is string => !!x);
  const blocs: PacketDocument["blocs"] = [];
  let n = 0;
  // Les blocs vides disparaissent, jamais de « néant » (§45.5).
  const resume = p.resume;
  // Le bref, en petit dans un cadre et sans numéro : la liste des fournitures est ce qu'on met en avant (retour du
  // fondateur, 2026-10-11).
  if (resume.length > 0) blocs.push({ numero: 0, titre: BREF, kind: "list", lignes: resume });
  // Du gros au petit, matériau principal en premier, consommables en dernier (§45.3).
  // Retour du fondateur (2026-10-12) : « 222 ml : écris 222 m » ; un mètre linéaire se dit « m » dans le document.
  const metres = (t: string) => t.replace(/(\d)\s*ml\b/g, "$1 m");
  const rows = supplies(p).map((r) => ({ ...r, quantite: metres(r.quantite), ...(r.precision ? { precision: metres(r.precision) } : {}) }));
  const ordered = [...rows.filter((r) => !r.consommable), ...rows.filter((r) => r.consommable)];
  if (ordered.length > 0) blocs.push({ numero: ++n, titre: "Fournitures à chiffrer", kind: "table", colonnes: ["Désignation", "Quantité", "Précision"], lignes: ordered });
  if (p.a_chiffrer.length > 0) blocs.push({ numero: ++n, titre: "À préciser avec vous", kind: "list", lignes: p.a_chiffrer });
  if (p.joindre_detail && p.detail.length > 0)
    blocs.push({ numero: ++n, titre: "Détail du devis", kind: "list", lignes: p.detail.map((d) => [d.libelle, ...(d.mesure ? [d.mesure] : []), ...d.precisions].join(" · ")) });
  const contact = [s?.telephone, s?.email].filter(Boolean).join(" · ");
  return {
    entete: { entreprise: p.entreprise, coordonnees, titre: TITRE_PDF, chantier: chantierLabel(p.chantier), ville: p.commune, date: dateFr(p.date), reference: p.reference ?? null, mention: p.ratios_en_validation ? MENTION_RATIOS : null },
    destinataire: options.destinataire ?? null,
    blocs,
    croquis: (p.croquis ?? []).map((c) => ({ article: c.article, nom: c.nom, commentaire: c.commentaire })),
    chantierInfos: [p.adresse_chantier?.trim() ? `Adresse du chantier : ${p.adresse_chantier.trim()}` : null, p.livraison?.trim() ? `Livraison : ${p.livraison.trim()}` : null].filter((x): x is string => !!x),
    reponse: options.reponse?.trim() ? { phrase: PHRASE_REPONSE_PDF, adresse: options.reponse.trim(), conditions: CONDITIONS_PDF } : null,
    pied: { question: contact ? `Une question sur ce chantier ? ${contact}` : p.question_lien ? `Une question sur ce chantier ? ${p.question_lien}` : null, mention: `Généré avec ${NOM_APP}` },
  };
}

/** Le texte du document, ligne à ligne : ce que l'aperçu montre et ce que le PDF écrit (§45.7 test 10). */
export function packetDocumentLines(d: PacketDocument): string[] {
  const out = [d.entete.entreprise, ...d.entete.coordonnees, d.entete.titre, d.entete.chantier, ...(d.entete.ville ? [d.entete.ville] : []), d.entete.date, ...(d.entete.reference ? [`Réf. ${d.entete.reference}`] : []), ...(d.entete.mention ? [d.entete.mention] : [])];
  if (d.destinataire) out.push(`À l'attention de : ${d.destinataire}`);
  out.push(...d.chantierInfos);
  for (const b of d.blocs) {
    out.push(b.numero > 0 ? `${b.numero}. ${b.titre}` : b.titre);
    if (b.kind === "list") out.push(...b.lignes);
    else for (const r of b.lignes) out.push([r.designation, r.quantite, r.precision ?? ""].join(" | "));
  }
  for (const c of d.croquis) out.push(`Croquis : ${[c.article, c.nom, ...(c.commentaire ? [c.commentaire] : [])].join(" · ")}`);
  if (d.reponse) out.push(d.reponse.phrase, d.reponse.adresse, d.reponse.conditions);
  return out;
}


/** Le vocabulaire du §45.4 : rien de la cuisine interne ne sort, jamais « commande ». */
export function forbiddenWord(text: string): string | null {
  // Le nom de l'application, l'ancien comme le nouveau (24 octobre 2026), n'apparaît jamais chez le fournisseur.
  const m = new RegExp(`\\b(?:commandes?|commander|command[ée]e?s?|bon de commande|r[ée]f[ée]rentiel|moteur|BatiClair|${NOM_APP}|zone climatique|poids pos[ée]|marge comprise|r[èe]gle de calcul)\\b`, "i").exec(text);
  return m ? m[0] : null;
}

/** Les caractères que la police standard du PDF ne sait pas écrire (WinAnsi) : remplacés, jamais une erreur. */
function pdfSafe(text: string): string {
  return text
    .replace(/≈/g, "env.")
    .replace(/≥/g, ">=")
    .replace(/≤/g, "<=")
    .replace(/→/g, "->")
    .replace(/[^\x20-\x7E\xA0-\xFFŒœ–—‘’“”…€•]/g, "?");
}

const INK = rgb(0.11, 0.12, 0.15);
const MUTED = rgb(0.42, 0.44, 0.5);
const RULE = rgb(0.85, 0.86, 0.89);
const BAND = rgb(0.95, 0.96, 0.97);
const BLANC = rgb(1, 1, 1);

/** « #FED206 » → la couleur pdf-lib, et l'encre lisible dessus (noire sur une teinte claire, blanche sur une foncée). */
function teinte(hex: string): { fond: ReturnType<typeof rgb>; texte: ReturnType<typeof rgb>; doux: ReturnType<typeof rgb>; claire: boolean } {
  const n = Number.parseInt(hex.replace("#", ""), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255) as [number, number, number];
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const claire = lum > 0.55;
  return { fond: rgb(r, g, b), texte: claire ? INK : BLANC, doux: rgb(r + (1 - r) * 0.86, g + (1 - g) * 0.86, b + (1 - b) * 0.86), claire };
}

/** Une zone d'une ligne du tableau dans le PDF rendu (points PDF, origine en bas à gauche), pour l'aperçu interactif. */
export interface ZonePdf {
  cle: string;
  page: number;
  x: number;
  y: number;
  largeur: number;
  hauteur: number;
}

export interface OptionsPdf {
  logo?: { bytes: Uint8Array; type: string } | null;
  destinataire?: string | null;
  /** Assistant, point 8 : Essentiel, Classique (par défaut) ou Détaillé : la même donnée, trois présentations. */
  modele?: ModelePdf | null;
  /** Assistant, point 12 : la couleur principale (identifiant de `COULEURS_PDF`). */
  couleur?: string | null;
  /** Assistant, point 10 : l'adresse où revient la réponse du négoce. */
  reponse?: string | null;
  /** Rempli, s'il est donné, des zones des lignes (clé de l'article, page, rectangle). */
  zones?: ZonePdf[];
}

/**
 * LE PDF « Demande de prix — Matériaux » (§45.3 ; assistant, points 8 à 12) : portrait, en-tête et pied sur toutes les
 * pages, les blocs dans l'ordre, le tableau désignation · caractéristiques · quantité · unité, puis l'adresse de réponse.
 * Le logo du compte à gauche (sinon le nom en gros). Trois modèles, une seule mise en page de fond :
 * - Essentiel : sans bref ni couleur de fond, le tableau et la réponse ;
 * - Classique (par défaut) : un filet de couleur, le bref encadré, le tableau à en-tête coloré ;
 * - Détaillé : en plus, les lignes numérotées et alternées, le bloc chantier et la description en clair.
 */
export async function packetPdf(p: SupplierPacket, sketches: readonly SketchFile[] = [], options: OptionsPdf = {}): Promise<Uint8Array> {
  const d = packetDocument(p, { destinataire: options.destinataire ?? null, reponse: options.reponse ?? null });
  const modele: ModelePdf = options.modele ?? MODELE_PDF_DEFAUT;
  const couleur = teinte(hexCouleurPdf(options.couleur));
  // Un filet prend la teinte ; un titre de couleur sur fond blanc : la teinte si elle est foncée, sinon l'encre.
  const accentTrait = couleur.fond;
  const accentTexte = couleur.claire ? INK : couleur.fond;
  const doc = await PDFDocument.create();
  doc.setTitle(packetSubject(p));
  doc.setProducer(NOM_APP);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let logo: PDFImage | null = null;
  try {
    if (options.logo) logo = options.logo.type === "image/png" ? await doc.embedPng(options.logo.bytes) : await doc.embedJpg(options.logo.bytes);
  } catch {
    logo = null; // Un logo illisible : le nom de l'entreprise en gros, jamais une erreur d'envoi.
  }
  const A4: [number, number] = [595.28, 841.89];
  const margin = 48;
  const footer = 54;
  const width = A4[0] - 2 * margin;
  const headed: PDFPage[] = [];
  let page!: PDFPage;
  let y = 0;

  const wrap = (text: string, font: PDFFont, size: number, max: number): string[] => {
    const lines: string[] = [];
    let current = "";
    for (const w of pdfSafe(text).split(" ")) {
      const candidate = current ? `${current} ${w}` : w;
      if (font.widthOfTextAtSize(candidate, size) <= max) current = candidate;
      else {
        if (current) lines.push(current);
        current = w;
      }
    }
    if (current) lines.push(current);
    return lines.length > 0 ? lines : [""];
  };
  const right = (text: string, font: PDFFont, size: number, top: number, color = INK) => {
    const t = pdfSafe(text);
    page.drawText(t, { x: A4[0] - margin - font.widthOfTextAtSize(t, size), y: top, size, font, color });
  };

  /** L'en-tête de chaque page : logo et coordonnées à gauche, le titre, le chantier, la date et la référence à droite. */
  const header = () => {
    // Classique et Détaillé : un filet de la couleur choisie en haut de chaque page.
    if (modele !== "essentiel") page.drawRectangle({ x: 0, y: A4[1] - 6, width: A4[0], height: 6, color: accentTrait });
    const top = A4[1] - margin;
    let left = top;
    if (logo) {
      const scale = Math.min(150 / logo.width, 54 / logo.height, 1);
      page.drawImage(logo, { x: margin, y: top - logo.height * scale, width: logo.width * scale, height: logo.height * scale });
      left = top - logo.height * scale - 6;
      page.drawText(pdfSafe(d.entete.entreprise), { x: margin, y: left - 9, size: 9.5, font: bold, color: INK });
      left -= 12;
    } else {
      for (const l of wrap(d.entete.entreprise, bold, 17, width * 0.5)) {
        page.drawText(l, { x: margin, y: left - 17, size: 17, font: bold, color: INK });
        left -= 21;
      }
    }
    for (const c of d.entete.coordonnees) {
      for (const l of wrap(c, regular, 8.5, width * 0.5)) {
        page.drawText(l, { x: margin, y: left - 9, size: 8.5, font: regular, color: MUTED });
        left -= 11;
      }
    }
    let r = top;
    right(d.entete.titre, bold, 15, r - 15, modele === "essentiel" ? INK : accentTexte);
    r -= 20;
    for (const t of [d.entete.chantier, d.entete.ville, d.entete.date, d.entete.reference ? `Réf. ${d.entete.reference}` : null]) {
      if (!t) continue;
      right(t, regular, 9.5, r - 10);
      r -= 13;
    }
    // §52 : sous le chantier, en gras, la mention du métier pas encore relu par un artisan.
    if (d.entete.mention) {
      right(d.entete.mention, bold, 9.5, r - 10);
      r -= 13;
    }
    const bottom = Math.min(left, r) - 10;
    page.drawLine({ start: { x: margin, y: bottom }, end: { x: A4[0] - margin, y: bottom }, thickness: 0.8, color: RULE });
    y = bottom - 16;
  };
  const newPage = () => {
    page = doc.addPage(A4);
    headed.push(page);
    header();
  };
  const room = (h: number) => {
    if (y - h < footer + 8) newPage();
  };
  const write = (text: string, font: PDFFont, size: number, opts: { indent?: number; color?: ReturnType<typeof rgb>; gap?: number } = {}) => {
    for (const line of wrap(text, font, size, width - (opts.indent ?? 0))) {
      room(size * 1.4);
      page.drawText(line, { x: margin + (opts.indent ?? 0), y: y - size, size, font, color: opts.color ?? INK });
      y -= size * 1.4;
    }
    y -= opts.gap ?? 0;
  };

  newPage();
  if (d.destinataire) {
    write("Destinataire", regular, 8.5, { color: MUTED });
    write(d.destinataire, bold, 11, { gap: 10 });
  }
  // Le chantier (adresse, livraison) : seulement ce que l'artisan a donné.
  if (d.chantierInfos.length > 0) {
    write("Chantier", bold, 8.5, { color: MUTED });
    for (const l of d.chantierInfos) write(l, regular, 10);
    y -= 10;
  }
  const numerote = modele === "detaille";
  // Désignation · caractéristiques · quantité · unité (point 9) ; Essentiel : les caractéristiques sous la désignation.
  const cols = modele === "essentiel" ? [width * 0.62, width * 0.14, width * 0.24] : numerote ? [width * 0.06, width * 0.36, width * 0.28, width * 0.12, width * 0.18] : [width * 0.4, width * 0.3, width * 0.12, width * 0.18];
  const entetes = modele === "essentiel" ? ["Désignation", "Quantité", "Unité"] : numerote ? ["N°", "Désignation", "Caractéristiques", "Quantité", "Unité"] : ["Désignation", "Caractéristiques", "Quantité", "Unité"];
  let numero = 0;
  for (const b of d.blocs) {
    if (b.kind === "list" && b.numero === 0) {
      if (modele === "essentiel") continue; // Essentiel : la liste seule.
      if (numerote) {
        // Détaillé : la description du chantier en clair, en paragraphe.
        room(40);
        write("Description du chantier", bold, 11, { gap: 4, color: accentTexte });
        for (const l of b.lignes) write(l, regular, 10, { gap: 2 });
        y -= 12;
        continue;
      }
      // Le bref : un paragraphe en petit, dans un cadre fin, avant la liste (retour du fondateur, 2026-10-11).
      const pad = 10;
      const size = 8.5;
      const lines = b.lignes.flatMap((l) => wrap(l, regular, size, width - 2 * pad));
      const h = pad + 11 + lines.length * size * 1.4 + pad - 2;
      room(h + 14);
      page.drawRectangle({ x: margin, y: y - h, width, height: h, color: BAND, borderColor: RULE, borderWidth: 0.8 });
      page.drawText(pdfSafe(b.titre), { x: margin + pad, y: y - pad - 7.5, size: 7.5, font: bold, color: MUTED });
      let ty = y - pad - 11;
      for (const l of lines) {
        page.drawText(l, { x: margin + pad, y: ty - size, size, font: regular, color: INK });
        ty -= size * 1.4;
      }
      y -= h + 18;
      continue;
    }
    // Les fournitures, ce que le fournisseur chiffre : le plus grand titre de la page.
    const big = b.kind === "table";
    room(big ? 48 : 40);
    write(`${b.numero}. ${b.titre}`, bold, big ? 14 : 12, { gap: big ? 6 : 4 });
    if (b.kind === "list") {
      for (const l of b.lignes) {
        room(14);
        page.drawText("•", { x: margin + 2, y: y - 10, size: 10, font: regular, color: MUTED });
        write(l, regular, 10, { indent: 14 });
      }
      y -= 10;
      continue;
    }
    const headRow = () => {
      room(22);
      const fond = modele === "essentiel" ? BAND : couleur.fond;
      const encre = modele === "essentiel" ? MUTED : couleur.texte;
      page.drawRectangle({ x: margin, y: y - 16, width, height: 16, color: fond });
      let x = margin + 4;
      entetes.forEach((c, i) => {
        page.drawText(pdfSafe(c), { x, y: y - 11.5, size: 8.5, font: bold, color: encre });
        x += cols[i]!;
      });
      y -= 20;
    };
    headRow();
    let consumables = false;
    for (const r of b.lignes) {
      if (r.consommable && !consumables) {
        consumables = true;
        room(18);
        write("Consommables", bold, 8.5, { color: MUTED, indent: 4 });
      }
      numero += 1;
      const { quantite, unite } = quantiteEtUnite(r.quantite);
      const precision = r.precision ?? "";
      const cells: { lignes: string[]; font: PDFFont; size: number; color: ReturnType<typeof rgb> }[] =
        modele === "essentiel"
          ? [
              { lignes: [...wrap(r.designation, regular, 9.5, cols[0]! - 10), ...(precision ? wrap(precision, regular, 8, cols[0]! - 10) : [])], font: regular, size: 9.5, color: INK },
              { lignes: wrap(quantite, bold, 9.5, cols[1]! - 8), font: bold, size: 9.5, color: INK },
              { lignes: wrap(unite, regular, 9, cols[2]! - 8), font: regular, size: 9, color: INK },
            ]
          : [
              ...(numerote ? [{ lignes: [String(numero)], font: regular, size: 8.5, color: MUTED }] : []),
              { lignes: wrap(r.designation, regular, 9.5, cols[numerote ? 1 : 0]! - 10), font: regular, size: 9.5, color: INK },
              { lignes: wrap(precision, regular, 8.5, cols[numerote ? 2 : 1]! - 8), font: regular, size: 8.5, color: MUTED },
              { lignes: wrap(quantite, bold, 9.5, cols[numerote ? 3 : 2]! - 8), font: bold, size: 9.5, color: INK },
              { lignes: wrap(unite, regular, 9, cols[numerote ? 4 : 3]! - 8), font: regular, size: 9, color: INK },
            ];
      const h = Math.max(...cells.map((c) => c.lignes.length)) * 12.5 + 6;
      if (y - h < footer + 8) {
        newPage();
        headRow();
      }
      if (numerote && numero % 2 === 0) page.drawRectangle({ x: margin, y: y - h + 2, width, height: h, color: couleur.doux });
      let x = margin + 4;
      cells.forEach((c, i) => {
        c.lignes.forEach((l, k) => {
          // Essentiel : la précision sous la désignation, en petit et en gris.
          const sousLigne = modele === "essentiel" && i === 0 && k >= wrap(r.designation, regular, 9.5, cols[0]! - 10).length;
          page.drawText(l, { x, y: y - 10 - k * 12.5, size: sousLigne ? 8 : c.size, font: c.font, color: sousLigne ? MUTED : c.color });
        });
        x += cols[i]!;
      });
      if (r.cle && options.zones) options.zones.push({ cle: r.cle, page: headed.indexOf(page), x: margin, y: y - h + 2, largeur: width, hauteur: h });
      y -= h;
      page.drawLine({ start: { x: margin, y: y + 2 }, end: { x: A4[0] - margin, y: y + 2 }, thickness: 0.4, color: RULE });
    }
    y -= 12;
  }
  if (d.croquis.length > 0) {
    room(30);
    write("Croquis joints (en fin de document)", bold, 10, { gap: 2 });
    for (const c of d.croquis) write([c.article, c.nom, ...(c.commentaire ? [c.commentaire] : [])].join(" · "), regular, 9.5, { indent: 14 });
    y -= 8;
  }
  // La réponse (point 10) : la phrase, l'adresse en gras, les conditions ; un cadre au filet de la couleur choisie.
  if (d.reponse) {
    const pad = 12;
    const adresse = wrap(d.reponse.adresse, bold, 11, width - 2 * pad);
    const phrase = wrap(d.reponse.phrase, regular, 9.5, width - 2 * pad);
    const conditions = wrap(d.reponse.conditions, regular, 8.5, width - 2 * pad);
    const h = pad + phrase.length * 13 + 4 + adresse.length * 15 + 6 + conditions.length * 11.5 + pad - 4;
    room(h + 10);
    page.drawRectangle({ x: margin, y: y - h, width, height: h, color: modele === "essentiel" ? BLANC : couleur.doux, borderColor: modele === "essentiel" ? RULE : accentTrait, borderWidth: modele === "essentiel" ? 0.8 : 1.2 });
    let ty = y - pad;
    for (const l of phrase) {
      page.drawText(l, { x: margin + pad, y: ty - 9.5, size: 9.5, font: regular, color: INK });
      ty -= 13;
    }
    ty -= 4;
    for (const l of adresse) {
      page.drawText(l, { x: margin + pad, y: ty - 11, size: 11, font: bold, color: INK });
      ty -= 15;
    }
    ty -= 6;
    for (const l of conditions) {
      page.drawText(l, { x: margin + pad, y: ty - 8.5, size: 8.5, font: regular, color: MUTED });
      ty -= 11.5;
    }
    y -= h + 10;
  }
  // Les croquis des articles, à la suite : une page par photo (titrée de l'article), les pages d'un PDF telles quelles.
  for (const c of p.croquis ?? []) {
    const file = sketches.find((s) => s.id === c.id);
    if (!file) continue;
    try {
      if (file.mimeType === "application/pdf") {
        const src = await PDFDocument.load(file.bytes, { ignoreEncryption: true });
        for (const copied of await doc.copyPages(src, src.getPageIndices())) doc.addPage(copied);
        continue;
      }
      const image = file.mimeType === "image/png" ? await doc.embedPng(file.bytes) : file.mimeType === "image/jpeg" ? await doc.embedJpg(file.bytes) : null;
      newPage();
      write(`Croquis — ${c.article}`, bold, 12, { gap: 2 });
      if (c.commentaire) write(c.commentaire, regular, 10, { gap: 4 });
      if (!image) {
        write(`${c.nom} : format d'image joint au mail (non affichable dans ce PDF).`, regular, 10);
        continue;
      }
      const box = { w: width, h: y - footer - 8 };
      const scale = Math.min(box.w / image.width, box.h / image.height, 1);
      page.drawImage(image, { x: margin, y: y - image.height * scale, width: image.width * scale, height: image.height * scale });
    } catch {
      // Un fichier illisible ne bloque jamais la demande : il reste cité dans « Croquis joints » et joint au mail.
    }
  }
  // Le pied de chaque page : la question et le contact, le numéro de page, et en petit « Généré avec Mobiiz ».
  const pages = doc.getPages();
  pages.forEach((pg, i) => {
    if (!headed.includes(pg)) return;
    pg.drawLine({ start: { x: margin, y: footer - 4 }, end: { x: A4[0] - margin, y: footer - 4 }, thickness: 0.6, color: RULE });
    if (d.pied.question) pg.drawText(pdfSafe(d.pied.question), { x: margin, y: footer - 18, size: 8.5, font: regular, color: INK });
    const num = `Page ${i + 1} / ${pages.length}`;
    pg.drawText(num, { x: A4[0] - margin - regular.widthOfTextAtSize(num, 8.5), y: footer - 18, size: 8.5, font: regular, color: MUTED });
    pg.drawText(pdfSafe(d.pied.mention), { x: margin, y: footer - 31, size: 6.5, font: regular, color: MUTED });
  });
  return doc.save();
}
