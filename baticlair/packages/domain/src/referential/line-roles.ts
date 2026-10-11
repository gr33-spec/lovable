import type { TakeoffIssue, TakeoffValidation } from "../takeoff/validation.js";

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
