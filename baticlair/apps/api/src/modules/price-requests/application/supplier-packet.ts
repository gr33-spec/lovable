import { priceLeak } from "@baticlair/domain";
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
}

/** Le fichier d'un croquis, lu au moment de rendre le PDF (jamais gardé dans la demande figée). */
export interface SketchFile {
  id: string;
  mimeType: string;
  bytes: Uint8Array;
}

const dateFr = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!)).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
};

/** « Test » → « chantier Test » ; un nom qui le dit déjà reste tel quel. */
export const chantierLabel = (name: string) => (/^chantier\b/i.test(name.trim()) ? name.trim() : `chantier ${name.trim()}`);

/** §45.2 : « Demande de devis · [entreprise] · [nom du chantier] ([ville]) ». */
export function packetSubject(p: SupplierPacket): string {
  return `Demande de devis · ${p.entreprise} · ${chantierLabel(p.chantier)}${p.commune ? ` (${p.commune})` : ""}`;
}

/** La signature : prénom ou nom, entreprise, téléphone, mail (§45.2). Rien de vide. */
export function packetSignature(p: SupplierPacket): string {
  const s = p.expediteur;
  return [[s?.nom, p.entreprise].filter((x) => x && x.trim()).join(" "), s?.telephone, s?.email].filter((x) => x && x.trim()).join(" · ");
}

/**
 * LE MAIL (§45.2) : court, poli, lisible en dix secondes sur un téléphone ; la liste est dans le PDF joint.
 * Seuls la phrase du chantier, la signature et la présence du PS changent d'un envoi à l'autre.
 */
export function packetMail(p: SupplierPacket): string {
  const phrase = p.phrase ?? `Je vous envoie la liste des fournitures pour le ${chantierLabel(p.chantier)}${p.commune ? ` à ${p.commune}` : ""}.`;
  const ask = `Pouvez-vous me chiffrer l'ensemble${p.echeance ? ` avant le ${p.echeance}` : ""} ?${p.joindre_detail ? " PS : si besoin, le détail du devis est en pièce jointe." : ""}`;
  return ["Bonjour,", phrase, ...(p.message?.trim() ? [p.message.trim()] : []), ask, "Merci d'avance, bonne journée,", packetSignature(p)].join("\n\n");
}

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
    titre: "Demande de devis";
    chantier: string;
    ville: string | null;
    date: string;
    reference: string | null;
  };
  destinataire: string | null;
  blocs: (
    | { numero: number; titre: string; kind: "list"; lignes: string[] }
    | { numero: number; titre: string; kind: "table"; colonnes: [string, string, string]; lignes: PacketSupply[] }
  )[];
  croquis: { article: string; nom: string; commentaire: string | null }[];
  pied: { question: string | null; mention: string };
}

export function packetDocument(p: SupplierPacket, options: { destinataire?: string | null } = {}): PacketDocument {
  const s = p.expediteur;
  const coordonnees = [s?.adresse, s?.siret ? `SIRET ${s.siret}` : null, [s?.telephone, s?.email].filter(Boolean).join(" · ") || null].filter((x): x is string => !!x);
  const blocs: PacketDocument["blocs"] = [];
  let n = 0;
  // Les blocs vides disparaissent, jamais de « néant » (§45.5).
  const resume = p.resume;
  if (resume.length > 0) blocs.push({ numero: ++n, titre: "Le chantier en bref", kind: "list", lignes: resume });
  // Du gros au petit, matériau principal en premier, consommables en dernier (§45.3).
  const rows = supplies(p);
  const ordered = [...rows.filter((r) => !r.consommable), ...rows.filter((r) => r.consommable)];
  if (ordered.length > 0) blocs.push({ numero: ++n, titre: "Fournitures à chiffrer", kind: "table", colonnes: ["Désignation", "Quantité", "Précision"], lignes: ordered });
  if (p.a_chiffrer.length > 0) blocs.push({ numero: ++n, titre: "À préciser avec vous", kind: "list", lignes: p.a_chiffrer });
  if (p.joindre_detail && p.detail.length > 0)
    blocs.push({ numero: ++n, titre: "Détail du devis (sans prix)", kind: "list", lignes: p.detail.map((d) => [d.libelle, ...(d.mesure ? [d.mesure] : []), ...d.precisions].join(" · ")) });
  const contact = [s?.telephone, s?.email].filter(Boolean).join(" · ");
  return {
    entete: { entreprise: p.entreprise, coordonnees, titre: "Demande de devis", chantier: chantierLabel(p.chantier), ville: p.commune, date: dateFr(p.date), reference: p.reference ?? null },
    destinataire: options.destinataire ?? null,
    blocs,
    croquis: (p.croquis ?? []).map((c) => ({ article: c.article, nom: c.nom, commentaire: c.commentaire })),
    pied: { question: contact ? `Une question sur ce chantier ? ${contact}` : p.question_lien ? `Une question sur ce chantier ? ${p.question_lien}` : null, mention: "Généré avec BatiClair" },
  };
}

/** Le texte du document, ligne à ligne : ce que l'aperçu montre et ce que le PDF écrit (§45.7 test 10). */
export function packetDocumentLines(d: PacketDocument): string[] {
  const out = [d.entete.entreprise, ...d.entete.coordonnees, d.entete.titre, d.entete.chantier, ...(d.entete.ville ? [d.entete.ville] : []), d.entete.date, ...(d.entete.reference ? [`Réf. ${d.entete.reference}`] : [])];
  if (d.destinataire) out.push(`À l'attention de : ${d.destinataire}`);
  for (const b of d.blocs) {
    out.push(`${b.numero}. ${b.titre}`);
    if (b.kind === "list") out.push(...b.lignes);
    else for (const r of b.lignes) out.push([r.designation, r.quantite, r.precision ?? ""].join(" | "));
  }
  for (const c of d.croquis) out.push(`Croquis : ${[c.article, c.nom, ...(c.commentaire ? [c.commentaire] : [])].join(" · ")}`);
  return out;
}


/** Le vocabulaire du §45.4 : rien de la cuisine interne ne sort, jamais « commande ». */
export function forbiddenWord(text: string): string | null {
  const m = /\b(?:commandes?|commander|command[ée]e?s?|bon de commande|r[ée]f[ée]rentiel|moteur|BatiClair|zone climatique|poids pos[ée]|marge comprise|r[èe]gle de calcul)\b/i.exec(text);
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

/**
 * LE PDF « Demande de devis » (§45.3) : portrait, en-tête et pied sur toutes les pages, les blocs dans l'ordre,
 * le tableau des fournitures à trois colonnes. Le logo du compte à gauche (sinon le nom en gros).
 */
export async function packetPdf(
  p: SupplierPacket,
  sketches: readonly SketchFile[] = [],
  options: { logo?: { bytes: Uint8Array; type: string } | null; destinataire?: string | null } = {},
): Promise<Uint8Array> {
  const d = packetDocument(p, { destinataire: options.destinataire ?? null });
  const doc = await PDFDocument.create();
  doc.setTitle(packetSubject(p));
  doc.setProducer("BatiClair");
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
  const right = (text: string, font: PDFFont, size: number, top: number) => {
    const t = pdfSafe(text);
    page.drawText(t, { x: A4[0] - margin - font.widthOfTextAtSize(t, size), y: top, size, font, color: INK });
  };

  /** L'en-tête de chaque page : logo et coordonnées à gauche, « Demande de devis » et le chantier à droite. */
  const header = () => {
    const top = A4[1] - margin;
    let left = top;
    if (logo) {
      const scale = Math.min(150 / logo.width, 54 / logo.height, 1);
      page.drawImage(logo, { x: margin, y: top - logo.height * scale, width: logo.width * scale, height: logo.height * scale });
      left = top - logo.height * scale - 6;
      page.drawText(pdfSafe(d.entete.entreprise), { x: margin, y: left - 9, size: 9.5, font: bold, color: INK });
      left -= 12;
    } else {
      for (const l of wrap(d.entete.entreprise, bold, 17, width * 0.55)) {
        page.drawText(l, { x: margin, y: left - 17, size: 17, font: bold, color: INK });
        left -= 21;
      }
    }
    for (const c of d.entete.coordonnees) {
      for (const l of wrap(c, regular, 8.5, width * 0.55)) {
        page.drawText(l, { x: margin, y: left - 9, size: 8.5, font: regular, color: MUTED });
        left -= 11;
      }
    }
    let r = top;
    right(d.entete.titre, bold, 15, r - 15);
    r -= 20;
    for (const t of [d.entete.chantier, d.entete.ville, d.entete.date, d.entete.reference ? `Réf. ${d.entete.reference}` : null]) {
      if (!t) continue;
      right(t, regular, 9.5, r - 10);
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
  const cols = [width * 0.41, width * 0.35, width * 0.24];
  for (const b of d.blocs) {
    room(40);
    write(`${b.numero}. ${b.titre}`, bold, 12, { gap: 4 });
    if (b.kind === "list" && b.titre === "Le chantier en bref" && b.lignes.length === 1) {
      // Le bref : un paragraphe, sans puce (retour du fondateur, 2026-10-11).
      write(b.lignes[0]!, regular, 10);
      y -= 10;
      continue;
    }
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
      page.drawRectangle({ x: margin, y: y - 16, width, height: 16, color: BAND });
      let x = margin + 4;
      b.colonnes.forEach((c, i) => {
        page.drawText(c, { x, y: y - 11.5, size: 8.5, font: bold, color: MUTED });
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
      const cells = [wrap(r.designation, regular, 9.5, cols[0]! - 10), wrap(r.quantite, bold, 9.5, cols[1]! - 10), wrap(r.precision ?? "", regular, 8.5, cols[2]! - 8)];
      const h = Math.max(...cells.map((c) => c.length)) * 12.5 + 6;
      if (y - h < footer + 8) {
        newPage();
        headRow();
      }
      let x = margin + 4;
      cells.forEach((lines, i) => {
        lines.forEach((l, k) => page.drawText(l, { x, y: y - 10 - k * 12.5, size: i === 2 ? 8.5 : 9.5, font: i === 1 ? bold : regular, color: i === 2 ? MUTED : INK }));
        x += cols[i]!;
      });
      y -= h;
      page.drawLine({ start: { x: margin, y: y + 2 }, end: { x: A4[0] - margin, y: y + 2 }, thickness: 0.4, color: RULE });
    }
    y -= 12;
  }
  if (d.croquis.length > 0) {
    room(30);
    write("Croquis joints (en fin de document)", bold, 10, { gap: 2 });
    for (const c of d.croquis) write([c.article, c.nom, ...(c.commentaire ? [c.commentaire] : [])].join(" · "), regular, 9.5, { indent: 14 });
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
  // Le pied de chaque page : la question et le contact, le numéro de page, et en petit « Généré avec BatiClair ».
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
