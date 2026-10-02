import { computeChantier, type CompanyPreferences, type EngineOptions, type NeedResult, type Question } from "../referential/engine.js";
import type { Referential } from "../referential/model.js";
import type { QuotePlan } from "../referential/plan.js";
import type { TakeoffValidation } from "../takeoff/validation.js";
import { assessNeed, assessTakeoffLine, type Assessment, type TrustState } from "./assessment.js";

/**
 * CE QUE VOIT L'ARTISAN : des DÉCISIONS, pas des lignes en erreur.
 *
 * Toute la fiche de confiance reste derrière ; l'écran reçoit :
 *  - trois compteurs (✓ prêts, ⚠ à confirmer, ? information manquante) ;
 *  - les décisions à prendre, regroupées : 37 lignes qui dépendent de la même
 *    information font UNE décision, jamais 37 alertes ;
 *  - les ouvrages que BatiClair ne sait pas encore convertir, demandés au
 *    fournisseur pour la mesure du devis (information, pas une décision) ;
 *  - le reste, prêt, replié.
 * Une décision non prise ne disparaît pas : fermer l'écran ne rend rien ✓.
 */
export interface ViewLine {
  id: string;
  designation: string;
  quantity: string | null;
  unit: string | null;
  /** « C'est bon » donné sur ce chantier. */
  confirmed: boolean;
  /** Saisie ou corrigée par l'artisan. */
  enteredByArtisan: boolean;
}

export type DecisionAction =
  /** « Oui, ce sont des pièces » : l'unité manquante est « pièce » sur les lignes visées. */
  | "pieces"
  /** « Oui, tels qu'écrits » / « C'est bon » : les lignes visées sont gardées telles quelles. */
  | "keep"
  /** Corriger une ligne (ou voir la liste des lignes visées). */
  | "edit"
  /** Répondre à une question du calcul (produit, donnée du chantier). */
  | "answer"
  /** Retirer la ligne de la liste (remise, information, fourni par un autre lot…). */
  | "remove";

export interface Decision {
  /** Stable d'un affichage à l'autre : « group:units+unknown », « line:<id> », « engine:param:pureau ». */
  key: string;
  state: "to_confirm" | "missing";
  /** Ce que la décision concerne, en mots d'artisan (« Tuiles HP10 », « Articles du devis »). */
  title: string;
  /** La question ou l'explication, en une ou deux phrases. */
  text: string;
  /** Lignes du devis que la décision règle en une fois. */
  lineIds: string[];
  /**
   * Pour « à la pièce » : les seules lignes SANS unité (ni colonne, ni unité écrite dans le
   * texte). Une ligne « au m² » ne passe jamais à la pièce.
   */
  pieceLineIds?: string[];
  /** Action principale (gros bouton) puis secondaires. */
  primary: { action: DecisionAction; label: string } | null;
  secondary: DecisionAction[];
  /** Pour une question du calcul : la question du moteur (options, unité, impact). */
  question?: Question;
}

export interface ViewItem {
  /** Ligne du devis (« line ») ou besoin calculé par BatiClair (« need »). */
  kind: "line" | "need";
  id: string;
  label: string;
  quantity: string | null;
  state: TrustState;
  reason: string | null;
  assessment: Assessment;
  /** Pour un besoin calculé : le détail du calcul (preuve). */
  need?: NeedResult;
}

export interface ArtisanView {
  counts: Record<TrustState, number>;
  decisions: Decision[];
  /** Ouvrages demandés au fournisseur pour la mesure du devis : BatiClair ne calcule pas encore leurs matériaux. */
  measures: { lineIds: string[]; text: string } | null;
  items: ViewItem[];
}

const UNIT_CAUSES = new Set(["UNITS_ABSENT", "UNIT_MISSING"]);
const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

/** Ce qu'il reste à décider sur une ligne : les causes des critères non établis qui changent la commande. */
function openCauses(a: Assessment): { cause: string; detail: string; state: "to_confirm" | "missing" }[] {
  return a.criteria
    .filter((c) => c.status === "to_confirm" || c.status === "missing")
    .map((c) => ({ cause: c.cause ?? c.key, detail: c.detail, state: c.status as "to_confirm" | "missing" }));
}

/**
 * Décisions de groupe : on raisonne en INFORMATION à donner, pas en lignes.
 *  - « unknown » : tous les articles que BatiClair ne connaît pas (avec ou sans unité) — une seule
 *    réponse les garde tels qu'écrits, à la pièce quand l'unité manque ;
 *  - « units »   : les articles connus mais sans unité.
 */
function groupDecision(kind: "unknown" | "units", lines: ViewLine[], unitlessIds: ReadonlySet<string>): Decision {
  const n = lines.length;
  const ids = lines.map((l) => l.id);
  const one = n === 1 ? lines[0]!.designation : null;
  const pieceLineIds = ids.filter((id) => unitlessIds.has(id));
  const unitless = pieceLineIds.length;
  if (kind === "unknown") {
    const pieces = unitless > 0;
    return {
      key: "group:unknown",
      state: "to_confirm",
      title: one ?? "Articles que BatiClair ne connaît pas encore",
      text: one
        ? `BatiClair ne connaît pas encore cet article. Le demander tel qu'écrit${pieces ? ", à la pièce" : ""} ?`
        : `${n} articles que BatiClair ne connaît pas encore${unitless > 0 ? `, dont ${unitless} sans unité` : ""}. Les demander aux fournisseurs tels qu'écrits${pieces ? (unitless === n ? ", à la pièce" : ", à la pièce quand l'unité manque") : ""} ?`,
      lineIds: ids,
      ...(pieces ? { pieceLineIds } : {}),
      primary: pieces ? { action: "pieces", label: one ? "Oui, à la pièce" : "Oui, tels qu'écrits" } : { action: "keep", label: one ? "Oui, tel qu'écrit" : "Oui, tels qu'écrits" },
      secondary: ["edit"],
    };
  }
  return {
    key: "group:units",
    state: "to_confirm",
    title: one ?? "Unités",
    text: one ? "Pas d'unité sur cette ligne. C'est à la pièce ?" : `${plural(n, "ligne", "lignes")} sans unité. Ce devis compte-t-il à la pièce ?`,
    lineIds: ids,
    pieceLineIds,
    primary: { action: "pieces", label: "Oui, à la pièce" },
    secondary: ["edit"],
  };
}

/** Texte d'une question du calcul, avec ce qu'elle change (« De 1 191 à 1 445 pièces selon la réponse »). */
function engineDecision(q: Question, need: NeedResult | undefined): Decision {
  const title = q.kind === "param" ? q.text.replace(/\s*\?$/, "") : (need?.slotLabel ?? "Produit");
  return {
    key: `engine:${q.key}`,
    state: q.kind === "param" ? "missing" : "to_confirm",
    title,
    text: q.impact ? `${q.text} Cela change la commande : ${q.impact.charAt(0).toLowerCase()}${q.impact.slice(1)}` : q.text,
    lineIds: [],
    primary: { action: "answer", label: q.kind === "param" ? "Renseigner" : q.kind === "confirm_product" ? "Oui, c'est bien celui-ci" : "Choisir" },
    secondary: q.kind === "confirm_product" ? ["edit"] : [],
    question: q,
  };
}

export function artisanView(
  lines: readonly ViewLine[],
  validation: TakeoffValidation,
  engine: { needs: readonly NeedResult[]; questions: readonly Question[]; declined?: readonly string[] } = { needs: [], questions: [] },
): ArtisanView {
  const items: ViewItem[] = [];
  const decisions: Decision[] = [];
  const groups = new Map<string, ViewLine[]>();
  const measureIds: string[] = [];
  const duplicates = validation.issues.filter((i) => i.code === "DUPLICATE_LINE" && i.severity !== "info");

  for (const v of validation.lines) {
    const line = lines.find((l) => l.id === v.lineId);
    if (!line) continue;
    const a = assessTakeoffLine(v, { documentIssues: validation.issues, confirmedByArtisan: line.confirmed, enteredByArtisan: line.enteredByArtisan });
    if (!a) continue; // prestation : rien à commander
    items.push({ kind: "line", id: line.id, label: line.designation, quantity: [line.quantity, line.unit].filter(Boolean).join(" ") || null, state: a.state, reason: a.reason, assessment: a });
    if (a.state === "verified") continue;

    const open = openCauses(a);
    // Article inconnu (avec ou sans unité) : décision « unknown » ; article connu sans unité : décision « units ».
    const group = open.some((o) => o.cause === "unknown_article") ? "unknown" : open.some((o) => UNIT_CAUSES.has(o.cause)) ? "units" : null;
    if (group) groups.set(group, [...(groups.get(group) ?? []), line]);
    if (open.some((o) => o.cause === "work_measure")) measureIds.push(line.id);
    // Doutes propres à cette ligne (multiplicateur, quantité introuvable, doute de lecture…) : une décision par ligne.
    const own = open.filter((o) => !UNIT_CAUSES.has(o.cause) && o.cause !== "unknown_article" && o.cause !== "work_measure" && o.cause !== "DUPLICATE_LINE");
    if (own.length > 0) {
      const missing = own.find((o) => o.state === "missing");
      decisions.push({
        key: `line:${line.id}`,
        state: missing ? "missing" : "to_confirm",
        title: line.designation,
        text: (missing ?? own[0]!).detail,
        lineIds: [line.id],
        primary: missing ? { action: "edit", label: "Renseigner" } : { action: "keep", label: "C'est bon" },
        secondary: missing ? ["remove"] : ["edit", "remove"],
      });
    }
  }

  for (const d of duplicates) {
    const ids = (d.lineIds ?? []).filter((id) => items.some((i) => i.id === id && i.state !== "verified"));
    if (ids.length < 2) continue;
    decisions.push({
      key: `duplicate:${ids.join(",")}`,
      state: "to_confirm",
      title: lines.find((l) => l.id === ids[0])?.designation ?? "Lignes identiques",
      text: "Deux lignes identiques se suivent : ce sont bien deux quantités à commander ?",
      lineIds: ids,
      primary: { action: "keep", label: "Oui, garder les deux" },
      secondary: ["edit"],
    });
  }

  // Les décisions qui règlent le plus de lignes d'abord ; une ligne sans quantité avant tout.
  const unitlessIds = new Set(validation.lines.filter((v) => v.unit === null).map((v) => v.lineId));
  const groupDecisions = [...groups.entries()].map(([kind, ls]) => groupDecision(kind as "unknown" | "units", ls, unitlessIds)).sort((a, b) => b.lineIds.length - a.lineIds.length);
  const lineDecisions = decisions.sort((a, b) => Number(b.state === "missing") - Number(a.state === "missing"));

  // Calcul des matériaux (moteur) : les besoins qu'il sait établir, et ses questions (une seule fois chacune).
  for (const n of engine.needs) {
    // « Aucun de ces produits » : le besoin n'est plus une question, il reste à documenter (l'ouvrage part comme mesure).
    if (n.origin === "suggested" || n.status === "unknown" || (n.question && engine.declined?.includes(n.question.key))) continue;
    const a = assessNeed(n);
    const quantity = n.purchase ? `${n.purchase.order.count} ${n.purchase.order.unit.many}` : n.quantity ? `${n.quantity.value} ${n.quantity.unit}` : null;
    items.push({ kind: "need", id: n.needId, label: n.label, quantity, state: a.state, reason: a.reason, assessment: a, need: n });
  }
  const engineDecisions = engine.questions.map((q) => engineDecision(q, engine.needs.find((n) => n.question?.key === q.key)));

  const counts: Record<TrustState, number> = { verified: 0, to_confirm: 0, missing: 0 };
  for (const i of items) counts[i.state]++;
  return {
    counts,
    decisions: [...lineDecisions.filter((d) => d.state === "missing"), ...groupDecisions, ...engineDecisions, ...lineDecisions.filter((d) => d.state !== "missing")],
    measures:
      measureIds.length > 0
        ? {
            lineIds: measureIds,
            text: `${plural(measureIds.length, "ouvrage mesuré", "ouvrages mesurés")} (m², ml…) : BatiClair ne sait pas encore en déduire les matériaux. ${measureIds.length > 1 ? "Ils seront demandés" : "Il sera demandé"} aux fournisseurs pour la mesure du devis.`,
          }
        : null,
    items,
  };
}

/**
 * Emplacements que le devis DONNE déjà comme un achat (« Faîtière ronde 42 u ») :
 * l'article et sa quantité sont écrits, le calcul n'a rien à demander dessus.
 * Une mesure d'ouvrage (« Faîtage 10 m ») n'en fait pas partie.
 */
export function slotsGivenByQuote(plan: QuotePlan, validation: TakeoffValidation): Set<string> {
  const given = new Set<string>();
  for (const l of plan.lines) {
    if (l.status !== "planned") continue;
    const v = validation.lines.find((x) => x.lineId === l.ref);
    if (v && v.kind === "material" && v.basis === "purchase" && v.quantity !== null && v.unit !== null) given.add(`${l.workItemId}/${l.slot}`);
  }
  return given;
}

/** Réponse de l'artisan à une question du calcul : un produit, une valeur, « aucun de ces produits » (null) ou « pas celui-ci » (""). */
export type EngineAnswer = string | { value: string; unit: string } | null;

/**
 * Le calcul avec les réponses déjà données sur ce chantier. Une réponse sert
 * à TOUS les ouvrages qui en dépendent ; une question n'est posée qu'une fois.
 * « Aucun de ces produits » arrête la question (le besoin reste à documenter) ;
 * « Pas celui-ci » écarte le produit habituel pour ce chantier et redemande.
 */
export function computeWithAnswers(
  ref: Referential,
  plan: QuotePlan,
  answers: Readonly<Record<string, EngineAnswer>>,
  preferences: CompanyPreferences = {},
  options: EngineOptions = {},
  /** Emplacements déjà donnés comme achat par le devis (voir slotsGivenByQuote) : ni calcul montré, ni question. */
  given: ReadonlySet<string> = new Set(),
): { needs: NeedResult[]; questions: Question[]; declined: string[] } {
  const declined = new Set(Object.entries(answers).filter(([, v]) => v === null).map(([k]) => k));
  const inputs = plan.inputs.map((input) => {
    const work = ref.workItems.find((w) => w.id === input.workItemId)!;
    const products = { ...input.products };
    const params = { ...input.params };
    const prefs = { products: { ...(preferences.products ?? {}) }, proposals: { ...(preferences.proposals ?? {}) }, ...(preferences.waste ? { waste: preferences.waste } : {}) };
    for (const [key, answer] of Object.entries(answers)) {
      const [kind, name] = key.split(":") as [string, string];
      if (kind === "product" && work.slots.some((s) => s.key === name)) {
        const family = work.slots.find((s) => s.key === name)!.family;
        if (typeof answer === "string" && answer !== "") products[name] = { productId: answer, origin: "artisan" };
        if (answer === "") {
          // « Pas celui-ci » : ni le produit lu, ni l'habituel ne valent pour ce chantier.
          delete products[name];
          for (const map of [prefs.products, prefs.proposals]) {
            delete map[name];
            delete map[family];
          }
        }
      }
      if (kind === "param" && answer && typeof answer !== "string" && work.params.some((p) => p.key === name)) {
        params[name] = { ...answer, origin: "artisan" };
      }
    }
    return { ...input, products, params, preferences: prefs };
  });
  const result = computeChantier(ref, inputs, options);
  const needs = result.workItems.flatMap((w) => w.needs.filter((n) => !given.has(`${w.workItemId}/${n.slot}`)));
  const seen = new Set<string>();
  const questions: Question[] = [];
  for (const n of needs) {
    if (!n.question || n.origin === "suggested" || declined.has(n.question.key) || seen.has(n.question.key)) continue;
    seen.add(n.question.key);
    questions.push(n.question);
  }
  return { needs, questions, declined: [...declined] };
}
