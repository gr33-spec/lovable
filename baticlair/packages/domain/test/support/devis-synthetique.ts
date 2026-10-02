import type { PageForEstimate } from "../../src/index.js";

/**
 * DEVIS SYNTHÉTIQUES pour tester les limites techniques de la lecture
 * (300, 500 lignes…) sans aucun appel IA. Fabriqués de façon déterministe :
 * titres à deux niveaux (bâtiment, puis logement / pièce) écrits une seule
 * fois là où ils commencent — donc parfois plusieurs pages plus haut —,
 * désignations sur deux lignes dont certaines coupées en bas de page.
 */
export interface SynthRow {
  ref: string;
  text: string;
  kind: "title" | "item" | "cont";
  /** Titre : son niveau (0 = le plus général). */
  level?: number;
  /** Article : son numéro dans `lines`. */
  item?: number;
}

export interface SynthPage {
  pageNumber: number;
  route: "text" | "vision";
  rows: SynthRow[];
}

/** Ce qu'une lecture parfaite doit rendre pour chaque article. */
export interface SynthLine {
  designation: string;
  quantity: string;
  unit: string;
  section: string[];
  sourceRefs: string[];
  sourcePages: number[];
}

export interface SynthQuote {
  pages: SynthPage[];
  lines: SynthLine[];
}

const PRODUCTS = [
  "Prise de courant 16A+T encastrée blanche",
  "Interrupteur va-et-vient 10A complet",
  "Câble R2V 3G2,5 couronne",
  "Gaine ICTA 20 mm",
  "Plaque de plâtre BA13 hydro 2,50 m",
  "Rail R48 longueur 3 m",
  "Montant M48 longueur 2,70 m",
  "Laine de verre 45 mm rouleau",
  "Bande à joint papier 150 m",
  "Enduit à joint prêt à l'emploi 25 kg",
  "Tube multicouche 16x2 couronne 50 m",
  "Raccord à sertir coude 16",
];
const UNITS = ["u", "ml", "m²", "u", "u", "ml"];

/** Un devis de `count` articles. `perPage` lignes de tableau par page. */
export function syntheticQuote(count: number, route: "text" | "vision" = "text", perPage = 36): SynthQuote {
  const rows: Omit<SynthRow, "ref">[] = [];
  const truth: Omit<SynthLine, "sourceRefs" | "sourcePages">[] = [];
  let path: string[] = [];
  for (let i = 0; i < count; i++) {
    if (i % 120 === 0) {
      path = [`BÂTIMENT ${String.fromCharCode(65 + i / 120)}`];
      rows.push({ text: path[0]!, kind: "title", level: 0 });
    }
    if (i % 15 === 0) {
      path = [path[0]!, `LOGEMENT ${Math.floor(i / 15) + 1} – ${["CUISINE", "SÉJOUR", "SALLE DE BAIN", "CHAMBRE"][Math.floor(i / 15) % 4]}`];
      rows.push({ text: path[1]!, kind: "title", level: 1 });
    }
    const designation = `${PRODUCTS[i % PRODUCTS.length]} – poste ${i + 1}`;
    const quantity = String(((i * 7) % 40) + 1);
    const unit = UNITS[i % UNITS.length]!;
    const twoRows = i % 4 === 0;
    const full = twoRows ? `${designation} (suite : pose comprise)` : designation;
    truth.push({ designation: full, quantity, unit, section: [...path] });
    rows.push({ text: `R${String(i + 1).padStart(4, "0")}  ${designation}  ${quantity}  ${unit}  12,50  ${quantity}0,00`, kind: "item", item: i });
    if (twoRows) rows.push({ text: "(suite : pose comprise)", kind: "cont", item: i });
  }

  const pages: SynthPage[] = [];
  rows.forEach((row, index) => {
    const pageNumber = Math.floor(index / perPage) + 1;
    if (!pages[pageNumber - 1]) pages.push({ pageNumber, route, rows: [] });
    const line = (index % perPage) + 1;
    pages[pageNumber - 1]!.rows.push({ ...row, ref: `${pageNumber}:${String(line).padStart(3, "0")}` });
  });

  const lines: SynthLine[] = truth.map((t, i) => {
    const own = pages.flatMap((p) => p.rows.filter((r) => r.item === i).map((r) => ({ ref: r.ref, page: p.pageNumber })));
    return {
      ...t,
      sourceRefs: route === "text" ? own.map((o) => o.ref) : [],
      sourcePages: route === "vision" ? [...new Set(own.map((o) => o.page))] : [],
    };
  });
  return { pages, lines };
}

/** Pages telles que le plan de lecture les voit (texte numéroté envoyé, ou page image A4). */
export function pagesForPlan(quote: SynthQuote): PageForEstimate[] {
  return quote.pages.map((p) => ({
    pageNumber: p.pageNumber,
    route: p.route,
    chars: p.route === "text" ? p.rows.reduce((s, r) => s + r.ref.length + r.text.length + 4, 0) : 0,
    lines: p.route === "text" ? p.rows.length : 0,
    widthPt: 595.28,
    heightPt: 841.89,
  }));
}

/**
 * Un devis réel du banc (lignes et sections connues) remis en `pageCount`
 * pages image, titres écrits là où ils changent.
 */
export function benchAsScan(bench: readonly { designation: string; quantity: string | null; unit: string | null; section?: readonly string[] | undefined }[], pageCount: number): SynthQuote {
  const rows: Omit<SynthRow, "ref">[] = [];
  let path: string[] = [];
  bench.forEach((l, i) => {
    const section = l.section ?? [];
    const common = path.findIndex((t, k) => section[k] !== t);
    let keep = common === -1 ? Math.min(path.length, section.length) : common;
    // Retour à un titre parent : le devis le réécrit (sinon rien ne le montrerait).
    if (keep === section.length && section.length < path.length && keep > 0) keep--;
    for (let k = keep; k < section.length; k++) rows.push({ text: section[k]!, kind: "title", level: k });
    path = [...section];
    rows.push({ text: l.designation, kind: "item", item: i });
  });
  const perPage = Math.ceil(rows.length / pageCount);
  const pages: SynthPage[] = [];
  rows.forEach((row, index) => {
    const pageNumber = Math.floor(index / perPage) + 1;
    if (!pages[pageNumber - 1]) pages.push({ pageNumber, route: "vision", rows: [] });
    pages[pageNumber - 1]!.rows.push({ ...row, ref: `${pageNumber}:${String((index % perPage) + 1).padStart(3, "0")}` });
  });
  const lines = bench.map((l, i) => ({
    designation: l.designation,
    quantity: l.quantity ?? "",
    unit: l.unit ?? "",
    section: [...(l.section ?? [])],
    sourceRefs: [],
    sourcePages: pages.filter((p) => p.rows.some((r) => r.item === i)).map((p) => p.pageNumber),
  }));
  return { pages, lines };
}

/** Taille (en tokens, 3 caractères par token) de la réponse compacte qu'une lecture produirait. */
export function compactOutputTokens(lines: readonly SynthLine[]): number {
  const sections = [...new Set(lines.map((l) => JSON.stringify(l.section)))];
  const json = JSON.stringify({
    sections: sections.map((s) => JSON.parse(s) as string[]),
    lignes: lines.map((l) => ({ des: l.designation, qte: l.quantity, unite: l.unit, ref: null, src: [...l.sourceRefs, ...l.sourcePages.map(String)], sec: sections.indexOf(JSON.stringify(l.section)), doute: null })),
    notes: [],
  });
  return Math.ceil(json.length / 3);
}

export interface SimulatedReading {
  lines: SynthLine[];
  outputTokens: number;
}

/**
 * IA SIMULÉE, fidèle aux consignes : elle voit les pages fournies (celles
 * du bloc et son contexte), suit les titres qu'elle y lit, et ne liste que
 * les lignes qui commencent sur ses pages. `sloppy` : elle désobéit comme
 * pourrait le faire un modèle (reliquat de ligne coupée, ligne d'une page
 * de contexte) — le code doit l'écarter. (Sur une page image, un reliquat sans
 * référence de ligne ne se distingue pas d'une vraie ligne : limite connue.)
 */
export function simulateReading(quote: SynthQuote, visible: readonly number[], owned: readonly number[] | null, sloppy = false): SimulatedReading {
  const seen = new Set(visible);
  const mine = owned ? new Set(owned) : seen;
  const path: string[] = [];
  const out: SynthLine[] = [];
  const rows = quote.pages.filter((p) => seen.has(p.pageNumber)).flatMap((p) => p.rows.map((r) => ({ ...r, page: p.pageNumber, route: p.route })));
  for (const row of rows) {
    if (row.kind === "title") {
      path.splice(row.level!, path.length, row.text);
      continue;
    }
    const truth = quote.lines[row.item!]!;
    if (row.kind === "item") {
      const cont = rows.find((r) => r.kind === "cont" && r.item === row.item);
      const refs = row.route === "text" ? [row.ref, ...(cont ? [cont.ref] : [])] : [];
      const pages = row.route === "vision" ? [...new Set([row.page, ...(cont ? [cont.page] : [])])] : [];
      const line = {
        designation: cont ? `${truth.designation.replace(" (suite : pose comprise)", "")} (suite : pose comprise)` : truth.designation.replace(" (suite : pose comprise)", ""),
        quantity: truth.quantity,
        unit: truth.unit,
        section: [...path],
        sourceRefs: refs,
        sourcePages: pages,
      };
      if (mine.has(row.page)) out.push(line);
      // Désobéissance : une ligne entière lue sur une page de contexte.
      else if (sloppy && row.item! % 9 === 0) out.push(line);
    } else if (sloppy && row.route === "text" && mine.has(row.page) && !mine.has(rows.find((r) => r.kind === "item" && r.item === row.item)?.page ?? -1)) {
      // Désobéissance : le reliquat d'une ligne commencée sur la page précédente.
      out.push({ ...truth, designation: row.text, section: [...path], sourceRefs: [row.ref], sourcePages: [] });
    }
  }
  return { lines: out, outputTokens: compactOutputTokens(out) };
}
