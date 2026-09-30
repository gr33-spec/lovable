import { PDFDocument, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";

/**
 * Documents fictifs du mode démo : un devis client de couvreur et les devis
 * des fournisseurs de démonstration. Aucune donnée réelle ; tout est
 * déterministe (mêmes lignes, mêmes prix).
 */

/** Domaine réservé aux fournisseurs fictifs : jamais une vraie adresse. */
export const DEMO_EMAIL_DOMAIN = "demo.baticlair.fr";

export function isDemoSupplier(email: string): boolean {
  return email.toLowerCase().endsWith(`@${DEMO_EMAIL_DOMAIN}`);
}

interface DemoSupplierProfile {
  key: string;
  name: string;
  contactName: string;
  /** Coefficient appliqué au prix de base (1 = prix de base). */
  factor: number;
  /** Nombre d'articles de la fin de liste que ce fournisseur ne chiffre pas. */
  skipLast: number;
  /** Frais de livraison HT, en centimes (0 = franco). */
  deliveryCents: number;
}

export const DEMO_SUPPLIERS: readonly DemoSupplierProfile[] = [
  { key: "tuilerie", name: "Tuilerie de l'Ouest (démo)", contactName: "Julie", factor: 1, skipLast: 0, deliveryCents: 4500 },
  { key: "negoce", name: "Négoce Breizh (démo)", contactName: "Marc", factor: 0.94, skipLast: 1, deliveryCents: 0 },
  { key: "materiaux", name: "Matériaux Atlantique (démo)", contactName: "Sophie", factor: 1.07, skipLast: 0, deliveryCents: 0 },
];

export const demoEmail = (key: string) => `${key}@${DEMO_EMAIL_DOMAIN}`;

export interface DemoLine {
  designation: string;
  quantity: string | null;
  unit: string | null;
  reference: string | null;
}

/** Le devis client du chantier de démonstration (couverture). */
const CLIENT_ROWS: [string, string, string, string][] = [
  ["Dépose de la couverture existante et évacuation", "85", "m²", "18,00"],
  ["Fourniture et pose tuile romane canal rouge 12,5 u/m² (réf. TUI-RC12)", "1 250", "u", "2,10"],
  ["Fourniture et pose faîtière ronde à emboîtement (réf. FAI-R)", "42", "u", "9,80"],
  ["Liteau sapin traité classe 2 27x38 (réf. LIT-2738)", "480", "ml", "1,40"],
  ["Écran sous-toiture HPV 1,5x50 m (réf. ECR-HPV)", "4", "rouleau", "165,00"],
  ["Crochet inox ardoise 100 mm", "2", "paquet", "38,00"],
  ["Fourniture et pose gouttière zinc demi-ronde dév. 33 (réf. GOU-ZN33)", "36", "ml", "32,00"],
  ["Fourniture et pose descente zinc diamètre 80", "12", "ml", "28,00"],
  ["Échafaudage de pied : location et montage", "1", "forfait", "950,00"],
];

// ---------------------------------------------------------------- calculs

const cents = (text: string) => Math.round(Number(text.replace(/\s/g, "").replace(",", ".")) * 100);

function parseQuantity(raw: string | null): number | null {
  if (!raw) return null;
  const n = Number(raw.replace(/[\s\u00a0\u202f]/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** 123456 → « 1 234,56 » (espaces ordinaires : police PDF standard). */
function euros(amountCents: number): string {
  const negative = amountCents < 0;
  const abs = Math.abs(amountCents);
  const units = Math.floor(abs / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${negative ? "-" : ""}${units},${(abs % 100).toString().padStart(2, "0")}`;
}

function hash(text: string): number {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h;
}

/** Prix d'achat HT courants (en centimes), par mot-clé et par unité. */
const KNOWN_PRICES: { keyword: RegExp; unit: RegExp; cents: number }[] = [
  { keyword: /tuile/i, unit: /^u/, cents: 105 },
  { keyword: /fa[iî]ti[eè]re/i, unit: /^u/, cents: 460 },
  { keyword: /liteau/i, unit: /^m/, cents: 58 },
  { keyword: /[ée]cran/i, unit: /roul|rlx/, cents: 8500 },
  { keyword: /crochet/i, unit: /^u/, cents: 19 },
  { keyword: /crochet/i, unit: /paq|bo[iî]/, cents: 1750 },
  { keyword: /goutti[eè]re/i, unit: /^m/, cents: 1340 },
  { keyword: /descente/i, unit: /^m/, cents: 1190 },
  { keyword: /velux|fen[eê]tre de toit/i, unit: /^u/, cents: 42000 },
];

/** Prix unitaire de base, plausible selon l'unité, stable pour une même désignation. */
function basePriceCents(designation: string, unit: string | null): number {
  const u = (unit ?? "").toLowerCase();
  const known = KNOWN_PRICES.find((k) => k.keyword.test(designation) && k.unit.test(u));
  if (known) return known.cents;
  const [min, max] = /^(ml|m)$/.test(u)
    ? [300, 1800]
    : /m²|m2/.test(u)
      ? [900, 3500]
      : /roul|rlx/.test(u)
        ? [5500, 12000]
        : /paq|boî|boi|sac|carton/.test(u)
          ? [1200, 4000]
          : /^(u|unité|unités|pce|pièce|pièces)$/.test(u)
            ? [80, 900]
            : [500, 5000];
  return min + (hash(designation.toLowerCase()) % (max - min));
}

// ---------------------------------------------------------------- PDF

interface Table {
  title: string;
  subtitle: string[];
  header: string[];
  columns: number[];
  rows: string[][];
  footer: string[];
  withCgv: boolean;
}

/** La police standard ne connaît que le jeu WinAnsi : on remplace le reste. */
function safe(font: PDFFont, text: string): string {
  let out = "";
  for (const ch of text.replace(/[\u00a0\u202f]/g, " ").replace(/[’]/g, "'")) {
    try {
      font.encodeText(ch);
      out += ch;
    } catch {
      out += "?";
    }
  }
  return out;
}

function wrap(font: PDFFont, text: string, size: number, width: number): string[] {
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(" ")) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= width || !current) current = candidate;
    else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

async function renderPdf(table: Table): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page: PDFPage = pdf.addPage([595.28, 841.89]);
  let y = 790;
  const write = (text: string, x: number, size = 9, f: PDFFont = font) => page.drawText(safe(f, text), { x, y, size, font: f });
  const newPageIfNeeded = (needed: number) => {
    if (y - needed < 60) {
      page = pdf.addPage([595.28, 841.89]);
      y = 790;
    }
  };

  write(table.title, 40, 15, bold);
  y -= 22;
  for (const line of table.subtitle) {
    write(line, 40, 9);
    y -= 13;
  }
  y -= 14;
  table.header.forEach((h, i) => write(h, table.columns[i]!, 9, bold));
  y -= 6;
  const designationWidth = table.columns[1]! - table.columns[0]! - 10;
  for (const row of table.rows) {
    const wrapped = wrap(font, safe(font, row[0]!), 9, designationWidth);
    newPageIfNeeded(14 * wrapped.length + 4);
    y -= 14;
    row.forEach((cell, i) => {
      if (i === 0) wrapped.forEach((part, k) => page.drawText(part, { x: table.columns[0]!, y: y - 12 * k, size: 9, font }));
      else write(cell, table.columns[i]!);
    });
    y -= 12 * (wrapped.length - 1);
  }
  y -= 24;
  for (const line of table.footer) {
    newPageIfNeeded(16);
    write(line, 330, 10, bold);
    y -= 15;
  }

  if (table.withCgv) {
    page = pdf.addPage([595.28, 841.89]);
    y = 790;
    write("CONDITIONS GÉNÉRALES (document fictif de démonstration)", 40, 11, bold);
    for (const t of [
      "Article 1 – Les présentes conditions s'appliquent à toutes les ventes. Document fictif, sans valeur.",
      "Article 2 – Réserve de propriété : les marchandises restent la propriété du vendeur jusqu'au paiement.",
      "Article 3 – Pénalités de retard : trois fois le taux d'intérêt légal.",
    ]) {
      y -= 16;
      write(t, 40, 8);
    }
  }
  return pdf.save();
}

/** Devis client fictif d'un couvreur : de quoi préparer une vraie liste de matériaux. */
export function demoClientQuote(companyName: string): Promise<Uint8Array> {
  let total = 0;
  const rows = CLIENT_ROWS.map(([designation, qty, unit, pu]) => {
    const line = Math.round((cents(qty) / 100) * cents(pu));
    total += line;
    return [designation, `${qty} ${unit}`, pu, euros(line)];
  });
  const vat = Math.round(total * 0.1);
  return renderPdf({
    title: `DEVIS N° DEMO-001 – ${companyName}`,
    subtitle: ["Client : M. Martin (fictif) – 12 rue des Tilleuls, 56000 Vannes", "Réfection de toiture – document de démonstration"],
    header: ["Désignation", "Qté", "P.U. HT", "Total HT"],
    columns: [40, 360, 440, 505],
    rows,
    footer: [`Total HT ${euros(total)}`, `TVA 10 % ${euros(vat)}`, `Total TTC ${euros(total + vat)}`],
    withCgv: true,
  });
}

/**
 * Devis d'un fournisseur fictif, établi sur la liste qui lui a été demandée :
 * chacun a son niveau de prix, l'un oublie un article, l'autre facture la livraison.
 */
export function demoSupplierQuote(lines: readonly DemoLine[], email: string, supplierName: string, projectName: string): Promise<Uint8Array> {
  const key = email.split("@")[0]!.toLowerCase();
  const profile = DEMO_SUPPLIERS.find((s) => s.key === key) ?? { ...DEMO_SUPPLIERS[0]!, factor: 1 + (hash(key) % 12) / 100 };
  const quoted = lines.slice(0, Math.max(1, lines.length - profile.skipLast));
  let total = 0;
  const rows = quoted.map((l) => {
    const qty = parseQuantity(l.quantity) ?? 1;
    const unitCents = Math.max(1, Math.round(basePriceCents(l.designation, l.unit) * profile.factor));
    const lineCents = Math.round(qty * unitCents);
    total += lineCents;
    const designation = l.reference ? `${l.designation} (réf. ${l.reference})` : l.designation;
    return [designation, `${l.quantity ?? "1"} ${l.unit ?? "u"}`.trim(), euros(unitCents), euros(lineCents)];
  });
  if (profile.deliveryCents > 0) {
    total += profile.deliveryCents;
    rows.push(["Livraison chantier", "1 u", euros(profile.deliveryCents), euros(profile.deliveryCents)]);
  }
  const vat = Math.round(total * 0.2);
  return renderPdf({
    title: `DEVIS ${supplierName.toUpperCase()} N° D-${(hash(key + projectName) % 9000) + 1000}`,
    subtitle: [`Chantier : ${projectName}`, "Offre valable 30 jours – document fictif de démonstration"],
    header: ["Désignation", "Qté", "P.U. HT", "Total HT"],
    columns: [40, 360, 440, 505],
    rows,
    footer: [`Total HT ${euros(total)}`, `TVA 20 % ${euros(vat)}`, `Total TTC ${euros(total + vat)}`],
    withCgv: false,
  });
}
