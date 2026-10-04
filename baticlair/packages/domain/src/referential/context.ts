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
export function paramsFromContext(context: ChantierContext, work: WorkItemType): { params: Record<string, ParamValue>; conflicts: ContextConflict[] } {
  const params: Record<string, ParamValue> = {};
  const conflicts: ContextConflict[] = [];
  for (const def of work.params) {
    const facts = context.facts.filter((f) => f.key === def.key);
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
    if (usable.every((f) => baseValue(f)!.value.equals(first.value))) {
      params[def.key] = { value: usable[0]!.value, unit: usable[0]!.unit, origin: "devis", evidence: usable.map((f) => f.evidence).join(", ") };
    } else {
      conflicts.push({ key: def.key, facts: usable });
    }
  }
  return { params, conflicts };
}
