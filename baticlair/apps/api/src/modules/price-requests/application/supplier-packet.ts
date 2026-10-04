import { PDFDocument, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";

/**
 * CE QUE REÇOIT LE FOURNISSEUR (référentiel §42, §43) : un seul contenu, trois blocs, assemblé
 * depuis des données déjà calculées, sans IA. Le corps du mail et le PDF joint en sont deux
 * rendus du MÊME objet. Aucun prix n'y entre : les montants du devis client n'existent pas ici.
 */
export interface SupplierPacket {
  entreprise: string;
  chantier: string;
  commune: string | null;
  /** Date de la demande, AAAA-MM-JJ. */
  date: string;
  /** Bloc 1 : les lignes prêtes à charger (format §40.4), une par article. */
  articles: string[];
  /** Ce que le fournisseur chiffre pour la mesure du devis (modèle non choisi, pas de règle). */
  a_chiffrer: string[];
  /** Bloc 2 : le chantier en bref, 3 à 5 lignes (type, pente, rampant, façonnage, points singuliers). */
  resume: string[];
  /** Bloc 3 (§42) : le devis sans les prix, une ligne par ouvrage. */
  detail: { libelle: string; mesure: string | null; precisions: string[] }[];
  /** Case « Joindre le détail du chantier » (§42.2). */
  joindre_detail: boolean;
  /** Lien « une question ? » (§43.2, v3.1) ; null tant qu'il n'existe pas. */
  question_lien: string | null;
  /** Croquis joints à un article (dimensions d'une couvertine…) : rendus en pages du PDF, joints au mail. */
  croquis?: { article: string; id: string; nom: string; commentaire: string | null }[];
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

export function packetSubject(p: SupplierPacket): string {
  return `Commande – ${p.chantier} – ${p.entreprise}`;
}

/**
 * Le texte du mail (§43.5) : titres en majuscules, une ligne par article, pas de tableau.
 * Le PDF reprend exactement ces lignes.
 */
export function packetLines(p: SupplierPacket): { kind: "title" | "heading" | "line" | "blank"; text: string }[] {
  const out: { kind: "title" | "heading" | "line" | "blank"; text: string }[] = [];
  const head = ["COMMANDE :", p.entreprise, `· chantier ${p.chantier}`, ...(p.commune ? [`· ${p.commune}`] : []), `· ${dateFr(p.date)}`].join(" ");
  out.push({ kind: "title", text: head }, { kind: "blank", text: "" });
  out.push({ kind: "heading", text: "À COMMANDER" });
  if (p.articles.length === 0) out.push({ kind: "line", text: "(rien à commander)" });
  for (const a of p.articles) out.push({ kind: "line", text: a });
  if (p.a_chiffrer.length > 0) {
    out.push({ kind: "blank", text: "" }, { kind: "heading", text: "À CHIFFRER PAR VOS SOINS" });
    for (const a of p.a_chiffrer) out.push({ kind: "line", text: a });
  }
  out.push({ kind: "blank", text: "" }, { kind: "heading", text: "LE CHANTIER EN BREF" });
  if (p.resume.length === 0) out.push({ kind: "line", text: "(rien à signaler)" });
  for (const r of p.resume) out.push({ kind: "line", text: r });
  if (p.joindre_detail) {
    out.push({ kind: "blank", text: "" }, { kind: "heading", text: "DÉTAIL DU DEVIS (sans prix)" });
    if (p.detail.length === 0) out.push({ kind: "line", text: "(aucune ligne)" });
    for (const d of p.detail) out.push({ kind: "line", text: [d.libelle, ...(d.mesure ? [d.mesure] : []), ...d.precisions].join(" · ") });
  }
  if (p.croquis?.length) {
    out.push({ kind: "blank", text: "" }, { kind: "heading", text: "CROQUIS JOINTS (en fin de document)" });
    for (const c of p.croquis) out.push({ kind: "line", text: [c.article, c.nom, ...(c.commentaire ? [c.commentaire] : [])].join(" · ") });
  }
  if (p.question_lien) out.push({ kind: "blank", text: "" }, { kind: "line", text: `Une question sur cette commande ? Écrivez-la ici : ${p.question_lien}` });
  return out;
}

export function packetText(p: SupplierPacket): string {
  return packetLines(p)
    .map((l) => l.text)
    .join("\n");
}

/**
 * Le test du §42.2 et du §43.5, appliqué à tout texte qui part chez le fournisseur : le symbole €,
 * une devise, un montant à deux décimales suivi d'une devise, ou les mots du chiffrage.
 * Renvoie ce qui a été trouvé, ou null si le texte est propre.
 */
export function priceLeak(text: string): string | null {
  const patterns = [/€/, /\d[\d\s]*[.,]\d{2}\s*(?:€|eur|euros?)\b/i, /\b(?:HT|TTC|TVA)\b/, /\b(?:remise|montant|prix unitaire|p\.u\.|total)\b/i, /(?<!sans )\bprix\b/i];
  for (const re of patterns) {
    const m = re.exec(text);
    if (m) return m[0];
  }
  return null;
}

/** Les caractères que la police standard du PDF ne sait pas écrire (WinAnsi) : remplacés, jamais une erreur. */
function pdfSafe(text: string): string {
  return text
    .replace(/≈/g, "env.")
    .replace(/≥/g, ">=")
    .replace(/≤/g, "<=")
    .replace(/→/g, "->")
    .replace(/[^\x20-\x7E\xA0-\xFF\u0152\u0153\u2013\u2014\u2018\u2019\u201C\u201D\u2026\u20AC\u2022]/g, "?");
}

/** Le PDF (§43.1) : léger, sans mise en page coûteuse, les mêmes lignes que le mail. */
export async function packetPdf(p: SupplierPacket, sketches: readonly SketchFile[] = []): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(packetSubject(p));
  doc.setProducer("BatiClair");
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const A4: [number, number] = [595.28, 841.89];
  const margin = 50;
  const width = A4[0] - 2 * margin;
  let page: PDFPage = doc.addPage(A4);
  let y = A4[1] - margin;
  const newPage = () => {
    page = doc.addPage(A4);
    y = A4[1] - margin;
  };
  const wrap = (text: string, font: PDFFont, size: number): string[] => {
    const words = text.split(" ");
    const lines: string[] = [];
    let current = "";
    for (const w of words) {
      const candidate = current ? `${current} ${w}` : w;
      if (font.widthOfTextAtSize(candidate, size) <= width) current = candidate;
      else {
        if (current) lines.push(current);
        current = w;
      }
    }
    if (current) lines.push(current);
    return lines.length > 0 ? lines : [""];
  };
  const write = (text: string, font: PDFFont, size: number, gapAfter: number) => {
    for (const line of wrap(pdfSafe(text), font, size)) {
      if (y - size < margin) newPage();
      page.drawText(line, { x: margin, y: y - size, size, font });
      y -= size * 1.35;
    }
    y -= gapAfter;
  };
  for (const l of packetLines(p)) {
    if (l.kind === "blank") y -= 6;
    else if (l.kind === "title") write(l.text, bold, 13, 4);
    else if (l.kind === "heading") write(l.text, bold, 11, 2);
    else write(l.text, regular, 10.5, 0);
  }
  if (y - 24 < margin) newPage();
  page.drawText(pdfSafe("Préparé avec BatiClair — aucun prix dans ce document."), { x: margin, y: margin - 20, size: 8, font: regular });
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
      write(`CROQUIS — ${c.article}`, bold, 13, 2);
      if (c.commentaire) write(c.commentaire, regular, 10.5, 4);
      if (!image) {
        write(`${c.nom} : format d'image joint au mail (non affichable dans ce PDF).`, regular, 10.5, 0);
        continue;
      }
      const room = { w: width, h: y - margin };
      const scale = Math.min(room.w / image.width, room.h / image.height, 1);
      page.drawImage(image, { x: margin, y: y - image.height * scale, width: image.width * scale, height: image.height * scale });
    } catch {
      // Un fichier illisible ne bloque jamais la commande : il reste cité dans « CROQUIS JOINTS » et joint au mail.
    }
  }
  return doc.save();
}
