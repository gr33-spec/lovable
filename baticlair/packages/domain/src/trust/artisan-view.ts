import { baseOf, INSTANCE_SEP } from "../referential/model.js";
import { computeChantier, CONSUMABLES_KEY, type Assumption, type CompanyPreferences, type EngineOptions, type NeedResult, type Question, type WorkItemInput } from "../referential/engine.js";
import type { Referential } from "../referential/model.js";
import type { LineRole } from "../referential/line-roles.js";
import type { QuotePlan } from "../referential/plan.js";
import type { TakeoffValidation } from "../takeoff/validation.js";
import { withoutLabour, writtenNumber } from "./marchandise.js";
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
  /**
   * Ce que la vérification propose à la place (un interdit, un doute du quantitatif IA) ou en plus (un article à
   * ajouter) : jamais appliqué sans l'appui de l'artisan.
   */
  suggestion?: { label: string; quantity: string | null; unit: string | null };
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

/** Niveaux 2 et 3 d'un besoin matériel, rattaché à l'ouvrage du devis dont il provient. */
export interface NeedLevels {
  needId: string;
  slot: string;
  /** « Liteaux 27×40 », ou le nom de l'emplacement sans produit (« Crochets »). */
  label: string;
  /** « explicit » : cité par le devis ; « deduced » : cœur de l'ouvrage. */
  origin: "explicit" | "deduced";
  /** Niveau 2 — besoin matériel dans SON unité (m de liteaux, pièces) ; null = à calculer. */
  need: { value: string; unit: string } | null;
  /** Besoin connu à une fourchette près (donnée sans effet sur la commande). */
  needRange: { min: string; max: string; unit: string } | null;
  /** Niveau 3 — quantité à commander, seulement si le conditionnement est sourcé ; sinon null. */
  order: { count: string; unit: { one: string; many: string } } | null;
  /** Ce qui manque pour le besoin, ou pour la commande (en clair). */
  missing: string | null;
  /**
   * Calcul PROVISOIRE (règle ou donnée encore en brouillon, mode validateur
   * seulement) : la quantité est montrée pour être jugée, jamais ✓.
   */
  provisional: boolean;
  /** Produit d'usage quand le devis ne le précise pas (pratique déclarée, à confirmer). */
  usual: string | null;
  /** Hypothèses par défaut utilisées par le calcul (dites à l'artisan, modifiables). */
  assumptions: Assumption[];
  state: TrustState;
}

/**
 * UNE LIGNE DU DEVIS ET CE QU'ELLE DEVIENT, en trois niveaux jamais confondus :
 *  - « read »  : ce que dit le devis (mesure de l'ouvrage, ou quantité à commander) ;
 *  - « needs » : les besoins matériels calculés à partir de cet ouvrage ;
 *  - « order » : ce qui se commande (dans chaque besoin, ou la ligne elle-même si
 *    elle est déjà une quantité d'article).
 */
export interface OuvrageLevels {
  lineId: string;
  designation: string;
  role: LineRole | null;
  /** Niveau 1, tel qu'écrit dans le devis. */
  read: { quantity: string | null; unit: string | null };
  /** Besoins issus de cet ouvrage (vide pour une quantité à commander telle quelle). */
  needs: NeedLevels[];
  /** Ligne à commander telle qu'écrite : niveaux 2 et 3 = la ligne. */
  direct: { quantity: string; unit: string } | null;
  /** Mesure sans aucun besoin calculable : pourquoi (ouvrage sans règle, métier non couvert). */
  pending: string | null;
  /** État de l'ouvrage : jamais ✓ tant qu'un de ses besoins n'est pas établi. */
  state: TrustState;
  /** Quantité saisie ou corrigée par l'artisan : jamais remise en cause par le calcul. */
  byArtisan?: true;
}

export interface ArtisanView {
  counts: Record<TrustState, number>;
  decisions: Decision[];
  /** Ouvrages demandés au fournisseur pour la mesure du devis : BatiClair ne calcule pas encore leurs matériaux. */
  measures: { lineIds: string[]; text: string } | null;
  items: ViewItem[];
  /** Chaque ligne du devis en trois niveaux (lu → il faut → à commander). Vide sans plan du calcul. */
  ouvrages: OuvrageLevels[];
}

type OwnedNeed = NeedResult & { workItemId?: string };
const RANK: Record<TrustState, number> = { verified: 0, to_confirm: 1, missing: 2 };
const worst = (states: TrustState[]): TrustState => states.reduce<TrustState>((w, s) => (RANK[s] > RANK[w] ? s : w), "verified");

/**
 * À quelle ligne du devis appartient un besoin : la ligne qui désigne son
 * emplacement, sinon celle qui le cite (« crochets compris »), sinon la
 * première mesure de son ouvrage. Un besoin seulement suggéré n'appartient
 * à aucune ligne (il n'est pas dans le devis).
 */
function needOwner(n: OwnedNeed, plan: QuotePlan, roles: ReadonlyMap<string, LineRole>): string | null {
  if (n.origin === "suggested" || !n.workItemId) return null;
  const planned = plan.lines.filter((l): l is Extract<QuotePlan["lines"][number], { status: "planned" }> => l.status === "planned" && l.workItemId === n.workItemId);
  return (
    planned.find((l) => l.slot === n.slot)?.ref ??
    planned.find((l) => l.mentions.includes(n.slot))?.ref ??
    planned.find((l) => roles.get(l.ref) === "measure")?.ref ??
    null
  );
}

const norm = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/**
 * Deux besoins ne portent jamais le même nom : « Liteaux 27×40 » pour le
 * lattage et « Contre-liteaux (Liteaux 27×40) » pour le contre-lattage. Deux
 * lignes identiques sur une commande, c'est une erreur qui attend de se produire.
 */
function needName(n: NeedResult, all: readonly NeedResult[]): string {
  const twice = all.filter((x) => x.label === n.label).length > 1;
  return twice && !norm(n.label).startsWith(norm(n.slotLabel)) ? `${n.slotLabel} (${n.label})` : n.label;
}

function needLevels(n: OwnedNeed, all: readonly NeedResult[], usual: { text: string; productShort?: string } | null = null): NeedLevels {
  const a = assessNeed(n);
  const calculated = n.status === "calculated";
  // Produit nommé par le devis, sinon produit d'usage (« Liteaux 18×40 ») annoncé comme tel.
  const named = n.trace.some((t) => t.label === "Produit");
  return {
    needId: n.needId,
    slot: n.slot,
    label: !named && usual?.productShort ? usual.productShort : needName(n, all),
    origin: n.origin === "explicit" ? "explicit" : "deduced",
    need: calculated && n.quantity ? n.quantity : null,
    needRange: calculated && n.quantityRange ? n.quantityRange : null,
    order: calculated && n.purchase ? n.purchase.order : null,
    missing: !calculated ? (n.reason ?? n.question?.text ?? "Information manquante.") : !n.purchase ? (n.purchaseUnavailable ?? "Conditionnement à préciser par le fournisseur.") : null,
    provisional: calculated && n.provisional,
    // Le produit d'usage n'est dit que si le devis n'en nomme aucun.
    usual: named ? null : (usual?.text ?? null),
    assumptions: n.assumptions,
    state: a.state,
  };
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
  const one = n === 1 ? withoutLabour(lines[0]!.designation) : null;
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
  engine: { needs: readonly OwnedNeed[]; questions: readonly Question[]; declined?: readonly string[] } = { needs: [], questions: [] },
  /** Plan du calcul et rôles des lignes : pour rattacher chaque besoin à son ouvrage. */
  link?: {
    plan: QuotePlan;
    roles: ReadonlyMap<string, LineRole>;
    ref: Referential;
    /** Ambiguïtés de rôle qui changent la commande (« 6 : ardoises ou jouées ? ») : une question chacune. */
    asks?: ReadonlyMap<string, { text: string; purchase: string; measure: string }>;
  },
): ArtisanView {
  // Besoins rattachés à leur ligne du devis (hors suggestions et réponses « aucun de ces produits »).
  const owned = new Map<string, OwnedNeed[]>();
  if (link) {
    for (const n of engine.needs) {
      if (n.question && engine.declined?.includes(n.question.key)) continue;
      const owner = needOwner(n, link.plan, link.roles);
      if (owner) owned.set(owner, [...(owned.get(owner) ?? []), n]);
    }
  }
  const items: ViewItem[] = [];
  const decisions: Decision[] = [];
  const groups = new Map<string, ViewLine[]>();
  const measureIds: string[] = [];
  const duplicates = validation.issues.filter((i) => i.code === "DUPLICATE_LINE" && i.severity !== "info");

  for (const v of validation.lines) {
    const line = lines.find((l) => l.id === v.lineId);
    if (!line) continue;
    const assessed = assessTakeoffLine(v, { documentIssues: validation.issues, confirmedByArtisan: line.confirmed, enteredByArtisan: line.enteredByArtisan });
    if (!assessed) continue; // prestation : rien à commander
    // Un ✓ ne masque jamais un besoin du même ouvrage encore à établir.
    const openNeeds = (owned.get(line.id) ?? []).filter((n) => assessNeed(n).state !== "verified");
    const ask = link?.roles.get(line.id) === "undetermined" ? link.asks?.get(line.id) : undefined;
    const a: Assessment = ask
      ? {
          ...assessed,
          state: "to_confirm",
          reason: ask.text,
          criteria: [
            ...assessed.criteria.filter((c) => c.key !== "work_item"),
            { key: "work_item", cause: "role_ambiguous", status: "to_confirm", detail: ask.text, origin: "devis", affects: ["order"] },
          ],
        }
      : assessed.state === "verified" && openNeeds.length > 0
        ? {
            ...assessed,
            state: worst(openNeeds.map((n) => assessNeed(n).state)),
            reason: `À établir dans cet ouvrage : ${openNeeds.map((n) => n.label.toLowerCase()).join(", ")}.`,
            criteria: [
              ...assessed.criteria,
              { key: "work_item", cause: "work_measure", status: "missing", detail: `Besoins à établir : ${openNeeds.map((n) => n.label).join(", ")}.`, origin: "referential", affects: ["quantity"] },
            ],
          }
        : assessed;
    items.push({ kind: "line", id: line.id, label: line.designation, quantity: [line.quantity && writtenNumber(line.quantity), line.unit].filter(Boolean).join(" ") || null, state: a.state, reason: a.reason, assessment: a });
    if (a.state === "verified") continue;

    const open = openCauses(a);
    // Article inconnu (avec ou sans unité) : décision « unknown » ; article connu sans unité : décision « units ».
    const group = open.some((o) => o.cause === "unknown_article") ? "unknown" : open.some((o) => UNIT_CAUSES.has(o.cause)) ? "units" : null;
    if (group) groups.set(group, [...(groups.get(group) ?? []), line]);
    if (open.some((o) => o.cause === "work_measure")) measureIds.push(line.id);
    // Doutes propres à cette ligne (multiplicateur, quantité introuvable, doute de lecture…) : une décision par ligne.
    if (ask) {
      // Une seule question, deux lectures : la réponse change la commande.
      decisions.push({
        key: `role:${line.id}`,
        state: "to_confirm",
        title: withoutLabour(line.designation),
        text: ask.text,
        lineIds: [line.id],
        primary: { action: "answer", label: "Choisir" },
        secondary: ["edit"],
        question: { key: `role:${line.id}`, kind: "choose", text: ask.text, options: [{ label: ask.purchase, value: "purchase" }, { label: ask.measure, value: "measure" }] },
      });
    }
    const own = open.filter((o) => !UNIT_CAUSES.has(o.cause) && o.cause !== "unknown_article" && o.cause !== "work_measure" && o.cause !== "DUPLICATE_LINE" && o.cause !== "role_ambiguous");
    if (own.length > 0) {
      const missing = own.find((o) => o.state === "missing");
      decisions.push({
        key: `line:${line.id}`,
        state: missing ? "missing" : "to_confirm",
        title: withoutLabour(line.designation),
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
      title: withoutLabour(lines.find((l) => l.id === ids[0])?.designation ?? "Lignes identiques"),
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
    items.push({ kind: "need", id: n.needId, label: needName(n, engine.needs), quantity, state: a.state, reason: a.reason, assessment: a, need: n });
  }
  const engineDecisions = engine.questions.map((q) => engineDecision(q, engine.needs.find((n) => n.question?.key === q.key)));

  const counts: Record<TrustState, number> = { verified: 0, to_confirm: 0, missing: 0 };
  for (const i of items) counts[i.state]++;

  // Les trois niveaux, ligne par ligne du devis.
  const ouvrages: OuvrageLevels[] = [];
  if (link) {
    for (const item of items.filter((i) => i.kind === "line")) {
      const line = lines.find((l) => l.id === item.id)!;
      const v = validation.lines.find((x) => x.lineId === item.id)!;
      const role = link.roles.get(item.id) ?? null;
      const usualOf = (n: OwnedNeed) => link.ref.workItems.find((w) => w.id === baseOf(n.workItemId))?.slots.find((x) => x.key === n.slot)?.usual ?? null;
      const needs = (owned.get(item.id) ?? []).map((n) => needLevels(n, engine.needs, usualOf(n)));
      // Tout composant que la ligne cite reste visible, même sans règle de calcul (« fixations »).
      const planned0 = link.plan.lines.find((l) => l.ref === item.id);
      if (v.basis === "work" && planned0?.status === "planned") {
        const work = link.ref.workItems.find((w) => w.id === baseOf(planned0.workItemId));
        for (const key of [planned0.slot, ...planned0.mentions]) {
          const slot = work?.slots.find((x) => x.key === key);
          // Seulement un composant que le calcul ne connaît pas du tout : un besoin calculé ailleurs
          // (« pour tuiles HP10 » sur la ligne des liteaux) appartient déjà à sa propre ligne.
          // Un composant qui a sa règle mais que la réponse écarte (« bandes façonnées » quand l'artisan façonne : les
          // feuilles 2 × 1 m le remplacent) n'est pas « sans règle » : il n'a rien à faire chiffrer.
          if (!slot || slot.measureOnly || needs.some((n) => n.slot === key) || engine.needs.some((n) => n.workItemId === planned0.workItemId && n.slot === key)) continue;
          if (work!.needs.some((r) => r.slot === key && r.when) && engine.needs.some((n) => n.workItemId === planned0.workItemId)) continue;
          needs.push({ needId: `${planned0.workItemId}/${key}`, slot: key, label: slot.label, origin: "explicit", need: null, needRange: null, order: null, missing: "Pas encore calculé : le fournisseur proposera pour la mesure du devis.", provisional: false, usual: slot.usual?.text ?? null, assumptions: [], state: "missing" });
        }
      }
      const planned = link.plan.lines.find((l) => l.ref === item.id);
      // « Fenêtre PVC 120×125 » : commandée telle qu'écrite, ET elle compte l'ouvrage pour la mousse et le mastic.
      const asWritten =
        planned?.status === "planned" && link.ref.workItems.find((w) => w.id === baseOf(planned.workItemId))?.slots.find((x) => x.key === planned.slot)?.orderedAsWritten === true;
      const direct =
        v.basis === "purchase" && role !== "undetermined" && line.quantity && line.unit && (needs.length === 0 || asWritten) ? { quantity: writtenNumber(line.quantity), unit: line.unit } : null;
      // Une deuxième ligne du même ouvrage (« peinture plafonds » après « peinture murs ») : sa surface s'ajoute au calcul
      // de l'ouvrage, porté par la première ; elle n'a rien à faire chiffrer à part.
      const counted =
        planned?.status === "planned" &&
        (planned.adds === true || link.ref.workItems.find((w) => w.id === baseOf(planned.workItemId))?.slots.find((x) => x.key === planned.slot)?.measureOnly === true) &&
        link.plan.lines.some(
          (l) =>
            l.ref !== item.id &&
            l.status === "planned" &&
            l.workItemId === planned.workItemId &&
            l.slot === planned.slot &&
            (owned.get(l.ref)?.length ?? 0) > 0,
        );
      const pending =
        v.basis === "work" && needs.length === 0 && !counted
          ? planned && planned.status === "not_covered"
            ? planned.reason
            : "BatiClair ne sait pas encore calculer les matériaux de cet ouvrage."
          : null;
      ouvrages.push({
        lineId: item.id,
        designation: line.designation,
        role,
        read: { quantity: line.quantity && writtenNumber(line.quantity), unit: line.unit },
        needs,
        direct,
        pending,
        state: v.basis === "work" ? (needs.length > 0 ? worst(needs.map((n) => n.state)) : "missing") : worst([item.state, ...needs.map((n) => n.state)]),
        ...(line.enteredByArtisan ? { byArtisan: true as const } : {}),
      });
    }
  }
  return {
    counts,
    decisions: [...lineDecisions.filter((d) => d.state === "missing"), ...groupDecisions, ...engineDecisions, ...lineDecisions.filter((d) => d.state !== "missing")],
    measures:
      measureIds.length > 0
        ? {
            lineIds: measureIds,
            text: `${plural(measureIds.length, "ouvrage mesuré", "ouvrages mesurés")} (m², ml…) : les matériaux en sont calculés quand une règle existe ; ce qui reste « à préciser » sera demandé aux fournisseurs pour la mesure du devis.`,
          }
        : null,
    items,
    ouvrages,
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
): {
  needs: (NeedResult & { workItemId: string })[];
  questions: Question[];
  declined: string[];
  checks: (NeedResult & { workItemId: string })[];
  /** §49.2.5 : les articles qui attendent une donnée, calculés sans elle (« ? » dans la désignation), pour « Info manquante ». */
  unknowns: (NeedResult & { workItemId: string })[];
  /** Les modèles écrits par l'artisan hors référentiel, par emplacement (« tuile » → « Tuile Romane Canal Monier »). */
  customProducts: Record<string, string>;
} {
  // Retour du fondateur (2026-10-10) : « quand l'application ne sait pas, elle demande et laisse de quoi écrire ». Un modèle
  // écrit par l'artisan (« Tuile Romane Canal Monier ») qui n'est pas au référentiel ne se calcule pas : la question est
  // close comme « aucun de ces modèles », et la ligne porte le nom écrit (`customProducts`).
  const customProducts: Record<string, string> = {};
  for (const [k, v] of Object.entries(answers)) {
    if (k.startsWith("product:") && typeof v === "string" && v.trim() !== "" && !ref.products.some((p) => p.id === v)) customProducts[k.slice("product:".length)] = v.trim();
  }
  const declined = new Set(Object.entries(answers).filter(([k, v]) => v === null || customProducts[k.slice("product:".length)] !== undefined).map(([k]) => k));
  // Un ouvrage dont TOUTES les lignes sont déjà des quantités d'achat (« 42 faîtières ») n'a rien à calculer :
  // le devis a fait le travail, BatiClair ne lui ajoute ni besoin ni question.
  const allGiven = (workItemId: string) => {
    const planned = plan.lines.filter((l): l is Extract<QuotePlan["lines"][number], { status: "planned" }> => l.status === "planned" && l.workItemId === workItemId);
    // Une ligne commandée telle qu'écrite qui compte aussi l'ouvrage (« 4 fenêtres ») laisse calculer ses fournitures de pose.
    const counts = (l: (typeof planned)[number]) => ref.workItems.find((w) => w.id === baseOf(workItemId))?.slots.find((s) => s.key === l.slot)?.measureOnly === true;
    // « 2 descentes de 3 m » écrit en plus des tubes et des coudes : la mesure de l'ouvrage est connue, ce que le devis ne
    // cite pas (colliers, dauphins) se calcule encore (D-2026-020). « 42 faîtières » seules ne disent aucune mesure.
    const work = ref.workItems.find((w) => w.id === baseOf(workItemId));
    const params = plan.inputs.find((i) => i.workItemId === workItemId)?.params ?? {};
    // Une mesure ÉCRITE dans le texte (preuve « … » citée), pas la quantité d'une ligne déjà commandée telle quelle.
    const measured = (work?.params ?? []).some((p) => p.fromLineQuantity && params[p.key]?.origin === "devis" && (params[p.key]?.evidence ?? "").includes("«"));
    return planned.length > 0 && !measured && planned.every((l) => given.has(`${workItemId}/${l.slot}`) && !counts(l));
  };
  const inputs: WorkItemInput[] = plan.inputs.map((input) => {
    const work = ref.workItems.find((w) => w.id === baseOf(input.workItemId))!;
    const products = { ...input.products };
    const params = { ...input.params };
    const declinedSlots = [...declined].filter((k) => k.startsWith("product:")).map((k) => k.slice("product:".length)).filter((s) => work.slots.some((x) => x.key === s));
    const prefs = { products: { ...(preferences.products ?? {}) }, proposals: { ...(preferences.proposals ?? {}) }, ...(preferences.waste ? { waste: preferences.waste } : {}) };
    for (const [key, answer] of Object.entries(answers)) {
      const [kind, name] = key.split(":") as [string, string];
      if (kind === "product" && work.slots.some((s) => s.key === name)) {
        const family = work.slots.find((s) => s.key === name)!.family;
        if (typeof answer === "string" && answer !== "" && customProducts[name] === undefined) products[name] = { productId: answer, origin: "artisan" };
        if (answer === "") {
          // « Pas celui-ci » : ni le produit lu, ni l'habituel ne valent pour ce chantier.
          delete products[name];
          for (const map of [prefs.products, prefs.proposals]) {
            delete map[name];
            delete map[family];
          }
        }
      }
      // Une pièce écrite au devis (instance par ligne) garde ce que SA ligne écrit : une réponse commune ne l'écrase pas.
      if (kind === "param" && answer && typeof answer !== "string" && work.params.some((p) => p.key === name) && !(input.workItemId.includes(INSTANCE_SEP) && params[name]?.origin === "devis")) {
        params[name] = { ...answer, origin: "artisan" };
      }
    }
    // §48.2 « zinc, pièce par pièce » : une réponse propre à cet ouvrage (« param:faconnage@noue ») passe devant celle du chantier.
    for (const [key, answer] of Object.entries(answers)) {
      const scoped = scopedParam(key);
      if (!scoped || scoped.workItemId !== input.workItemId || !answer || typeof answer === "string") continue;
      if (work.params.some((p) => p.key === scoped.name)) params[scoped.name] = { ...answer, origin: "artisan" };
    }
    // Habitude établie de l'entreprise (« je façonne », apprise sur deux chantiers) : vaut réponse quand ce
    // chantier n'en a pas donné d'autre ; dite comme telle dans le calcul, modifiable d'un tap.
    for (const def of work.params) {
      // L'habitude du lot (« la noue, je la façonne ») passe devant celle de toute la zinguerie.
      // Une instance par ligne (« bandes-zinc__12 ») suit l'habitude de son ouvrage.
      const habit = preferences.params?.[`${def.key}@${baseOf(input.workItemId)}`] ?? preferences.params?.[def.key];
      if (def.kind !== "artisan_preference" || !habit || params[def.key] || answers[`param:${def.key}`] !== undefined || answers[scopedKey(def.key, input.workItemId)] !== undefined) continue;
      params[def.key] = { value: habit, unit: def.unit, origin: "artisan", evidence: "Habitude de votre entreprise" };
    }
    // §49.1 point 4 : la question consommables vaut pour tout le chantier ; l'habitude de l'artisan (« comme d'habitude ? »)
    // vaut réponse tant que ce chantier n'en a pas donné d'autre.
    const consumables = answers[`param:${CONSUMABLES_KEY}`];
    const usualConsumables = preferences.params?.[CONSUMABLES_KEY];
    if (consumables && typeof consumables !== "string") params[CONSUMABLES_KEY] = { ...consumables, origin: "artisan" };
    else if (typeof consumables === "string" && consumables !== "") params[CONSUMABLES_KEY] = { value: consumables, unit: "u", origin: "artisan" };
    else if (consumables === undefined && usualConsumables !== undefined) params[CONSUMABLES_KEY] = { value: usualConsumables, unit: "u", origin: "artisan", evidence: "Habitude de votre entreprise" };
    return { ...input, products, params, preferences: prefs, ...(declinedSlots.length > 0 ? { declined: declinedSlots } : {}) };
  });
  // Les données demandées pièce par pièce : seulement quand plusieurs ouvrages du devis en dépendent (sinon une question).
  const piecewise = piecewiseParams(ref, plan);
  const run = (ins: WorkItemInput[]) => {
    const result = computeChantier(ref, ins, options);
    // Chaque besoin garde son ouvrage : il sera rattaché à la ligne du devis dont il provient.
    const needs = result.workItems
      .filter((w) => !allGiven(w.workItemId))
      .flatMap((w) => w.needs.filter((n) => !given.has(`${w.workItemId}/${n.slot}`)).map((n) => ({ ...n, workItemId: w.workItemId })));
    // §48.2 « zinc, pièce par pièce » : quand plusieurs ouvrages (noue, bandes, joint debout) demandent le façonnage,
    // la question se pose pour chacun, avec ses mots ; un seul ouvrage garde la question unique.
    // Une pièce écrite au devis (ouvrage « perLine ») a sa question à son nom, même seule de son ouvrage.
    for (const n of needs) {
      const piece = ins.find((i) => i.workItemId === n.workItemId)?.label;
      if (!piece || !n.question || !PER_PIECE.has(n.question.key) || piecewise.includes(n.question.key)) continue;
      n.question = { ...n.question, text: `${piece} : tu façonnes toi-même ou tu commandes façonné ?` };
    }
    for (const key of piecewise) {
      for (const n of needs) {
        if (n.question?.key !== key) continue;
        // Chaque lot dit son nom (deux lots peuvent partager la même phrase : bandes et abergement) ; une pièce écrite au
        // devis (instance par ligne) dit le sien, tel qu'écrit (« Bande de ventilation en Z en zinc quartz »).
        const lot = ins.find((i) => i.workItemId === n.workItemId)?.label ?? lotLabel(ref.workItems.find((w) => w.id === baseOf(n.workItemId))?.label ?? "");
        n.question = { ...n.question, key: scopedKey(key.slice("param:".length), n.workItemId), text: lot ? `${lot} : tu façonnes toi-même ou tu commandes façonné ?` : n.question.text };
      }
    }
    // Une pièce écrite au devis (« bandes-zinc__12 ») a SES questions : à son nom, avec sa clé (sa réponse ne vaut que
    // pour elle). Ni la question consommables, ni un produit : celles-là valent pour le chantier.
    for (const n of needs) {
      const piece = ins.find((i) => i.workItemId === n.workItemId && n.workItemId.includes(INSTANCE_SEP))?.label;
      const key = n.question?.key ?? "";
      if (!piece || !key.startsWith("param:") || scopedParam(key) || key === `param:${CONSUMABLES_KEY}`) continue;
      const text = n.question!.text.replace(/ Cela change la commande :.*$/, "");
      n.question = { ...n.question!, key: scopedKey(key.slice("param:".length), n.workItemId), text: `${piece} : ${text.charAt(0).toLowerCase()}${text.slice(1)}` };
    }
    const seen = new Set<string>();
    const questions: Question[] = [];
    for (const n of needs) {
      if (!n.question || n.origin === "suggested" || declined.has(n.question.key) || seen.has(n.question.key)) continue;
      seen.add(n.question.key);
      questions.push(n.question);
    }
    return { needs, questions };
  };
  let { needs, questions } = run(inputs);
  // TOUTES LES QUESTIONS D'UN COUP (retour du fondateur, 2026-10-04) : une question à boutons en cache parfois d'autres
  // (le modèle de tuile canal, puis son recouvrement ; le façonnage, puis le développé). On rejoue le calcul avec
  // chaque réponse possible et on ajoute les questions qui apparaissent, pour que l'artisan réponde à tout en une fois.
  // Une réponse donnée plus tard qui rend une question inutile est simplement ignorée par le calcul.
  const discovered: Question[] = [];
  const seenKeys = new Set(questions.map((q) => q.key));
  for (let round = 0; round < 2; round++) {
    const frontier = [...questions, ...discovered].filter((q) => q.options && q.options.length > 0 && q.options.length <= 8);
    // Les autres questions ouvertes prises à leur première réponse : une question cachée derrière DEUX réponses
    // (le diamètre des descentes, derrière le développé ET le nombre de descentes) se découvre aussi.
    let base = inputs;
    for (const q of frontier) if (q.options![0]?.value) base = withAnswer(ref, base, q, q.options![0]!.value) ?? base;
    let added = false;
    for (const q of frontier) {
      for (const o of q.options!) {
        if (!o.value) continue;
        const probe = withAnswer(ref, base, q, o.value);
        if (!probe) continue;
        for (const next of run(probe).questions) {
          if (seenKeys.has(next.key)) continue;
          seenKeys.add(next.key);
          discovered.push(next);
          added = true;
        }
      }
    }
    if (!added) break;
  }
  questions = [...questions, ...discovered];
  // Deux sources qui ne disent pas la même chose (devis ≠ en-tête lu, devis ≠ croquis), sans réponse de l'artisan :
  // une question avec les deux valeurs en boutons, et rien ne part pour cet ouvrage tant qu'elle est ouverte.
  for (const c of plan.contradictions) {
    const key = `param:${c.key}`;
    if (answers[key] !== undefined || questions.some((q) => q.key === key)) continue;
    const seen = new Set<string>();
    const options = c.facts.filter((f) => !seen.has(f.value) && seen.add(f.value)).map((f) => ({ label: `${f.value.replace(".", ",")} ${f.unit} (${f.evidence})`, value: f.value }));
    const question: Question = { key, kind: "param", text: `${c.label} : ${options.map((o) => o.label).join(", ou ")} ?`, unit: c.unit, options };
    questions.unshift(question);
    needs = needs.map((n) => {
      if (n.workItemId !== c.workItemId || n.status !== "calculated") return n;
      const { quantity: _q, purchase: _p, ...rest } = n;
      return { ...rest, status: "question" as const, question };
    });
  }
  // § 41 : une question ne se pose que si sa réponse change une quantité commandée de plus de 3 %, une unité ou un
  // matériau ; les questions restantes se posent dans l'ordre du levier le plus gros. Pour chaque question à boutons,
  // le calcul est rejoué avec chaque réponse possible.
  const levers = new Map<string, number>();
  let current = inputs;
  for (const q of [...questions]) {
    const lever = questionLever(ref, current, q, questions.filter((x) => x !== q), run);
    if (lever === null) continue;
    if (lever.spread <= QUESTION_THRESHOLD && lever.option) {
      // Toutes les réponses donnent la même commande (à 3 % près) : la première vaut hypothèse, dite et modifiable.
      current = lever.option.inputs;
      const again = run(current);
      needs = again.needs.map((n) => (n.question ? n : { ...n, assumptions: [...n.assumptions, lever.option!.assumption] }));
      questions = again.questions;
    } else levers.set(q.key, lever.spread);
  }
  for (const c of plan.contradictions) if (!levers.has(`param:${c.key}`)) levers.set(`param:${c.key}`, Number.POSITIVE_INFINITY);
  questions = [...questions].sort((a, b) => (levers.get(b.key) ?? 0) - (levers.get(a.key) ?? 0));
  // Ce que le calcul aurait donné pour les articles que le devis écrit déjà (« 20 crochets de gouttière ») : la quantité
  // du devis reste la base, l'écart se dit (purchaseView, `quantityGap`).
  const checks =
    given.size === 0
      ? []
      : computeChantier(ref, current, { ...options, quantityOnly: true }).workItems.flatMap((w) =>
          w.needs.filter((n) => n.status === "calculated" && given.has(`${w.workItemId}/${n.slot}`)).map((n) => ({ ...n, workItemId: w.workItemId })),
        );
  // §49.2.5 « Info manquante » : un article écrit qui attend une donnée (le développé de la gouttière) sort quand même,
  // avec la quantité que le calcul sait donner sans elle et un « ? » à sa place dans la désignation (jamais devinée).
  // Seulement une donnée qui ne change que l'ARTICLE (le développé, le diamètre) : une donnée qui change la quantité (la
  // pente contredite, le façonnage) laisse la ligne écrite telle quelle, avec la quantité du devis.
  // (Les crochets d'ardoise qui suivent les ardoises attendent la même donnée d'article : elle vaut pour l'ouvrage.)
  const articleOnly = (n: (typeof needs)[number]) => {
    const work = ref.workItems.find((w) => w.id === baseOf(n.workItemId));
    // Une question par pièce (« param:faconnage@couverture-zinc-joint-debout ») compte comme la donnée de l'ouvrage.
    const m = /^param:([a-z0-9_]+)(?:@.+)?$/.exec(n.question?.key ?? "");
    if (!m) return false;
    // La donnée que la règle de CE besoin demande pour son article (les pattes attendent le façonnage, §49.2) ;
    // sinon, celle d'un autre besoin de l'ouvrage, mais seulement sans portée de pièce (le développé, le diamètre).
    const own = (work?.needs ?? []).find((r) => r.id === n.needId);
    if ((own?.precisionRequires ?? []).includes(m[1]!)) return true;
    return !n.question!.key.includes("@") && (work?.needs ?? []).some((r) => (r.precisionRequires ?? []).includes(m[1]!));
  };
  const waiting = new Set(needs.filter((n) => n.status === "question" && !n.consumable && n.origin !== "suggested" && articleOnly(n)).map((n) => `${n.workItemId}/${n.needId}`));
  const unknowns =
    waiting.size === 0
      ? []
      : computeChantier(ref, current, { ...options, quantityOnly: true, blankUnknown: true }).workItems.flatMap((w) =>
          w.needs.filter((n) => n.status === "calculated" && waiting.has(`${w.workItemId}/${n.needId}`)).map((n) => ({ ...n, workItemId: w.workItemId })),
        );
  return { needs, questions, declined: [...declined], checks, unknowns, customProducts };
}

/** Les données qui se demandent ouvrage par ouvrage (§48.2, « zinc, pièce par pièce ») : la clé porte l'ouvrage. */
const PER_PIECE = new Set(["param:faconnage"]);
/** Le nom d'un lot de zinguerie, tel que l'artisan le dit (« Noue zinc », « Bandes zinc (solin, rive, égout…) »). */
export function lotLabel(label: string): string {
  // §48.6 : une question nomme UNE pièce ; la parenthèse de l'ouvrage (« (zinc + porte-solin) », « (solin, rive…) ») n'en dit pas d'autre.
  return label.replace(/\s*\([^)]*\)/g, "").trim();
}
/** Les données posées lot par lot quand plusieurs ouvrages du devis en dépendent (§48.2, retour de Greg). */
export function piecewiseParams(ref: Referential, plan: QuotePlan): string[] {
  return [...PER_PIECE].filter((key) => new Set(plan.inputs.filter((i) => ref.workItems.find((w) => w.id === baseOf(i.workItemId))?.params.some((p) => `param:${p.key}` === key)).map((i) => i.workItemId)).size >= 2);
}
/** « param:faconnage@noue » : la donnée « faconnage » de l'ouvrage « noue » seulement. */
export const scopedKey = (name: string, workItemId: string) => `param:${name}@${workItemId}`;
export function scopedParam(key: string): { name: string; workItemId: string } | null {
  const m = /^param:([a-z0-9_]+)@([a-z0-9_-]+)$/.exec(key);
  return m ? { name: m[1]!, workItemId: m[2]! } : null;
}

/** Les entrées du calcul avec une réponse possible à une question (produit ou donnée), pour voir ce qu'elle entraîne. */
function withAnswer(ref: Referential, inputs: WorkItemInput[], q: Question, value: string): WorkItemInput[] | null {
  const scoped = scopedParam(q.key);
  if (scoped) {
    const def = ref.workItems.flatMap((w) => w.params).find((p) => p.key === scoped.name);
    if (!def) return null;
    return inputs.map((i) => (i.workItemId === scoped.workItemId ? { ...i, params: { ...i.params, [scoped.name]: { value, unit: def.unit, origin: "artisan" as const, evidence: "Réponse possible" } } } : i));
  }
  const [kind, name] = q.key.split(":") as [string, string];
  if (kind === "product") {
    return inputs.map((i) => (ref.workItems.find((w) => w.id === baseOf(i.workItemId))?.slots.some((s) => s.key === name) ? { ...i, products: { ...i.products, [name]: { productId: value, origin: "artisan" as const } } } : i));
  }
  if (kind === "param") {
    const def = ref.workItems.flatMap((w) => w.params).find((p) => p.key === name);
    if (!def) return null;
    return inputs.map((i) => (ref.workItems.find((w) => w.id === baseOf(i.workItemId))?.params.some((p) => p.key === name) ? { ...i, params: { ...i.params, [name]: { value, unit: def.unit, origin: "artisan" as const, evidence: "Réponse possible" } } } : i));
  }
  return null;
}

/** Au-delà de cet écart relatif entre deux réponses possibles, la question mérite d'être posée (§41). */
export const QUESTION_THRESHOLD = 0.03;

/**
 * Le levier d'une question à boutons : le plus grand écart relatif de quantité commandée entre deux réponses,
 * ou l'infini si une réponse change une unité, un article ou le nombre d'articles. Null si la question n'est pas
 * un paramètre à boutons (produit à confirmer, format…) ou si une réponse laisse encore un calcul en attente.
 */
function questionLever(
  ref: Referential,
  inputs: WorkItemInput[],
  q: Question,
  others: readonly Question[],
  run: (ins: WorkItemInput[]) => { needs: (NeedResult & { workItemId: string })[]; questions: Question[] },
): { spread: number; option: { inputs: WorkItemInput[]; assumption: Assumption } | null } | null {
  if (q.kind !== "param" || !q.options || q.options.length < 2) return null;
  const name = q.key.slice("param:".length);
  const def = ref.workItems.flatMap((w) => w.params).find((p) => p.key === name);
  if (!def) return null;
  // Une donnée qui change l'ARTICLE sans changer la quantité (le diamètre d'une sortie de toit, le développé d'une
  // bande commandée façonnée) : demandée tant qu'un besoin encore possible en a besoin pour sa précision.
  const rules = new Map(ref.workItems.flatMap((w) => w.needs.map((r) => [`${w.id}/${r.id}`, r] as const)));
  if (run(inputs).needs.some((n) => rules.get(`${n.workItemId}/${n.needId}`)?.precisionRequires?.includes(name))) return { spread: Number.POSITIVE_INFINITY, option: null };
  const withParam = (ins: WorkItemInput[], key: string, unit: string, value: string, evidence: string): WorkItemInput[] =>
    ins.map((i) => (ref.workItems.find((w) => w.id === baseOf(i.workItemId))?.params.some((p) => p.key === key) ? { ...i, params: { ...i.params, [key]: { value, unit, origin: "artisan" as const, evidence } } } : i));
  // Les autres questions à boutons encore ouvertes sont provisoirement prises à leur première réponse : le levier
  // de CETTE question se mesure toutes choses égales par ailleurs (elles ne sont pas répondues pour autant).
  let base = inputs;
  for (const o of others) {
    const k = o.kind === "param" && o.options?.[0] ? o.key.slice("param:".length) : null;
    const d = k ? ref.workItems.flatMap((w) => w.params).find((p) => p.key === k) : undefined;
    if (k && d) base = withParam(base, k, d.unit, o.options![0]!.value, "Réponse possible");
  }
  const outcomes = q.options.map((o) => {
    const ins = withParam(base, name, def.unit, o.value, "Réponse possible");
    const { needs } = run(ins);
    // Un calcul encore en attente d'une autre réponse : le levier ne se mesure pas, la question se pose.
    if (needs.some((n) => n.status === "question")) return null;
    const orders = new Map(needs.filter((n) => n.status === "calculated" && n.purchase).map((n) => [n.needId, { count: Number(n.purchase!.order.count), unit: n.purchase!.order.unit.many, label: n.label }]));
    return { ins, orders };
  });
  const settled = outcomes.filter((o): o is NonNullable<typeof o> => o !== null);
  if (settled.length !== outcomes.length) return { spread: Number.POSITIVE_INFINITY, option: null };
  const first = settled[0]!;
  let spread = 0;
  for (const o of settled.slice(1)) {
    const keys = new Set([...first.orders.keys(), ...o.orders.keys()]);
    for (const k of keys) {
      const a = first.orders.get(k);
      const b = o.orders.get(k);
      if (!a || !b || a.unit !== b.unit || a.label !== b.label) return { spread: Number.POSITIVE_INFINITY, option: null };
      const base = Math.min(a.count, b.count);
      spread = Math.max(spread, base === 0 ? (a.count === b.count ? 0 : Number.POSITIVE_INFINITY) : Math.abs(a.count - b.count) / base);
    }
  }
  const chosen = q.options[0]!;
  const chosenInputs = withParam(inputs, name, def.unit, chosen.value, "Toutes les réponses donnent la même commande");
  const assumption: Assumption = {
    key: q.key,
    label: def.label,
    value: def.display?.[chosen.value] ?? chosen.label,
    unit: def.unit,
    note: "Toutes les réponses donnent la même commande (à 3 % près) : la première est retenue.",
    choices: q.options,
  };
  return { spread, option: { inputs: chosenInputs, assumption } };
}
