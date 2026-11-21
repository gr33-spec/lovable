import { Decimal } from "decimal.js";
import { normalizeText } from "../trades/trade-profile.js";
import { withoutLabour } from "../trust/marchandise.js";

/**
 * LE CHANTIER PAR LOGEMENT (retour du fondateur, 2026-10-05 : « mettre de l'ordre : logement 1, tant de prises…,
 * logement 2…, puis on regroupe pour l'envoi au fournisseur, comme des professionnels »). Le devis le dit dans ses titres
 * (« Logement 1 », « Appartement A12 », « N°1 TYPE T3 ») : chaque ligne va à son logement, les mêmes articles d'un
 * logement s'additionnent (prises du séjour + prises de la cuisine), les logements identiques se regroupent
 * (« × 6 »). Aucun chiffre n'est inventé : ce sont les quantités du devis, rangées. Le total à commander reste la
 * liste des fournitures.
 */
export interface SiteUnitLine {
  id: string;
  designation: string;
  quantity: string | null;
  unit: string | null;
  section?: readonly string[] | undefined;
}

export interface SiteUnitItem {
  designation: string;
  /** Somme des quantités du devis pour ce logement (« 14 »), null si une ligne n'en a pas. */
  quantity: string | null;
  unit: string | null;
  lineIds: string[];
}

export interface SiteUnit {
  key: string;
  /** Les logements de ce groupe (un seul, ou plusieurs logements identiques). */
  labels: string[];
  items: SiteUnitItem[];
}

export interface SiteUnits {
  units: SiteUnit[];
  /** Nombre de logements (les identiques comptent chacun). */
  count: number;
  /** Ce qui n'est dans aucun logement (parties communes, colonne montante, lignes sans titre). */
  other: SiteUnitItem[];
}

/** Un titre qui nomme UN logement : « Logement 3 », « Appartement A12 », « N°1 TYPE T3 », « Villa B » ; jamais un lot de corps d'état (« Lot 3 : Électricité »). */
const UNIT_TITLE =
  /\b(?:logements?|appartements?|appts?|villas?|maisons?|pavillons?|studios?|duplex|gites?)\b\s*(?:n\s*o?\s*)?[a-z]?\d+[a-z]?\b|\b(?:logement|appartement|villa|maison|pavillon)\s+[a-z]\b|\bn\s*o?\s*\d+\b.*\b(?:type\s+)?[tf]\d\b|\b(?:type\s+)?[tf][1-7]\b\s*(?:n\s*o?\s*)?\d+/;

export function isUnitTitle(title: string): boolean {
  return UNIT_TITLE.test(normalizeText(title).replace(/°/g, "o"));
}

const number = (raw: string | null): Decimal | null => {
  if (!raw) return null;
  const clean = raw.replace(/[\s  ]/g, "").replace(",", ".");
  return /^\d+(?:\.\d+)?$/.test(clean) ? new Decimal(clean) : null;
};
const written = (d: Decimal) => d.toFixed().replace(".", ",");

function aggregate(lines: readonly SiteUnitLine[]): SiteUnitItem[] {
  const items = new Map<string, { item: SiteUnitItem; sum: Decimal | null }>();
  for (const l of lines) {
    const designation = withoutLabour(l.designation).trim();
    const key = `${normalizeText(designation)}|${normalizeText(l.unit ?? "")}`;
    const n = number(l.quantity);
    const known = items.get(key);
    if (!known) {
      items.set(key, {
        item: {
          designation,
          quantity: l.quantity,
          unit: l.unit,
          lineIds: [l.id],
        },
        sum: n,
      });
      continue;
    }
    known.item.lineIds.push(l.id);
    known.sum = known.sum && n ? known.sum.plus(n) : null;
  }
  return [...items.values()].map(({ item, sum }) => ({
    ...item,
    quantity: sum
      ? written(sum)
      : item.lineIds.length > 1
        ? null
        : item.quantity,
  }));
}

/**
 * Range les lignes du devis par logement. Moins de deux logements nommés dans les titres : null (rien à ranger, la
 * liste des fournitures suffit).
 */
export function siteUnits(lines: readonly SiteUnitLine[]): SiteUnits | null {
  const byUnit = new Map<string, { label: string; lines: SiteUnitLine[] }>();
  const other: SiteUnitLine[] = [];
  for (const l of lines) {
    const section = l.section ?? [];
    const at = section.findIndex(isUnitTitle);
    if (at < 0) {
      other.push(l);
      continue;
    }
    // Le chemin jusqu'au logement : « Bât. A › Logement 1 » et « Bât. B › Logement 1 » sont deux logements.
    const path = section.slice(0, at + 1);
    const key = path.map(normalizeText).join(" > ");
    const unit = byUnit.get(key) ?? { label: path.join(" › "), lines: [] };
    unit.lines.push(l);
    byUnit.set(key, unit);
  }
  if (byUnit.size < 2) return null;

  // Les logements identiques (mêmes articles, mêmes quantités) se regroupent, dans l'ordre du devis.
  const groups = new Map<string, SiteUnit>();
  for (const [key, u] of byUnit) {
    const items = aggregate(u.lines);
    const signature = items
      .map(
        (i) =>
          `${normalizeText(i.designation)}|${i.quantity ?? "?"}|${normalizeText(i.unit ?? "")}`,
      )
      .sort()
      .join("\n");
    const same = groups.get(signature);
    if (same) {
      same.labels.push(u.label);
      for (const i of items)
        same.items
          .find(
            (x) =>
              normalizeText(x.designation) === normalizeText(i.designation),
          )
          ?.lineIds.push(...i.lineIds);
    } else groups.set(signature, { key, labels: [u.label], items });
  }
  return {
    units: [...groups.values()],
    count: byUnit.size,
    other: aggregate(other),
  };
}
