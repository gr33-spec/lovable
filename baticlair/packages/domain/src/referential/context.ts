import { baseOf } from "./model.js";
import { Decimal } from "../shared/decimal.js";
import type { ParamValue } from "./engine.js";
import type { WorkItemType } from "./model.js";
import { parseRefUnit, sameDim } from "./units.js";

/**
 * CONTEXTE CHANTIER : tout ce que les documents du chantier disent, réuni
 * AVANT de calculer. Une information lue n'importe où (la pente dans
 * l'en-tête, l'entraxe dans une ligne de charpente, une longueur de
 * faîtage) sert à toutes les lignes : BatiClair raisonne sur le chantier,
 * pas ligne par ligne.
 *
 * Chaque fait garde sa preuve. Deux valeurs différentes pour la même
 * donnée ne sont jamais départagées en silence : c'est une question.
 */
export interface SiteFact {
  /** Clé de donnée chantier, la même que les paramètres d'ouvrage (« surface », « pente », « entraxe_supports »). */
  key: string;
  value: string;
  unit: string;
  /** Preuve : « Devis, ligne 5 », « Plan, cartouche ». */
  evidence: string;
  origin: "devis" | "document" | "artisan";
  /**
   * L'ouvrage dont une ligne a donné cette quantité : 200 m² d'ardoises et 20 m² de tuiles au garage sont deux
   * surfaces, pas une contradiction. Absent : une donnée du chantier entier (pente, note, code postal).
   */
  workItemId?: string;
  /**
   * La ligne du devis où l'IA l'a lue (« dimensions » du §41.1) : la donnée vaut pour l'ouvrage de CETTE ligne (le
   * développé de la rive n'est pas celui de la bande de ventilation) ; un autre ouvrage ne la reprend que s'il n'a rien.
   */
  line?: string;
  /**
   * Donnée lue sur une ligne qui EST l'ouvrage (« Peinture murs séjour 85 m² ») : plusieurs lignes du même ouvrage
   * (une par pièce) sont des surfaces différentes, qui s'additionnent ; ce n'est pas une contradiction (lot B).
   */
  fromMeasureLine?: true;
}

export interface ChantierContext {
  facts: SiteFact[];
}

export interface ContextConflict {
  key: string;
  facts: SiteFact[];
}

/** Valeur en unité de base, pour comparer « 34,3 cm » et « 343 mm ». */
function baseValue(f: SiteFact): { value: Decimal; dim: ReturnType<typeof parseRefUnit>["dim"] } | null {
  try {
    const u = parseRefUnit(f.unit);
    return { value: new Decimal(f.value).times(u.factor), dim: u.dim };
  } catch {
    return null;
  }
}

/**
 * Paramètres d'un ouvrage tirés du contexte. Une réponse de l'artisan
 * l'emporte sur un document ; plusieurs documents concordants donnent une
 * valeur certaine (toutes les preuves sont citées) ; des documents qui
 * divergent donnent un conflit, donc une question.
 */
export function paramsFromContext(
  context: ChantierContext,
  work: WorkItemType,
  /** Ouvrages principaux du chantier (la couverture) : seuls à prêter une donnée « onlyFromPrincipal » (l'aspect du zinc). */
  principal: ReadonlySet<string> = new Set(),
  /** Instance par ligne (« bandes-zinc__12 ») : ses données, jamais celles d'une pièce sœur. */
  id: string = work.id,
): { params: Record<string, ParamValue>; conflicts: ContextConflict[] } {
  const params: Record<string, ParamValue> = {};
  const conflicts: ContextConflict[] = [];
  for (const def of work.params) {
    // Une quantité de ligne vaut d'abord pour son ouvrage ; un autre ouvrage ne la reprend que s'il n'a rien lu lui-même
    // (le nombre de descentes écrit sur la ligne « descente » sert à la gouttière ; la surface du garage, pas aux ardoises).
    const all = context.facts.filter((f) => f.key === def.key);
    const own = all.filter((f) => f.workItemId === id);
    // L'aspect du zinc d'une bande ne fait pas celui de la couverture ; celui de la couverture fait celui de ses bandes.
    // Une pièce sœur (une autre bande zinc du devis) ne prête jamais ses données : chaque pièce a les siennes.
    const lent = def.ownOnly ? [] : all.filter((f) => f.workItemId && f.workItemId !== id && baseOf(f.workItemId) !== work.id && (!def.onlyFromPrincipal || principal.has(f.workItemId)));
    const kept = new Set(own.length > 0 ? own : lent);
    // Dans l'ordre où elles sont venues : le devis d'abord, l'en-tête ou la note ensuite.
    const facts = all.filter((f) => !f.workItemId || kept.has(f));
    if (facts.length === 0) continue;
    const answer = facts.filter((f) => f.origin === "artisan").at(-1);
    if (answer) {
      // L'artisan l'emporte ; si un document disait autre chose, l'explication le dit aussi (rien n'est effacé).
      const a = baseValue(answer);
      const others = facts.filter((f) => f.origin !== "artisan" && f !== answer).filter((f) => {
        const b = baseValue(f);
        return !a || !b || !sameDim(a.dim, b.dim) || !a.value.equals(b.value);
      });
      const said = others.map((f) => `${f.evidence} : ${f.value} ${f.unit}`);
      params[def.key] = { value: answer.value, unit: answer.unit, origin: "artisan", evidence: said.length > 0 ? `${answer.evidence} ; ${said.join(" ; ")}` : answer.evidence };
      continue;
    }
    const expected = parseRefUnit(def.unit).dim;
    const usable = facts.filter((f) => {
      const b = baseValue(f);
      return b !== null && sameDim(b.dim, expected);
    });
    if (usable.length === 0) continue;
    const first = baseValue(usable[0]!)!;
    // Plusieurs lignes du même ouvrage, une par pièce ou par façade : leurs surfaces s'additionnent.
    const lines = usable.filter((f) => f.fromMeasureLine && f.workItemId === id && f.origin === "devis");
    if (def.fromLineQuantity && lines.length >= 2 && lines.length === usable.length) {
      const total = lines.reduce((sum, f) => sum.plus(baseValue(f)!.value), new Decimal(0));
      const factor = parseRefUnit(usable[0]!.unit).factor;
      params[def.key] = {
        value: total.dividedBy(factor).toFixed(),
        unit: usable[0]!.unit,
        origin: "devis",
        evidence: lines.map((f) => `${f.evidence} (${f.value.replace(".", ",")} ${f.unit === "m2" ? "m²" : f.unit})`).join(" + "),
      };
      continue;
    }
    if (usable.every((f) => baseValue(f)!.value.equals(first.value))) {
      params[def.key] = { value: usable[0]!.value, unit: usable[0]!.unit, origin: "devis", evidence: usable.map((f) => f.evidence).join(", ") };
    } else {
      conflicts.push({ key: def.key, facts: usable });
    }
  }
  return { params, conflicts };
}
