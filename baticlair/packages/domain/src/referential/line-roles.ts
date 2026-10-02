import type { TakeoffIssue, TakeoffValidation } from "../takeoff/validation.js";
import type { Referential } from "./model.js";
import { LINE_UNITS, type QuotePlan } from "./plan.js";
import { parseRefUnit, sameDim } from "./units.js";

/**
 * RÔLE DE LA QUANTITÉ D'UNE LIGNE DU DEVIS — le premier des trois niveaux,
 * jamais confondus :
 *  1. ce que dit le devis : la MESURE d'un ouvrage (« 120 m² de toiture »,
 *     « 2 descentes ») ou une quantité explicitement À COMMANDER (« 10 chatières ») ;
 *  2. le besoin matériel calculé (« 349,85 m de liteaux ») ;
 *  3. la quantité à commander (« 88 longueurs de 4 m »), seulement si le
 *     conditionnement est sourcé.
 *
 * Le rôle est PROPOSÉ par le code à la lecture (aucun appel IA), à partir de
 * ce que la ligne dit vraiment. Quand rien ne permet de trancher (pas
 * d'unité), il reste « indéterminé » : l'ambiguïté est gardée, et la question
 * n'est posée que si elle change la commande.
 */
export type LineRole = "measure" | "purchase" | "undetermined";

export interface RoleProposal {
  role: LineRole;
  /** Pourquoi, en une phrase (montré dans « Voir le calcul »). */
  why: string;
}

export interface RoleLine {
  ref: string;
  /** Référence produit écrite sur la ligne (catalogue) : elle désigne un article. */
  reference?: string | null;
}

/**
 * Propose le rôle de chaque ligne de matériau. Dans l'ordre :
 *  - pas d'unité : indéterminé (la question d'unité existante tranche) ;
 *  - mesure d'ouvrage reconnue (m² de couverture, m de faîtage…) : mesure ;
 *  - la ligne cite d'autres composants de son ouvrage (« crochets et naissances
 *    compris », « avec coudes ») : elle décrit l'OUVRAGE, sa quantité le mesure ;
 *  - sa quantité est, par son unité, la donnée de l'ouvrage (longueur de
 *    gouttière, nombre de descentes) et aucune référence d'article n'est
 *    écrite : mesure ;
 *  - sinon : quantité à commander telle qu'écrite.
 */
export function proposeLineRoles(lines: readonly RoleLine[], plan: QuotePlan, validation: TakeoffValidation, ref: Referential): Map<string, RoleProposal> {
  const roles = new Map<string, RoleProposal>();
  for (const v of validation.lines) {
    if (v.kind === "labor") continue;
    const line = lines.find((l) => l.ref === v.lineId);
    const planned = plan.lines.find((l) => l.ref === v.lineId);
    if (v.unit === null) {
      roles.set(v.lineId, { role: "undetermined", why: "Pas d'unité : rien ne dit si c'est une mesure d'ouvrage ou une quantité à commander." });
      continue;
    }
    if (v.basis === "work") {
      roles.set(v.lineId, { role: "measure", why: "La quantité mesure l'ouvrage (surface, longueur ou nombre d'ouvrages), pas un matériau." });
      continue;
    }
    if (planned?.status === "planned") {
      const work = ref.workItems.find((w) => w.id === planned.workItemId);
      if (work && planned.mentions.length > 0) {
        const names = work.slots.filter((s) => planned.mentions.includes(s.key)).map((s) => s.label.toLowerCase());
        roles.set(v.lineId, { role: "measure", why: `La ligne décrit un ouvrage complet (${names.join(", ")} compris) : sa quantité mesure l'ouvrage.` });
        continue;
      }
      const unit = LINE_UNITS[v.unit];
      const param = work && unit ? work.params.find((p) => p.fromLineQuantity && sameDim(parseRefUnit(p.unit).dim, parseRefUnit(unit).dim)) : undefined;
      if (param && !line?.reference?.trim()) {
        roles.set(v.lineId, { role: "measure", why: `La quantité est la ${param.label.toLowerCase()} de l'ouvrage.` });
        continue;
      }
    }
    roles.set(v.lineId, { role: "purchase", why: "Quantité d'un article, à commander telle qu'écrite." });
  }
  return roles;
}

/** Message unique du constat « mesure d'ouvrage » (aussi émis par la lecture). */
const MEASURE_ISSUE: TakeoffIssue = {
  code: "WORK_QUANTITY",
  severity: "info",
  message: "Mesure de l'ouvrage : la quantité à commander reste à calculer (demandée au fournisseur pour cette mesure).",
};

/**
 * Applique les rôles à la lecture : une MESURE n'est jamais une quantité
 * d'achat (ni ✓ de commande, ni emplacement « déjà donné » au calcul), même
 * si sa famille se commande d'ordinaire à la longueur ou à la pièce.
 */
export function applyLineRoles(validation: TakeoffValidation, roles: ReadonlyMap<string, LineRole>): TakeoffValidation {
  return {
    ...validation,
    lines: validation.lines.map((v) => {
      const role = roles.get(v.lineId);
      if (role === "measure" && v.basis !== "work") {
        return { ...v, basis: "work", issues: [...v.issues.filter((i) => i.code !== "WORK_QUANTITY"), MEASURE_ISSUE] };
      }
      if (role === "purchase" && v.basis === "work") {
        return { ...v, basis: "purchase", issues: v.issues.filter((i) => i.code !== "WORK_QUANTITY") };
      }
      return v;
    }),
  };
}
