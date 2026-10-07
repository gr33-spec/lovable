import { baseOf } from "./model.js";
import type { TakeoffIssue, TakeoffValidation } from "../takeoff/validation.js";
import { keywordPosition, normalizeText } from "../trades/trade-profile.js";
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
  /**
   * Ambiguïté qui change la commande (« 6 : des ardoises, ou des jouées ? ») :
   * la question, et ce que serait chacune des deux lectures.
   */
  ask?: { text: string; purchase: string; measure: string };
}

export interface RoleLine {
  ref: string;
  /** Désignation (pour reconnaître un ouvrage compté : « 2 entourages de cheminée »). */
  designation?: string;
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
    // La ligne désigne un emplacement « mesure seulement » (joint debout en m², abergement à l'unité) :
    // sa quantité mesure l'ouvrage, le moteur en déduit ce qui se commande. Aucune question.
    if (planned?.status === "planned") {
      const slot = ref.workItems.find((w) => w.id === baseOf(planned.workItemId))?.slots.find((s) => s.key === planned.slot);
      if (slot?.measureOnly && slot.orderedAsWritten) {
        roles.set(v.lineId, { role: "purchase", why: `L'article se commande tel qu'écrit ; son nombre compte aussi l'ouvrage (${slot.label.toLowerCase()}) pour les fournitures de pose.` });
        continue;
      }
      if (slot?.measureOnly) {
        roles.set(v.lineId, { role: "measure", why: `La quantité mesure l'ouvrage (${slot.label.toLowerCase()}) ; ce qui se commande en découle.` });
        continue;
      }
    }
    // Ouvrage compté à l'unité (« 2 entourages de cheminée », « ardoises pour 6 jouées ») : jamais un nombre d'articles.
    const counted = v.unit === "U" && line?.designation ? countedWork(line.designation, ref) : null;
    if (counted) {
      const qty = v.quantity?.toFixed() ?? "?";
      if (!counted.material) {
        roles.set(v.lineId, { role: "measure", why: `La quantité compte des ouvrages (${counted.work.label.many}), pas des articles.` });
      } else {
        roles.set(v.lineId, {
          role: "undetermined",
          why: `« ${qty} » peut compter des ${counted.material} ou des ${counted.work.label.many} : cela change la commande.`,
          ask: {
            text: `${qty} : c'est le nombre ${de(counted.material)} à commander, ou le nombre ${de(counted.work.label.many)} ?`,
            purchase: `${qty} ${counted.material} à commander`,
            measure: `${qty} ${Number(qty) > 1 ? counted.work.label.many : counted.work.label.one} (matériaux à calculer)`,
          },
        });
      }
      continue;
    }
    // « Crochets d'ardoise inox 110 mm, 1 lot » : un lot ne dit pas combien d'articles ; le calcul les compte.
    if (planned?.status === "planned" && (v.unit === "FORFAIT" || v.unit === "LOT")) {
      roles.set(v.lineId, { role: "measure", why: v.unit === "LOT" ? "« Lot » ne dit pas combien d'articles commander : le calcul les compte." : "La ligne décrit l'ouvrage au forfait : rien ne se commande « au forfait »." });
      continue;
    }
    if (planned?.status === "planned" && planned.measureInText) {
      const m = planned.measureInText;
      roles.set(v.lineId, { role: "measure", why: `La mesure de l'ouvrage est écrite dans le texte (${m.value.replace(".", ",")} ${m.unit === "m2" ? "m²" : m.unit}) : la quantité de la ligne ne se commande pas.` });
      continue;
    }
    if (planned?.status === "planned") {
      const work = ref.workItems.find((w) => w.id === baseOf(planned.workItemId));
      if (work && planned.mentions.length > 0) {
        const names = work.slots.filter((s) => planned.mentions.includes(s.key)).map((s) => s.label.toLowerCase());
        roles.set(v.lineId, { role: "measure", why: `La ligne décrit un ouvrage complet (${names.join(", ")} compris) : sa quantité mesure l'ouvrage.` });
        continue;
      }
      const unit = LINE_UNITS[v.unit];
      const param = work && unit ? work.params.find((p) => p.fromLineQuantity && (!p.forSlots || p.forSlots.includes(planned.slot)) && sameDim(parseRefUnit(p.unit).dim, parseRefUnit(unit).dim)) : undefined;
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
        // Une mesure n'a pas d'« unité inhabituelle » : 1 forfait de couverture décrit l'ouvrage, il ne se commande pas.
        return { ...v, basis: "work", issues: [...v.issues.filter((i) => i.code !== "WORK_QUANTITY" && i.code !== "UNIT_UNUSUAL_FOR_FAMILY"), MEASURE_ISSUE] };
      }
      // Ambiguïté tranchable (« 6 : ardoises ou jouées ? ») : tant que l'artisan n'a pas répondu, ce n'est
      // PAS une quantité d'achat (ni ✓, ni emplacement « déjà donné » qui effacerait un calcul).
      if (role === "undetermined" && v.unit !== null && v.basis !== "work") {
        return { ...v, basis: "work" };
      }
      if (role === "purchase" && v.basis === "work") {
        return { ...v, basis: "purchase", issues: v.issues.filter((i) => i.code !== "WORK_QUANTITY") };
      }
      return v;
    }),
  };
}

/**
 * L'ouvrage compté que nomme la ligne, et le matériau nommé AVANT lui s'il y en
 * a un (« Ardoises pour jouées » : matériau « Ardoise », ouvrage « jouée ») :
 * dans ce cas, le nombre peut compter l'un ou l'autre.
 */
function countedWork(designation: string, ref: Referential): { work: NonNullable<Referential["countedWorks"]>[number]; material: string | null } | null {
  const text = normalizeText(designation);
  let best: { work: NonNullable<Referential["countedWorks"]>[number]; pos: number } | null = null;
  for (const work of ref.countedWorks ?? []) {
    for (const k of work.keywords) {
      const pos = keywordPosition(text, k);
      if (pos >= 0 && (!best || pos < best.pos)) best = { work, pos };
    }
  }
  if (!best) return null;
  // Le matériau, tel que le devis le nomme (« ardoises »), au pluriel.
  let material: { word: string; pos: number } | null = null;
  for (const f of ref.families) {
    for (const k of f.keywords ?? []) {
      const pos = keywordPosition(text, k);
      if (pos >= 0 && pos < best.pos && (!material || pos < material.pos)) material = { word: /[sx]$/.test(k) ? k : `${k}s`, pos };
    }
  }
  return { work: best.work, material: material?.word ?? null };
}

/** « de jouées », « d'ardoises ». */
const de = (word: string) => (/^[aeiouyhéè]/i.test(word) ? `d'${word}` : `de ${word}`);
