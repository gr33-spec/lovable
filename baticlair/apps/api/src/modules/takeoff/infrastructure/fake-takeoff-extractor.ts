import { parseFiche, parseUnit } from "@baticlair/domain";
import { fakeRows } from "../../../platform/ai/fake-table.js";
import type { ExtractionAttempt, ExtractionRequest, TakeoffExtractor } from "../application/takeoff-extractor.js";

/**
 * Extraction SIMULÉE (développement et tests uniquement, refusée en ligne
 * par la configuration). Règle fixe : une ligne en colonnes « réf ·
 * désignation · quantité · unité · … » devient une ligne de matériau.
 * Elle permet de tester tout le parcours sans appel payant.
 */
/** « pente 35° · rampant 5,50 m » → { pente: "35°", rampant: "5,50 m" } (rien si aucun fragment n'a cette forme). */
function fakeDimensions(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of text.split(/\s*(?:·|;|,\s)\s*/)) {
    const m = /^([a-zéèêàç' ]+?)\s*:?\s*(\d+(?:[.,]\d+)?\s*(?:mm|cm|ml|m²|m2|m|%|°))$/i.exec(part.trim());
    if (m) out[m[1]!.trim().toLowerCase()] = m[2]!;
  }
  return out;
}

export class FakeTakeoffExtractor implements TakeoffExtractor {
  readonly provider = "fake";

  async extract(request: ExtractionRequest): Promise<ExtractionAttempt> {
    const scope = request.scope ? new Set(request.scope.pages) : null;
    // Règle simulée du prompt A : « pente 35° · rampant 5,50 m » dans une colonne après la quantité donne
    // les dimensions de la ligne ; la même écriture sur une ligne sans quantité (en-tête, notes) donne le contexte.
    const context: Record<string, string> = {};
    for (const raw of request.numberedText.split("\n")) {
      const m = /^\[(\d+:\d+)\]\s(.*)$/.exec(raw);
      if (m && !fakeRows(m[0]!).length) Object.assign(context, fakeDimensions(m[2]!));
    }
    // Règle simulée des titres : « Logement 2 », « Appartement B3 » sur une ligne sans quantité range les lignes qui suivent.
    const sectionOf = new Map<string, string[]>();
    let current: string[] = [];
    for (const raw of request.numberedText.split("\n")) {
      const m = /^\[(\d+:\d+)\]\s(.*)$/.exec(raw);
      if (!m) continue;
      if (fakeRows(raw).length) sectionOf.set(m[1]!, current);
      else if (/^(?:logement|appartement)\s+\S+$/i.test(m[2]!.trim())) current = [m[2]!.trim()];
    }
    const lines: NonNullable<ExtractionAttempt["output"]>["lines"] = fakeRows(request.numberedText)
      .filter((row) => row.index >= 1)
      // Bloc d'un gros devis : seulement les lignes de ses pages (les autres sont du contexte).
      .filter((row) => !scope || scope.has(Number.parseInt(row.ref, 10)))
      .map((row) => ({
        designation: row.cols[row.index - 1]!,
        quantity: row.quantity,
        unit: row.unit,
        reference: row.index >= 2 ? row.cols[0]! : null,
        sourceRefs: [row.ref],
        sourcePages: [],
        // Règle simulée : un conditionnement sans contenu indiqué est un doute.
        // Le seul doute qu'une lecture pose désormais : un doute de LECTURE (prompt v8).
        doubt: parseUnit(row.unit) === "PAQUET" ? "Chiffre peu lisible : 2 ou 3 paquets ?" : null,
        section: sectionOf.get(row.ref) ?? [],
        dimensions: row.cols.slice(row.index + 2).reduce<Record<string, string> | null>((acc, col) => {
          const d = fakeDimensions(col);
          return Object.keys(d).length > 0 ? { ...(acc ?? {}), ...d } : acc;
        }, null),
        // Règle simulée du « manque » (§41.1, §49.4) : une colonne « manque : section des liteaux (25x38, 18x40) » après la
        // quantité est ce que le comptoir demanderait encore pour cette ligne.
        ...((): { reading?: { role: null; articles: []; faconnage: null; manque: string[] } } => {
          const manque = row.cols.slice(row.index + 1).flatMap((col) => /^manque\s*:\s*(.+)$/i.exec(col.trim())?.[1] ?? []);
          return manque.length > 0 ? { reading: { role: null, articles: [], faconnage: null, manque } } : {};
        })(),
      }));
    // Règle simulée du §51.1 : la fiche reprend l'ouvrage et la surface de la première ligne en m², et les dimensions lues
    // (lignes et en-tête), chacune « lue » avec sa ligne. Rien d'autre.
    const main = lines.find((l) => /^(?:m2|m²)$/i.test((l.unit ?? "").trim()));
    const ouvrage = main?.designation.split(/\s+[-–(]|,/)[0]?.trim();
    const fiche = [
      ...(main && ouvrage ? [{ donnee: "ouvrage", valeur: ouvrage, origine: "lue", preuve: `ligne ${main.sourceRefs[0]}` }] : []),
      ...(main?.quantity ? [{ donnee: "surface", valeur: `${main.quantity} m²`, origine: "lue", preuve: `ligne ${main.sourceRefs[0]}` }] : []),
      // Seules les dimensions de l'ouvrage principal (le développé d'une bande reste à sa ligne) ; « rampant de » = rampant.
      ...Object.entries(main?.dimensions ?? {}).map(([k, v]) => ({ donnee: k.replace(/\s+(?:de|du|d')$/, ""), valeur: v, origine: "lue", preuve: `ligne ${main!.sourceRefs[0]}` })),
      // L'en-tête : les données d'un toit seulement (un développé est celui d'une pièce).
      ...Object.entries(context)
        .map(([k, v]) => ({ donnee: k.replace(/\s+(?:de|du|d')$/, ""), valeur: v, origine: "lue", preuve: "en-tête" }))
        .filter((d) => /^(?:pente|rampant|largeur|hauteur|longueur)$/.test(d.donnee)),
    ].filter((d, i, all) => all.findIndex((x) => x.donnee === d.donnee) === i);
    const notes = request.imagePages.length > 0 ? [`Pages ${request.imagePages.join(", ")} non lues (extraction simulée).`] : [];
    const inputTokens = Math.ceil(request.numberedText.length / 3) + 2000;
    return {
      provider: this.provider,
      model: "claude-sonnet-5-5",
      usage: { inputTokens, outputTokens: 60 * lines.length + 50 },
      status: "success",
      output: { lines, notes, context: Object.keys(context).length > 0 ? context : null, ...(fiche.length > 0 ? { fiche: parseFiche(fiche) } : {}) },
      errorCode: null,
      durationMs: 1,
    };
  }
}
