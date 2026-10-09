import type { QuoteLineReading } from "../referential/reading.js";
import { normalizeText } from "../trades/trade-profile.js";

/**
 * §49.9 (retour du fondateur, 2026-10-09, devis de réparation D.2026.105) : « une ligne du quantitatif nomme une
 * fourniture, jamais la phrase du devis ».
 *
 *  - Le lecteur extrait la fourniture contenue dans chaque prestation, d'abord dans les sous-lignes du devis
 *    (« – Tuile terre cuite mécanique »), puis dans le texte (« y compris les petites fournitures de fixation ») :
 *    ce sont les « articles » de la lecture (§41.1).
 *  - Une ligne sans fourniture (heures, forfait, évacuation) est hors quantitatif : pas dans la liste, repliée sous
 *    « N lignes sans fourniture ». Une unité h, fft ou jour n'est jamais une fourniture.
 */

/** Les unités qui ne sont jamais une fourniture (§49.9), écrites comme on les lit au devis (minuscules, sans accent). */
export const WITHOUT_SUPPLY_UNITS = ["h", "hr", "hrs", "heure", "heures", "j", "jour", "jours", "journee", "journees", "fft", "ft", "forfait", "forfaits"] as const;
/** Parmi elles, le temps : une heure ou un jour ne nomme jamais un article, quel que soit le texte de la ligne. */
const TIME_UNITS = new Set(["h", "hr", "hrs", "heure", "heures", "j", "jour", "jours", "journee", "journees"]);

const unitWord = (unit: string | null | undefined) => normalizeText(unit ?? "").replace(/[.\s]/g, "");

/** « 1,5 h », « 2 jours », « 1 fft » : l'unité dit une prestation, jamais une fourniture (§49.9). */
export function isWithoutSupplyUnit(unit: string | null | undefined): boolean {
  return (WITHOUT_SUPPLY_UNITS as readonly string[]).includes(unitWord(unit));
}

/** Une durée (heures, jours) : jamais un article, même si la ligne nomme un matériau (« Repositionnement des tuiles · 1,5 h »). */
export function isTimeUnit(unit: string | null | undefined): boolean {
  return TIME_UNITS.has(unitWord(unit));
}

/**
 * Une PRESTATION écrite en phrase (« Remplacement unitaire d'une tuile cassée, comprenant accès toit… ») : la ligne
 * décrit un travail, sa fourniture est dans ses sous-lignes ou son texte. Seuls les verbes de réparation comptent, en tête
 * de ligne : « Couverture… », « Gouttière… », « Fourniture et pose de… » nomment déjà leur article (le moteur les lit).
 */
const PRESTATION_HEADS = [
  "remplacement",
  "repositionnement",
  "remaniement",
  "reprise",
  "reparation",
  "revision",
  "recherche",
  "intervention",
  "demoussage",
  "nettoyage",
  "traitement",
  "remise en place",
  "remise en etat",
  "fixation",
  "scellement",
  "calfeutrement",
];

export function isPrestationPhrase(designation: string): boolean {
  const text = normalizeText(designation).replace(/^[^a-z]+/, "");
  return PRESTATION_HEADS.some((h) => text === h || text.startsWith(`${h} `) || text.startsWith(`${h},`));
}

export interface SupplyLine {
  ref: string;
  designation: string;
  quantity: string | null;
  unit: string | null;
}

/**
 * Remplace chaque prestation par la fourniture qu'elle contient (§49.9) : une ligne par article lu, nommée par l'article
 * (« Tuile terre cuite mécanique »), avec sa quantité, sinon celle de la ligne quand elle compte des articles (jamais
 * des heures ni un forfait). La ligne garde sa place dans le devis (l'article n° 1 de la ligne 3 est « 3.1 »).
 * Le « manque » de la prestation va à l'article qu'il nomme (sinon au premier) : une donnée se demande une fois.
 * Une ligne qui n'est pas une prestation reste telle qu'écrite.
 */
export function supplyLines<L extends SupplyLine>(
  lines: readonly L[],
  readings: ReadonlyMap<string, QuoteLineReading> = new Map(),
): { lines: (L | (SupplyLine & { parent: string }))[]; readings: Map<string, QuoteLineReading> } {
  const out: (L | (SupplyLine & { parent: string }))[] = [];
  const read = new Map(readings);
  for (const line of lines) {
    const reading = readings.get(line.ref);
    const articles = (reading?.articles ?? []).filter((a) => a.nom.trim());
    if (articles.length === 0 || !(isWithoutSupplyUnit(line.unit) || isPrestationPhrase(line.designation))) {
      out.push(line);
      continue;
    }
    read.delete(line.ref);
    const lineCounts = !isWithoutSupplyUnit(line.unit);
    const names = articles.map((a) => articleName(a));
    const manqueOf = new Map<number, string[]>();
    for (const m of reading!.manque) {
      const words = significant(m);
      const at = names.findIndex((n) => significant(n).some((w) => words.includes(w)));
      const i = at >= 0 ? at : 0;
      manqueOf.set(i, [...(manqueOf.get(i) ?? []), m]);
    }
    articles.forEach((a, i) => {
      const ref = `${line.ref}.${i + 1}`;
      const own = a.quantite?.trim() || null;
      out.push({
        ref,
        parent: line.ref,
        designation: names[i]!,
        quantity: own ?? (lineCounts ? line.quantity : null),
        unit: own ? (a.unite?.trim() || null) : lineCounts ? line.unit : null,
      });
      read.set(ref, { role: "fourniture", articles: [a], faconnage: reading!.faconnage, manque: manqueOf.get(i) ?? [] });
    });
  }
  return { lines: out, readings: read };
}

/** « Tuile terre cuite mécanique » : le nom de l'article, puis ce qui le précise s'il n'y est pas déjà. */
function articleName(a: QuoteLineReading["articles"][number]): string {
  const nom = a.nom.trim().replace(/^[-–—•*\s]+/, "");
  const materiau = a.materiau?.trim();
  const full = materiau && !normalizeText(nom).includes(normalizeText(materiau)) ? `${nom} ${materiau}` : nom;
  return full.charAt(0).toUpperCase() + full.slice(1);
}

const STOP = new Set(["pour", "dans", "avec", "sans", "les", "des", "une", "aux", "sur"]);
const significant = (text: string) =>
  normalizeText(text)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 3 && !STOP.has(w))
    .map((w) => w.replace(/[sx]$/, ""));

/**
 * « N lignes sans fourniture » (§49.9) : les lignes du devis qui ne nomment aucune fourniture (main-d'œuvre, heures,
 * forfait, évacuation), dans l'ordre du devis. Elles ne sont pas dans la liste et ne partent jamais au fournisseur ; elles
 * se montrent repliées, pour que l'artisan retrouve tout son devis.
 */
export function linesWithoutSupply<L extends { id: string; designation: string; quantity: string | null; unit: string | null }>(
  lines: readonly L[],
  validation: { lines: readonly { lineId: string; kind: string }[] },
  readings: ReadonlyMap<string, QuoteLineReading> = new Map(),
): { lineId: string; label: string; measure: string | null }[] {
  return lines
    .filter((l) => readings.get(l.id)?.role === "hors_quantitatif" || validation.lines.find((v) => v.lineId === l.id)?.kind === "labor")
    .map((l) => ({ lineId: l.id, label: l.designation.trim(), measure: [l.quantity?.trim(), l.unit?.trim()].filter(Boolean).join(" ") || null }));
}
