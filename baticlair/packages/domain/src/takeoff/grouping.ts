import { parseUnit } from "../quantity/unit.js";
import { Decimal } from "../shared/decimal.js";
import { normalizeText } from "../trades/trade-profile.js";
import { articleScope } from "./sections.js";
import { parseFrenchQuantity } from "./validation.js";

/**
 * Une ligne telle qu'elle part chez le fournisseur. `section` : les titres
 * du devis au-dessus de la ligne, du plus général au plus précis
 * (« Appareillage Hager Essensya › Logement T3 n°1 › Cuisine »).
 */
export interface GroupableLine {
  designation: string;
  quantity: string | null;
  unit: string | null;
  reference: string | null;
  basis?: "work";
  section?: readonly string[];
}

export type GroupedLine<T extends GroupableLine> = T & {
  /** Nombre de lignes du devis réunies (1 si la ligne est seule). */
  mergedFrom: number;
  /** Titres COMMUNS à toutes les lignes réunies : ce qu'ils disent vaut pour chacune. */
  section: string[];
};

/** « 64 », « 12,5 » : à la française, sans séparateur de milliers (comme écrit dans un devis). */
const frQuantity = (d: Decimal) => d.toFixed().replace(".", ",");

function commonPrefix(paths: readonly (readonly string[])[]): string[] {
  const [first = [], ...others] = paths;
  const out: string[] = [];
  for (let i = 0; i < first.length; i++) {
    const title = first[i]!;
    if (!others.every((p) => p[i] !== undefined && normalizeText(p[i]!) === normalizeText(title))) break;
    out.push(title);
  }
  return out;
}

/**
 * Regroupe les articles IDENTIQUES avant l'envoi au fournisseur : un devis
 * pièce par pièce ou logement par logement répète « Prise de courant 16A+T »
 * vingt fois ; le fournisseur doit lire une ligne, avec le total.
 *
 * Identiques = même désignation (à la casse et aux accents près), même
 * unité, même référence, même nature (achat ou mesure d'ouvrage), et mêmes
 * titres de section HORS LIEUX : une prise sous « Appareillage Hager » et
 * une prise sous « Appareillage Legrand » restent deux lignes. Rien d'autre
 * n'est rapproché ; une ligne sans quantité lisible ou sans unité connue
 * n'est jamais additionnée.
 *
 * Les titres communs à toutes les lignes réunies partent avec la ligne
 * (marque, gamme, lot) : ils valent pour chacune. Les lieux qui diffèrent
 * (la pièce, le logement) ne disent rien de l'article : ils ne partent pas.
 */
export function groupIdenticalLines<T extends GroupableLine>(lines: readonly T[]): GroupedLine<T>[] {
  const groups = new Map<string, { first: T; total: Decimal; members: T[] }>();
  const out: (string | GroupedLine<T>)[] = [];
  for (const line of lines) {
    const quantity = parseFrenchQuantity(line.quantity);
    const unit = parseUnit(line.unit);
    // On n'additionne que des quantités lisibles, dans une unité connue (deux « 1 » sans unité
    // peuvent être deux forfaits différents).
    if (!quantity || !unit) {
      out.push({ ...line, mergedFrom: 1, section: [...(line.section ?? [])] });
      continue;
    }
    // Un titre qui n'est pas un lieu (marque, gamme, lot) distingue l'article : jamais fusionné au-delà.
    const key = [normalizeText(line.designation), unit, normalizeText(line.reference ?? ""), line.basis ?? "purchase", ...articleScope(line.section)].join("|");
    const group = groups.get(key);
    if (group) {
      group.total = group.total.plus(quantity);
      group.members.push(line);
    } else {
      groups.set(key, { first: line, total: quantity, members: [line] });
      out.push(key);
    }
  }
  return out.map((entry) => {
    if (typeof entry !== "string") return entry;
    const g = groups.get(entry)!;
    return {
      ...g.first,
      quantity: g.members.length > 1 ? frQuantity(g.total) : g.first.quantity,
      mergedFrom: g.members.length,
      section: commonPrefix(g.members.map((m) => m.section ?? [])),
    };
  });
}
