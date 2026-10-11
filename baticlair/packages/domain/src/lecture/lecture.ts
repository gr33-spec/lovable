import { Decimal } from "../shared/decimal.js";
import { parseUnit, type UnitCode } from "../quantity/unit.js";
import { paramsFromContext, type ChantierContext, type SiteFact } from "../referential/context.js";
import { CONSUMABLES_KEY, type CompanyPreferences, type EngineOptions, type ParamValue, type Question, type WorkItemInput } from "../referential/engine.js";
import { FICHE_PARAMS_CHANTIER, ficheFacts, parseFiche, parseFicheEnregistree, type FicheChantier } from "../referential/fiche.js";
import type { LineRole, RoleProposal } from "../referential/line-roles.js";
import { baseOf, INSTANCE_SEP, type Referential, type Slot, type WorkItemType } from "../referential/model.js";
import { readDimension, type LinePlan, type QuotePlan } from "../referential/plan.js";
import { parseRefUnit, sameDim } from "../referential/units.js";
import type { LineValidation, TakeoffIssue, TakeoffValidation } from "../takeoff/validation.js";
import { artisanView, computeWithAnswers, piecewiseParams, slotsGivenByQuote, scopedKey, scopedParam, type ArtisanView, type Decision, type EngineAnswer } from "../trust/artisan-view.js";
import { applyPurchaseOverrides, applyRuleConfirmations, purchaseView, type PurchaseItem, type PurchaseView, type ScreenRow } from "../trust/purchase-view.js";
import { applyOrangeFlags } from "../trust/orange.js";
import { forbiddenFlags } from "../trust/forbidden.js";
import { subjectOf, withShortReasons } from "../trust/short-reason.js";
import { isWithoutSupplyUnit } from "../takeoff/supply.js";
import { withoutLabour } from "../trust/marchandise.js";
import { normalizeText } from "../trades/trade-profile.js";

/**
 * §51.5 (décision du fondateur, 2026-10-11) : LA LECTURE EST FAITE PAR L'IA, PAS PAR DES RÈGLES DE MOTS. Le modèle le
 * plus capable reçoit le devis complet et le référentiel, et rend en un appel :
 *  - la FICHE DE CHANTIER (§51.1), chaque donnée lue, déduite ou manquante ;
 *  - le BREF (§50.8), en phrases courtes, une par fait ;
 *  - les QUESTIONS (§51.2) : une par donnée manquante, aucune sur une donnée lue ;
 *  - pour chaque ligne du devis, LA FOURNITURE qu'elle nomme (nom du comptoir, quantité, unité, et l'ouvrage du
 *    référentiel qui la calcule quand une règle s'applique), ou « sans fourniture ».
 * Le code ne garde que les calculs (ratios, conversions en unités commandables) : ce module est le pont entre la lecture
 * et le moteur, à la place de la lecture par mots.
 */
export type LectureRole = "fourniture" | "pose" | "fourniture_et_pose" | "hors_quantitatif";

export interface LectureFourniture {
  /** Le nom du comptoir (« Velux GGL SK06 114×118 white finish », « Crochets Négrafix »). */
  nom: string;
  /** La quantité écrite (ou lue) pour cette fourniture, et son unité (« u », « ml », « m² »), null si rien n'est écrit. */
  quantite: string | null;
  unite: string | null;
  /** L'ouvrage du référentiel qui la calcule et son emplacement (« gouttiere » / « crochet ») ; null : telle qu'écrite. */
  ouvrage: string | null;
  emplacement: string | null;
  /** Les données de l'ouvrage lues sur la ligne, par clé du référentiel (« longueur_gouttiere » → « 17,40 m »). */
  donnees: Record<string, string>;
  /** Les questions (clés de `questions`) dont cette fourniture attend la réponse : elle reste orange en attendant. */
  attend: string[];
  /** Ce que le fournisseur précisera lui-même (« profil », « teinte ») : la ligne le dit, orange. */
  aPreciser: string[];
  /** La précision pour le comptoir (« pour bac acier »), ou null. */
  precision: string | null;
}

export interface LectureLigne {
  /** Le repère de la ligne dans le devis (« 1 », « 2 »…), dans l'ordre du devis. */
  ref: string;
  designation: string;
  quantite: string | null;
  unite: string | null;
  role: LectureRole;
  /** Vide : la ligne est sans fourniture (main-d'œuvre, accès, dépose). */
  fournitures: LectureFourniture[];
}

export interface LectureQuestion {
  /** La clé : celle d'une donnée du référentiel (« developpe_gouttiere ») quand elle en a une, sinon un nom court. */
  cle: string;
  texte: string;
  /** Les boutons ; vide : la réponse s'écrit. `valeur` est la valeur de la donnée du référentiel quand elle en a une. */
  boutons: { label: string; valeur: string }[];
  /** L'unité d'une réponse chiffrée, ou null. */
  unite: string | null;
  /** La donnée de la fiche qui manque (son nom court). */
  donnee: string;
  /** La ligne du devis que la question concerne seule (le raccord d'une fenêtre), ou null pour le chantier. */
  ligne: string | null;
}

export interface LectureDevis {
  fiche: FicheChantier;
  /** §50.8 : le chantier en bref, en phrases courtes, une par fait, dans l'ordre. */
  bref: string[];
  questions: LectureQuestion[];
  lignes: LectureLigne[];
  contexte: Record<string, string> | null;
  notes: string[];
}

const str = (v: unknown, max = 300): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const ROLES: readonly LectureRole[] = ["fourniture", "pose", "fourniture_et_pose", "hors_quantitatif"];

/** La lecture telle que le modèle (ou la base) la rend : relue champ par champ, rien d'invalide ne passe. */
export function parseLecture(raw: unknown): LectureDevis | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const lignes: LectureLigne[] = [];
  for (const [i, item] of list(o.lignes).entries()) {
    if (!item || typeof item !== "object") continue;
    const l = item as Record<string, unknown>;
    const designation = str(l.designation ?? l.des, 600);
    if (!designation) continue;
    const role = ROLES.find((r) => r === l.role) ?? "fourniture";
    const fournitures: LectureFourniture[] = [];
    for (const f of list(l.fournitures)) {
      if (!f || typeof f !== "object") continue;
      const x = f as Record<string, unknown>;
      const nom = str(x.nom, 200);
      if (!nom) continue;
      const donnees: Record<string, string> = {};
      if (x.donnees && typeof x.donnees === "object" && !Array.isArray(x.donnees)) {
        for (const [k, v] of Object.entries(x.donnees as Record<string, unknown>)) {
          const value = str(v, 80);
          if (/^[a-z][a-z0-9_]{0,40}$/.test(k) && value) donnees[k] = value;
        }
      }
      fournitures.push({
        nom,
        quantite: str(x.quantite, 20),
        unite: str(x.unite, 10),
        ouvrage: str(x.ouvrage, 60),
        emplacement: str(x.emplacement, 60),
        donnees,
        attend: list(x.attend).flatMap((a) => str(a, 60) ?? []),
        aPreciser: list(x.aPreciser ?? x.a_preciser).flatMap((a) => str(a, 60) ?? []),
        precision: str(x.precision, 160),
      });
    }
    lignes.push({ ref: str(l.ref, 20) ?? String(i + 1), designation, quantite: str(l.quantite ?? l.qte, 20), unite: str(l.unite, 10), role, fournitures });
  }
  const questions: LectureQuestion[] = [];
  for (const item of list(o.questions)) {
    if (!item || typeof item !== "object") continue;
    const q = item as Record<string, unknown>;
    const cle = str(q.cle, 60);
    const texte = str(q.texte, 300);
    if (!cle || !texte || !/^[a-z][a-z0-9_]{0,59}$/.test(cle)) continue;
    const boutons = list(q.boutons).flatMap((b) => {
      if (typeof b === "string") return str(b, 60) ? [{ label: b.trim(), valeur: b.trim() }] : [];
      if (!b || typeof b !== "object") return [];
      const label = str((b as Record<string, unknown>).label, 60);
      return label ? [{ label, valeur: str((b as Record<string, unknown>).valeur, 60) ?? label }] : [];
    });
    questions.push({ cle, texte, boutons, unite: str(q.unite, 10), donnee: str(q.donnee, 80) ?? cle.replace(/_/g, " "), ligne: str(q.ligne, 20) });
  }
  const contexte: Record<string, string> = {};
  if (o.contexte && typeof o.contexte === "object" && !Array.isArray(o.contexte)) {
    for (const [k, v] of Object.entries(o.contexte as Record<string, unknown>)) {
      const value = str(v, 200);
      if (value) contexte[k.slice(0, 60)] = value;
    }
  }
  return {
    // La fiche du modèle (liste « donnee / valeur / origine »), ou la fiche déjà lue, relue depuis la base avec la lecture.
    fiche: parseFicheEnregistree(o.fiche) ?? parseFiche(o.fiche) ?? { donnees: [] },
    bref: list(o.bref).flatMap((b) => str(b, 300) ?? []),
    questions,
    lignes,
    contexte: Object.keys(contexte).length > 0 ? contexte : null,
    notes: list(o.notes).flatMap((n) => str(n, 300) ?? []),
  };
}

/** Une ligne du quantitatif issue de la lecture : une fourniture (sa ligne du devis), ou une ligne sans fourniture. */
export interface LigneLecture {
  id: string;
  /** La ligne du devis d'où elle vient. */
  ligne: LectureLigne;
  fourniture: LectureFourniture | null;
  designation: string;
  quantity: string | null;
  unit: string | null;
  /** Les fournitures que la même ligne cite sans quantité (« et crochets de 11 ») : le calcul les compte avec la ligne. */
  cites: LectureFourniture[];
}

/**
 * Les lignes du quantitatif : une par fourniture nommée (la fourniture prend la place de la ligne qui l'écrit, §49.9),
 * et chaque ligne sans fourniture gardée telle quelle, hors liste (§49.9, « N lignes sans fourniture »).
 */
export function lignesDeLecture(lecture: LectureDevis, ids?: ReadonlyMap<string, string>): LigneLecture[] {
  const out: LigneLecture[] = [];
  for (const ligne of lecture.lignes) {
    if (ligne.fournitures.length === 0) {
      const id = ids?.get(ligne.ref) ?? ligne.ref;
      out.push({ id, ligne, fourniture: null, designation: ligne.designation, quantity: ligne.quantite, unit: ligne.unite, cites: [] });
      continue;
    }
    // Une fourniture écrite avec sa quantité est une ligne du quantitatif ; une fourniture citée sans quantité sur la même
    // ligne (« et crochets de 11 ») suit la ligne écrite : le calcul la compte. Une ligne qui ne fait que citer (une ligne de
    // pose : « soudures ») garde chaque fourniture citée comme ligne, sans quantité.
    const written = ligne.fournitures.filter((f) => f.quantite !== null);
    // Une ligne de pose qui ne fait que citer (« soudures » : l'étain) reste une ligne sans fourniture, avec ce qu'elle cite.
    if (written.length === 0 && (ligne.role === "pose" || ligne.role === "fourniture_et_pose")) {
      const id = ids?.get(ligne.ref) ?? ligne.ref;
      out.push({ id, ligne, fourniture: null, designation: ligne.designation, quantity: ligne.quantite, unit: ligne.unite, cites: ligne.fournitures });
      continue;
    }
    const listed = written.length > 0 ? written : ligne.fournitures;
    const cites = written.length > 0 ? ligne.fournitures.filter((f) => f.quantite === null) : [];
    listed.forEach((f, i) => {
      const key = listed.length === 1 ? ligne.ref : `${ligne.ref}.${i + 1}`;
      const id = ids?.get(key) ?? key;
      // La seule fourniture d'une ligne écrite avec sa quantité la porte (« 18 u » de prises), sauf une fourniture citée seule.
      const own = f.quantite !== null || listed.length !== 1 || cites.length > 0 || ligne.role === "pose" || ligne.role === "fourniture_et_pose";
      out.push({ id, ligne, fourniture: f, designation: f.nom, quantity: own ? f.quantite : ligne.quantite, unit: own ? f.unite : ligne.unite, cites: i === 0 ? cites : [] });
    });
  }
  return out;
}

const workOf = (ref: Referential, id: string | null): WorkItemType | undefined => (id ? ref.workItems.find((w) => w.id === id) : undefined);

/** « 17,40 m » → { value: "17.4", unit: "m" } dans l'unité de la donnée ; un nombre nu prend l'unité de la donnée. */
function readValue(def: { unit: string; textValues?: { value: string; keywords: string[] }[] }, raw: string): { value: string; unit: string } | null {
  const text = raw.trim();
  if (def.textValues?.length) {
    const t = ` ${normalizeText(text)} `;
    const hits = def.textValues.filter((v) => v.value === text || v.keywords.some((k) => t.includes(` ${normalizeText(k)} `)));
    if (hits.length === 1) return { value: hits[0]!.value, unit: def.unit };
  }
  if (/^\d+(?:[.,]\d+)?$/.test(text)) return { value: text.replace(",", "."), unit: def.unit };
  const dim = readDimension(text);
  if (!dim) return null;
  try {
    return sameDim(parseRefUnit(dim.unit).dim, parseRefUnit(def.unit).dim) ? dim : null;
  } catch {
    return null;
  }
}

const LINE_UNITS: Record<string, string> = { U: "u", M: "m", ML: "m", M2: "m2", CM: "cm", MM: "mm" };

/** Le produit nommé par la lecture, parmi ceux de l'emplacement : par identifiant, sinon par son nom (court ou complet). */
function produitDe(ref: Referential, slot: Slot, named: string): { id: string } | undefined {
  const candidates = ref.products.filter((p) => p.family === slot.family);
  const wanted = normalizeText(named);
  return candidates.find((p) => p.id === named) ?? candidates.find((p) => normalizeText(p.shortLabel) === wanted || normalizeText(p.label) === wanted) ?? candidates.find((p) => p.aliases.some((a) => normalizeText(a) === wanted));
}

/**
 * Le plan du calcul à partir de la lecture : chaque fourniture rattachée à son ouvrage et son emplacement, ses données
 * en faits du chantier, un ouvrage écrit sur plusieurs lignes pris ligne par ligne (une instance par ligne, §48.6).
 * Aucune règle de mots : l'ouvrage, l'emplacement et les données viennent du modèle, qui a lu le devis entier.
 */
export function planDeLecture(ref: Referential, lecture: LectureDevis, lignes: readonly LigneLecture[], extraFacts: readonly SiteFact[] = []): QuotePlan {
  // Un ouvrage écrit sur plusieurs lignes POUR LE MÊME EMPLACEMENT (deux fenêtres, deux gouttières) se prend ligne par
  // ligne ; ses autres emplacements (le raccord de la fenêtre) suivent la ligne du devis qui les écrit. Une gouttière et
  // ses crochets sur deux lignes restent un seul ouvrage.
  const bySlot = new Map<string, { ref: string; donnees: string }[]>();
  const refsByWork = new Map<string, Set<string>>();
  for (const l of lignes) {
    const w = workOf(ref, l.fourniture?.ouvrage ?? null);
    const slot = w?.slots.find((s) => s.key === l.fourniture?.emplacement) ?? w?.slots[0];
    // Seule une fourniture ÉCRITE (avec sa quantité) compte une ligne ; une fourniture citée sans quantité suit sa ligne.
    if (!w || !slot || l.quantity === null) continue;
    const k = `${w.id}/${slot.key}`;
    bySlot.set(k, [...(bySlot.get(k) ?? []), { ref: l.ligne.ref, donnees: JSON.stringify(l.fourniture!.donnees) }]);
    refsByWork.set(w.id, new Set([...(refsByWork.get(w.id) ?? []), l.ligne.ref]));
  }
  // Le même emplacement écrit sur deux lignes avec des données différentes (deux tailles de fenêtre) : une pièce par ligne ;
  // avec les mêmes données (9 points simples + 3 va-et-vient), les lignes s'additionnent dans le même ouvrage.
  const splitSlot = (k: string) => {
    const lines = bySlot.get(k) ?? [];
    return new Set(lines.map((x) => x.ref)).size >= 2 && new Set(lines.map((x) => x.donnees)).size >= 2;
  };
  const idFor = (w: WorkItemType, lineRef: string) =>
    (w.perLine && (refsByWork.get(w.id)?.size ?? 0) >= 2) || w.slots.some((s) => splitSlot(`${w.id}/${s.key}`)) ? `${w.id}${INSTANCE_SEP}${lineRef}` : w.id;
  const facts: SiteFact[] = [...ficheFacts(ref, lecture.fiche), ...extraFacts];
  const plans: LinePlan[] = [];
  const inputs = new Map<string, WorkItemInput>();
  for (const l of lignes) {
    const f = l.fourniture;
    if (!f) {
      // Ce qu'une ligne de pose cite (« soudures » : l'étain de la gouttière) : cité pour l'ouvrage, jamais écrit.
      for (const c of l.cites) {
        const cw = workOf(ref, c.ouvrage);
        const cs = cw?.slots.find((x) => x.key === c.emplacement);
        if (!cw || !cs) continue;
        const wid = idFor(cw, l.ligne.ref);
        const input = inputs.get(wid) ?? { workItemId: wid, params: {}, products: {}, mentioned: [], ...(cw.perLine ? { label: c.nom } : {}) };
        input.cited = [...(input.cited ?? []), { slot: cs.key, word: c.nom.charAt(0).toLowerCase() + c.nom.slice(1), line: l.ligne.ref }];
        inputs.set(wid, input);
      }
      plans.push({ ref: l.id, status: "not_material" });
      continue;
    }
    const work = workOf(ref, f.ouvrage);
    const slot: Slot | undefined = work?.slots.find((s) => s.key === f.emplacement) ?? work?.slots[0];
    if (!work || !slot) {
      plans.push({ ref: l.id, status: "not_covered", family: null, reason: "Fourniture reprise telle qu'écrite au devis." });
      continue;
    }
    const wid = idFor(work, l.ligne.ref);
    const input = inputs.get(wid) ?? { workItemId: wid, params: {}, products: {}, mentioned: [], ...(wid.includes(INSTANCE_SEP) || work.perLine ? { label: f.nom } : {}) };
    if (!input.mentioned.includes(slot.key)) input.mentioned.push(slot.key);
    // La quantité de la ligne mesure l'ouvrage quand une donnée de l'ouvrage se lit dans la quantité (17,40 m de gouttière,
    // 4 fenêtres) : une longueur ou une surface, ou le nombre d'un emplacement qui compte l'ouvrage (`measureOnly`). Un
    // nombre de pièces sur un autre emplacement (4 raccords) est la quantité à commander, telle qu'écrite.
    const unit = l.unit ? parseUnit(l.unit) : null;
    const refUnit = unit ? LINE_UNITS[unit] : undefined;
    let measures = false;
    // Un nombre de pièces mesure l'ouvrage quand l'emplacement le compte (`measureOnly`), ou quand le référentiel lit ce
    // nombre pour cet emplacement (« 2 descentes » : nb_descentes pour les tubes) ; sinon il se commande tel qu'écrit.
    const countsWork = refUnit === "u" && (slot.measureOnly || work.params.some((x) => x.fromLineQuantity && x.unit === "u" && (x.forSlots?.includes(slot.key) || slot.piecesFrom?.count === x.key || (!x.forSlots && slot.key === work.slots[0]?.key))));
    if (refUnit && l.quantity && (refUnit !== "u" || countsWork)) {
      const qty = l.quantity.replace(/\s/g, "").replace(",", ".");
      for (const p of work.params.filter((x) => x.fromLineQuantity && (!x.forSlots || x.forSlots.includes(slot.key)))) {
        let ok = false;
        try {
          ok = sameDim(parseRefUnit(p.unit).dim, parseRefUnit(refUnit).dim) && /^\d+(?:\.\d+)?$/.test(qty);
        } catch {
          ok = false;
        }
        if (!ok) continue;
        // Une pièce commandée telle qu'écrite qui compte aussi l'ouvrage (4 fenêtres) reste une quantité à commander.
        measures = !(slot.measureOnly && slot.orderedAsWritten);
        const before = facts.find((x) => x.key === p.key && x.workItemId === wid && x.origin === "devis" && x.evidence.startsWith("Devis, ") && x.unit === refUnit);
        if (before && (bySlot.get(`${work.id}/${slot.key}`)?.length ?? 0) >= 2) {
          before.value = new Decimal(before.value).plus(qty).toFixed();
          before.evidence = `${before.evidence}, ${l.id}`;
        } else facts.push({ key: p.key, value: new Decimal(qty).toFixed(), unit: refUnit, evidence: `Devis, ${l.id}`, origin: "devis", workItemId: wid, ...(slot.measureOnly ? { fromMeasureLine: true as const } : {}) });
      }
    }
    // Le produit du référentiel que la ligne nomme (« produit » : son identifiant, ou son nom tel que l'export le donne).
    const produit = f.donnees.produit ? produitDe(ref, slot, f.donnees.produit) : undefined;
    if (produit) input.products[slot.key] = { productId: produit.id, origin: "devis" };
    // Les données écrites sur la ligne, telles que le modèle les a lues (« taille_fenetre » : « 114x118 »).
    for (const [key, raw] of Object.entries(f.donnees)) {
      if (key === "produit") continue;
      const def = work.params.find((p) => p.key === key);
      if (!def) continue;
      const found = readValue(def, raw);
      if (!found) continue;
      const value: ParamValue = { value: found.value, unit: found.unit, origin: "devis", evidence: `Devis, ${l.id} (« ${raw} »)` };
      input.params[key] = value;
      if (!facts.some((x) => x.key === key && x.workItemId === wid)) facts.push({ key, value: found.value, unit: found.unit, evidence: value.evidence!, origin: "devis", workItemId: wid });
    }
    // Les fournitures citées sur la même ligne : des emplacements de plus que le calcul compte (les crochets des ardoises).
    const mentions: string[] = [];
    for (const c of l.cites) {
      const cw = workOf(ref, c.ouvrage) ?? work;
      const cs = cw.slots.find((x) => x.key === c.emplacement);
      if (!cs || cw.id !== work.id) continue;
      mentions.push(cs.key);
      if (!input.mentioned.includes(cs.key)) input.mentioned.push(cs.key);
      const cp = c.donnees.produit ? produitDe(ref, cs, c.donnees.produit) : undefined;
      if (cp) input.products[cs.key] = { productId: cp.id, origin: "devis" };
    }
    inputs.set(wid, input);
    plans.push({ ref: l.id, status: "planned", workItemId: wid, slot: slot.key, mentions, characteristics: [], ...(measures ? { measures: true as const } : {}) });
  }
  // Les faits du chantier (fiche, réponses, code postal) et ce que les autres ouvrages du devis ont lu (« 2 descentes de 3 m »
  // sur le tuyau sert à la naissance de la gouttière ; l'aspect du zinc d'une bande ne fait pas celui de la couverture)
  // complètent chaque ouvrage, par la règle de prêt du contexte, sans écraser ce que sa ligne écrit.
  // Une donnée que le modèle demande pour tout le chantier (deux documents qui se contredisent) n'est pas lue : la question tranche.
  const asked = new Set(lecture.questions.filter((q) => q.ligne === null).map((q) => q.cle));
  for (let i = facts.length - 1; i >= 0; i--) if (facts[i]!.origin !== "artisan" && asked.has(facts[i]!.key)) facts.splice(i, 1);
  // Et l'hypothèse par défaut ne vaut plus pour elle (§47.8, « askInstead ») : le calcul attend la réponse.
  for (const input of inputs.values()) {
    const work = ref.workItems.find((w) => w.id === baseOf(input.workItemId));
    const keys = lecture.questions.filter((q) => asked.has(q.cle) || plans.some((p) => p.status === "planned" && p.workItemId === input.workItemId && (p.ref === q.ligne || p.ref.startsWith(`${q.ligne}.`)))).map((q) => q.cle).filter((cle) => work?.params.some((p) => p.key === cle) && !input.params[cle]);
    if (keys.length > 0) input.askInstead = [...new Set([...(input.askInstead ?? []), ...keys])];
  }
  const context: ChantierContext = { facts };
  const principal = new Set([...inputs.keys()].filter((wid) => ref.workItems.find((w) => w.id === baseOf(wid))?.section === "principal"));
  for (const input of inputs.values()) {
    const work = ref.workItems.find((w) => w.id === baseOf(input.workItemId))!;
    const { params } = paramsFromContext(context, work, principal, input.workItemId);
    for (const p of work.params) {
      // La fiche corrigée par l'artisan (§51.4) passe devant ce que la ligne écrit ; sinon la ligne garde sa donnée.
      const corrected = facts.find((x) => x.key === p.key && x.origin === "artisan" && (!x.workItemId || x.workItemId === input.workItemId));
      if (input.params[p.key] && !corrected) continue;
      const found = params[p.key];
      if (found) input.params[p.key] = found;
    }
  }
  return { lines: plans, inputs: [...inputs.values()], context, characteristicsBySlot: {}, conflicts: [], contradictions: [] };
}

/** La clé de réponse d'une question de la lecture : celle de la donnée du référentiel (par pièce quand elle vise une ligne), sinon « fiche:<clé> ». */
export function cleDeQuestion(ref: Referential, plan: QuotePlan, q: LectureQuestion): string {
  // Le modèle de l'emplacement (« quelle tuile ? ») : la réponse est le produit, pour tout le chantier.
  if (q.cle.startsWith("produit_") && ref.workItems.some((w) => w.slots.some((s) => s.key === q.cle.slice("produit_".length)))) return `product:${q.cle.slice("produit_".length)}`;
  if (q.cle === CONSUMABLES_KEY) return `param:${CONSUMABLES_KEY}`;
  const def = ref.workItems.flatMap((w) => w.params).find((p) => p.key === q.cle);
  if (!def) return `fiche:${q.cle}`;
  if (q.ligne) {
    const instance = plan.lines.find((l) => l.status === "planned" && (l.ref === q.ligne || l.ref.startsWith(`${q.ligne}.`)) && ref.workItems.find((w) => w.id === baseOf(l.workItemId))?.params.some((p) => p.key === q.cle));
    // La question d'une pièce (une instance par ligne), ou d'un lot quand plusieurs ouvrages demandent la même donnée
    // (le façonnage de la noue et des bandes) : sa réponse ne vaut que pour lui, comme le calcul la lit.
    if (instance?.status === "planned" && (instance.workItemId.includes(INSTANCE_SEP) || piecewiseParams(ref, plan).includes(`param:${q.cle}`))) return scopedKey(q.cle, instance.workItemId);
  }
  return `param:${q.cle}`;
}

/** La question du calcul (boutons, unité) telle que l'écran la pose : celle du modèle, mot pour mot. */
export function questionDeLecture(ref: Referential, plan: QuotePlan, q: LectureQuestion): Question {
  const key = cleDeQuestion(ref, plan, q);
  const def = ref.workItems.flatMap((w) => w.params).find((p) => p.key === q.cle);
  const options = q.boutons.map((b) => ({ label: b.label, value: b.valeur }));
  const unit = q.unite ?? def?.unit ?? "u";
  if (key.startsWith("product:")) return { key, kind: options.some((o) => o.value === "") ? "confirm_product" : "choose_product", text: q.texte, ...(options.length > 0 ? { options } : {}), named: true };
  // Une question sans boutons, ou dont la donnée se nomme (une teinte, un profil, une qualité) : la réponse s'écrit (« Autre »).
  const named = options.length === 0 || !def || def.named === true || (def.unit === "u" && !def.choices?.length);
  return { key, kind: key.startsWith("fiche:") ? "choose" : "param", text: q.texte, unit, ...(options.length > 0 ? { options } : {}), ...(named ? { named: true } : {}) };
}

type Answers = Readonly<Record<string, EngineAnswer>>;

export interface EcranDeLecture {
  plan: QuotePlan;
  validation: TakeoffValidation;
  roles: Map<string, RoleProposal>;
  view: ArtisanView;
  purchase: PurchaseView;
  /** Les questions de la lecture encore ouvertes, dans l'ordre du modèle, avec leur clé de réponse. */
  questions: Question[];
  lignes: LigneLecture[];
  /** §49.9 : les lignes sans fourniture, dans l'ordre du devis. */
  sansFourniture: { lineId: string; label: string; measure: string | null }[];
}

/** La validation d'une ligne issue de la lecture : rien à relire, le modèle a lu le devis entier. */
export function validationDeLecture(trade: string, lignes: readonly LigneLecture[], plan: QuotePlan, confirmed: ReadonlySet<string> = new Set()): TakeoffValidation {
  const lines: LineValidation[] = lignes.map((l) => {
    if (!l.fourniture) return { lineId: l.id, kind: "labor", family: null, familyLabel: null, unit: null, quantity: null, basis: "purchase", status: "certain", issues: [] };
    const planned = plan.lines.find((p) => p.ref === l.id);
    // « 1 lot », « 1 ens », « 1 fft » : pas une quantité à commander (§41.3) ; la ligne compte par ce que le calcul en tire.
    const vague = /^(lot|lots|ens|ensemble|fft|ft|forfait)$/i.test((l.unit ?? "").trim());
    const unit: UnitCode | null = l.unit && !vague ? parseUnit(l.unit) : null;
    let quantity: Decimal | null = null;
    try {
      quantity = l.quantity && !vague ? new Decimal(l.quantity.replace(/\s/g, "").replace(",", ".")) : null;
    } catch {
      quantity = null;
    }
    const measures = planned?.status === "planned" && planned.measures === true;
    return { lineId: l.id, kind: "material", family: null, familyLabel: null, unit, quantity, basis: measures ? "work" : "purchase", status: "certain", issues: [] };
  });
  // Deux lignes identiques qui se suivent (même désignation, même quantité, même unité) : doublon ou quantités à
  // additionner ? Une question à l'artisan, jamais une fusion ni une suppression (§49.1). Aucun mot n'est cherché.
  const issues: TakeoffIssue[] = [];
  for (let i = 1; i < lignes.length; i++) {
    const a = lignes[i - 1]!;
    const b = lignes[i]!;
    // Une ligne gardée par l'artisan (« C'est bon ») n'est plus un doute.
    if (!a.fourniture || !b.fourniture || a.ligne === b.ligne || confirmed.has(a.id) || confirmed.has(b.id)) continue;
    if (normalizeText(a.designation) !== normalizeText(b.designation) || (a.quantity ?? "").replace(/\s/g, "") !== (b.quantity ?? "").replace(/\s/g, "") || normalizeText(a.unit ?? "") !== normalizeText(b.unit ?? "")) continue;
    const last = issues.at(-1);
    if (last && last.lineIds?.at(-1) === a.id) last.lineIds.push(b.id);
    else issues.push({ code: "DUPLICATE_LINE", severity: "to_verify", message: "La même ligne apparaît deux fois de suite : doublon ou quantités à additionner ?", lineIds: [a.id, b.id] });
  }
  for (const issue of issues) {
    for (const id of issue.lineIds ?? []) {
      const line = lines.find((l) => l.lineId === id);
      if (line) Object.assign(line, { status: "to_verify", issues: [...line.issues, issue] });
    }
  }
  const labor = lines.filter((l) => l.kind === "labor").length;
  const toVerify = lines.filter((l) => l.status === "to_verify").length;
  return { trade, lines, issues, counts: { certain: lines.length - labor - toVerify, probable: 0, toVerify, labor, blocking: 0 } };
}

const unitWord = (unit: string | null) => (unit === "u" ? "pièces" : unit === "m2" ? "m²" : unit);

/**
 * LES TROIS ÉCRANS À PARTIR DE LA LECTURE : le calcul (ratios et conversions, §51.3), puis la liste dans l'ordre du devis,
 * chaque fourniture sous le nom que le modèle lui donne, orange quand elle attend une réponse ou une précision du
 * fournisseur ; les questions sont celles du modèle, et seulement elles (§51.2, §51.5).
 */
export function ecranDeLecture(input: {
  ref: Referential;
  lecture: LectureDevis;
  answers?: Answers;
  preferences?: CompanyPreferences;
  options?: EngineOptions;
  extraFacts?: readonly SiteFact[];
  /** Les identifiants des lignes enregistrées (repère de lecture → identifiant), sinon les repères eux-mêmes. */
  ids?: ReadonlyMap<string, string>;
  /** Les lignes gardées telles quelles par l'artisan (« C'est bon »), corrigées par lui. */
  lines?: ReadonlyMap<string, { confirmed?: boolean; enteredByArtisan?: boolean; designation?: string; quantity?: string | null; unit?: string | null }>;
  /** §47.4 : les règles « à vérifier » déjà validées par trois entreprises (vertes partout) ; absent : les règles se disent sur la ligne, sans « C'est bon ». */
  validated?: ReadonlySet<string>;
  /** §41.3 : les interdits du code (jamais de m² d'ardoises, de lot, de métal sans dimension), orange ; `false` pour un banc du calcul seul. */
  interdits?: boolean;
}): EcranDeLecture {
  const { ref, lecture } = input;
  const answers = input.answers ?? {};
  const lignes = lignesDeLecture(lecture, input.ids).map((l) => {
    const edited = input.lines?.get(l.id);
    return edited?.designation !== undefined ? { ...l, designation: edited.designation, quantity: edited.quantity ?? null, unit: edited.unit ?? null } : l;
  });
  const plan = planDeLecture(ref, lecture, lignes, input.extraFacts);
  const validation = validationDeLecture(ref.trade, lignes, plan, new Set([...(input.lines ?? new Map())].filter(([, v]) => v.confirmed).map(([k]) => k)));
  const roles = new Map<string, RoleProposal>();
  for (const l of lignes) {
    if (!l.fourniture) continue;
    const planned = plan.lines.find((p) => p.ref === l.id);
    const measures = planned?.status === "planned" && planned.measures === true;
    roles.set(l.id, measures ? { role: "measure", why: "La quantité mesure l'ouvrage ; ce qui se commande en découle." } : { role: "purchase", why: "L'article se commande tel qu'écrit." });
  }
  const roleOf = new Map<string, LineRole>([...roles].map(([k, v]) => [k, v.role]));
  // Un emplacement qui ne fait que compter l'ouvrage (4 fenêtres) n'est pas un achat « donné » : ses autres articles se calculent.
  const given = new Set([...slotsGivenByQuote(plan, validation)].filter((g) => {
    const [wid, slotKey] = g.split("/") as [string, string];
    return !ref.workItems.find((w) => w.id === baseOf(wid))?.slots.find((x) => x.key === slotKey)?.measureOnly;
  }));
  // Le calcul compte ; une donnée qui ne change que la désignation (le développé, la pose des crochets) ne l'arrête pas :
  // le modèle nomme la fourniture, et demande lui-même ce qui manque (§51.2).
  const options: EngineOptions = { ...(input.options ?? {}), quantityOnly: true, blankUnknown: true };
  const engine = plan.inputs.length > 0 ? computeWithAnswers(ref, plan, answers, input.preferences ?? {}, options, given) : { needs: [], questions: [], declined: [], checks: [], unknowns: [], customProducts: {} };
  // §51.2 : les questions sont celles du modèle, et seulement elles (le moteur ne demande rien de lui-même).
  const asked: Asked[] = lecture.questions.flatMap((q) => {
    const question = questionDeLecture(ref, plan, q);
    // L'habitude de l'entreprise (« je façonne », apprise sur deux chantiers) répond d'avance à la question du modèle :
    // elle ne se pose plus, la réponse est dite dans le calcul et reste modifiable d'un tap.
    const def = ref.workItems.flatMap((w) => w.params).find((p) => p.key === q.cle);
    const sp = scopedParam(question.key);
    const habit = def?.kind === "artisan_preference" ? (input.preferences?.params?.[`${q.cle}@${sp ? baseOf(sp.workItemId) : ""}`] ?? input.preferences?.params?.[q.cle]) : undefined;
    if (habit !== undefined && answers[question.key] === undefined) return [];
    return [{ q, key: question.key, question }];
  });
  // La lecture est faite ; le calcul demande ce qui lui manque encore (voir plus bas, le filet de sécurité).
  // Filet de sécurité : une donnée que le calcul réclame et que le modèle n'a pas demandée (une question que révèle une
  // réponse : les bacs d'un rampant de 12 m) se pose quand même, avec les mots du référentiel ; jamais une donnée écrite.
  const hasAnswers = Object.keys(answers).length > 0;
  // Le calcul strict dit aussi la donnée d'ARTICLE qu'il attend encore (le développé d'une bande commandée façonnée, le
  // diamètre d'une sortie de toit) : la ligne l'attend, orange, tant que le modèle ou l'artisan ne l'a pas donnée.
  const strict = plan.inputs.length > 0 ? computeWithAnswers(ref, plan, answers, input.preferences ?? {}, input.options ?? {}, given) : { needs: [], questions: [] };
  const precisionWaits = new Map<string, string>();
  for (const n of strict.needs) {
    const m = n.status === "question" && !n.consumable ? /^param:([a-z0-9_]+)(?:@.+)?$/.exec(n.question?.key ?? "") : null;
    if (m) precisionWaits.set(`${n.workItemId}/${n.needId}`, m[1]!);
  }
  const fallback: Question[] = [...engine.questions, ...strict.questions.filter((q) => !engine.questions.some((x) => x.key === q.key))];
  for (const n of [...engine.needs, ...(engine.unknowns ?? [])]) {
    // Une estimation (des feuilles d'après un développé supposé) ne demande rien : elle s'ajuste.
    if ((n.toConfirm ?? []).some((r) => r.key.startsWith("estimation:"))) continue;
    for (const key of n.unknownParams ?? []) {
      const work = ref.workItems.find((w) => w.id === baseOf(n.workItemId));
      const def = work?.params.find((p) => p.key === key);
      // Seule une donnée qui change l'article (le développé, le Ø) se demande ; une donnée sans effet (le recouvrement d'une tuile à blocage), non.
      if (!def || !work?.needs.some((r) => (r.precisionRequires ?? []).includes(key)) || fallback.some((q) => q.key === `param:${key}` || scopedParam(q.key)?.name === key)) continue;
      fallback.push({ key: `param:${key}`, kind: "param", text: def.question, unit: def.unit, ...(def.choices ? { options: def.choices } : {}), ...(def.named ? { named: true } : {}) });
    }
  }
  for (const q of fallback) {
    if (!hasAnswers || asked.some((a) => a.key === q.key) || !q.key.startsWith("param:")) continue;
    const m = /^param:([a-z0-9_]+)(?:@([a-z0-9_-]+))?$/.exec(q.key) ?? /^product:([a-z0-9_]+)$/.exec(q.key);
    const cle = m ? (q.key.startsWith("product:") ? `produit_${m[1]!}` : m[1]!) : q.key.replace(/[^a-z0-9_]/g, "_");
    const def = ref.workItems.flatMap((w) => w.params).find((p) => p.key === cle);
    const ligne = m?.[2] ? (plan.lines.find((l) => l.status === "planned" && l.workItemId === m[2])?.ref.split(".")[0] ?? null) : null;
    asked.push({ q: { cle, texte: q.text, boutons: (q.options ?? []).map((o) => ({ label: o.label, valeur: o.value })), unite: q.unit ?? null, donnee: def?.label.toLowerCase() ?? cle.replace(/_/g, " "), ligne }, key: q.key, question: q });
  }
  // Une réponse sans sa pièce (« param:faconnage » pour toutes les pièces) vaut pour chaque question de pièce (comme le calcul la lit).
  const answered = (a: Asked) => answers[a.key] !== undefined || (scopedParam(a.key) !== null && answers[`param:${a.q.cle}`] !== undefined);
  // À l'ouverture, toutes les questions du modèle ; une fois qu'on répond, seules celles qu'une fourniture ou le calcul attend encore
  // (le nombre d'arêtiers ne sert plus quand l'arêtier est en zinc).
  // Encore utile : le calcul la demande, ou la donnée manque encore à un article (« dév. ? ») ; un modèle choisi peut rendre
  // une question sans objet (le recouvrement d'une tuile à blocage).
  const needed = (a: Asked) => fallback.some((q) => q.key === a.key || scopedParam(q.key)?.name === a.q.cle || q.key === `param:${a.q.cle}`);
  const live = asked.filter((a) => !hasAnswers || a.key.startsWith("fiche:") || a.key.startsWith("product:") || needed(a) || answers[a.key] === null);
  const questions = live.filter((a) => !answered(a)).map((a) => a.question);
  const viewLines = lignes.map((l) => ({ id: l.id, designation: l.designation, quantity: l.quantity, unit: l.unit, confirmed: input.lines?.get(l.id)?.confirmed ?? false, enteredByArtisan: input.lines?.get(l.id)?.enteredByArtisan ?? false }));
  const view = artisanView(viewLines, validation, { needs: engine.needs, questions, declined: engine.declined }, { plan, roles: roleOf, ref });
  const raw = purchaseView(view, { ...engine, questions }, { plan, roles: roleOf, ref, validation });
  const purchase = finishPurchase(raw, { ref, plan, lignes, asked: live, answers, validated: input.validated, interdits: input.interdits !== false, customProducts: engine.customProducts, engine: [...engine.needs, ...(engine.unknowns ?? [])], precisionWaits, answers_: answers, notes: lecture.notes });
  const sansFourniture = lignes.filter((l) => !l.fourniture).map((l) => ({ lineId: l.id, label: l.designation.trim(), measure: [l.quantity?.trim(), l.unit?.trim()].filter(Boolean).join(" ") || null }));
  return { plan, validation, roles, view, purchase, questions, lignes, sansFourniture };
}

interface Asked {
  q: LectureQuestion;
  key: string;
  question: Question;
}

/** §50.3 : la raison orange en cinq mots au plus (« Modèle et teinte à préciser », « Développé à préciser »). */
function raisonCourte(subjects: readonly string[]): string {
  // « modèle et teinte de tuile » → « Modèle et teinte » ; « raccord ZWC ou Pratikal » reste entier (c'est le choix qui compte).
  const short = (t: string) => (/\s(?:de la|de l['’]|des|du|de|d['’])\s/i.test(` ${t} `) ? subjectOf(t) : t.trim().charAt(0).toUpperCase() + t.trim().slice(1));
  const parts = [...new Set(subjects.map(short).filter(Boolean))];
  const head = parts[0] ?? "";
  const rest = parts.slice(1).map((t) => t.charAt(0).toLowerCase() + t.slice(1));
  return `${[head, ...rest].join(", ")} à préciser`;
}

/**
 * Le nom du comptoir est celui du modèle ; ce que le calcul y ajoute (« longueur 9 cm » des crochets, tirée de la pente et
 * de la zone) suit, car le comptoir en a besoin : les segments du nom calculé que le nom du modèle ne dit pas, sans « ? ».
 */
function nomAvecCalcul(nom: string, calcule: string): string {
  const dit = normalizeText(nom);
  // « (modèle à préciser) » : la parenthèse que le calcul ajoute au nom quand l'artisan a refusé le modèle.
  const parenthese = /\s(\([^()]+\))$/.exec(calcule)?.[1];
  const words = (t: string) => t.replace(/\s\([^()]+\)$/, "").split(/\s+/).filter(Boolean);
  const same = (w: string) =>
    w
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[,;:]+$/, "");
  const mine = words(nom).map(same);
  const theirs = words(calcule);
  // Le début commun (« Crochets d'ardoise inox standard, »), puis ce que le calcul ajoute (« longueur 11 cm », « dév. 25 »).
  let common = 0;
  while (common < mine.length && common < theirs.length && mine[common] === same(theirs[common]!)) common++;
  const extra = common > 0 ? theirs.slice(common).filter((w) => !/\?/.test(w) && !mine.some((m) => m === same(w) || (same(w).length >= 2 && m.includes(same(w))))) : [];
  // Un mot qui ne dit rien seul (« dév. » sans sa valeur) ne s'ajoute pas.
  const kept = extra.filter((w, i) => !/\.$/.test(w) || (extra[i + 1] !== undefined && /\d/.test(extra[i + 1]!)));
  // La virgule du calcul avant ce qu'il ajoute (« Ø100, longueur 4 m ») reste.
  const before = kept.length > 0 ? theirs[theirs.indexOf(kept[0]!) - 1] : undefined;
  const sep = common > 0 && /,$/.test(before ?? "") ? "," : "";
  const base = kept.length > 0 ? `${nom}${sep} ${kept.join(" ")}` : nom;
  return parenthese && !dit.includes(normalizeText(parenthese)) ? `${base} ${parenthese}` : base;
}

/**
 * La liste telle que le fondateur la lit (§51.5) : chaque fourniture sous le nom du modèle, dans l'ordre du devis ; orange
 * quand elle attend une réponse (`attend`) ou une précision du fournisseur (`aPreciser`), avec sa raison en quelques mots ;
 * les décisions de l'écran sont les questions du modèle, et le « C'est bon » d'une ligne à préciser.
 */
function finishPurchase(
  raw: PurchaseView,
  ctx: {
    ref: Referential;
    plan: QuotePlan;
    lignes: readonly LigneLecture[];
    asked: readonly Asked[];
    answers: Answers;
    validated: ReadonlySet<string> | undefined;
    interdits: boolean;
    customProducts: Readonly<Record<string, string>>;
    engine: readonly { needId: string; workItemId: string; slot: string; unknownParams?: readonly string[]; trace?: readonly { label: string; value: string }[] }[];
    /** La donnée d'article que le calcul strict attend encore, par besoin (« ouvrage/besoin » → clé de la donnée). */
    precisionWaits: ReadonlyMap<string, string>;
    answers_: Answers;
    notes: readonly string[];
  },
): PurchaseView {
  const { plan, lignes, asked } = ctx;
  const order = new Map(lignes.map((l, i) => [l.id, i]));
  const byLine = new Map(lignes.map((l) => [l.id, l]));
  const workOfLine = (id: string) => {
    const p = plan.lines.find((x) => x.ref === id);
    return p?.status === "planned" ? p : undefined;
  };
  // La fourniture que calcule un besoin : celle de la ligne de son instance (les lignes de l'article), au même emplacement.
  const fournitureOfNeed = (item: PurchaseItem): LigneLecture | undefined => {
    const works = new Set(item.lineIds.map((id) => workOfLine(id)?.workItemId).filter(Boolean));
    const n = ctx.engine.find((x) => item.needIds.includes(x.needId) && works.has(x.workItemId));
    if (!n) return undefined;
    const own = lignes.find((l) => {
      const p = workOfLine(l.id);
      return p !== undefined && p.workItemId === n.workItemId && p.slot === n.slot;
    });
    if (own) return own;
    // Une fourniture citée sur une ligne écrite (les crochets Négrafix de la gouttière) : son nom, sous la ligne qui l'écrit.
    for (const l of lignes) {
      const p = workOfLine(l.id);
      if (!p || p.workItemId !== n.workItemId) continue;
      const c = l.cites.find((x) => x.emplacement === n.slot);
      if (c) return { ...l, fourniture: c };
    }
    return undefined;
  };
  const isAnswered = (a: Asked) => ctx.answers[a.key] !== undefined || (scopedParam(a.key) !== null && ctx.answers[`param:${a.q.cle}`] !== undefined);
  // Une question close sans réponse (null) n'est plus posée, mais la donnée manque toujours : la ligne reste orange.
  const unresolved = (a: Asked) => !isAnswered(a) || ctx.answers[a.key] === null;
  const open = (cle: string, lineRef?: string) => {
    const mine = asked.filter((a) => a.q.cle === cle && unresolved(a));
    return (lineRef ? mine.find((a) => a.q.ligne === lineRef) : undefined) ?? mine.find((a) => a.q.ligne === null) ?? mine[0];
  };
  const answered = (cle: string) => {
    const a = asked.find((x) => x.q.cle === cle);
    const v = a ? ctx.answers[a.key] : undefined;
    if (!a || v === undefined || v === null) return null;
    const value = typeof v === "string" ? v : v.value;
    return a.q.boutons.find((b) => b.valeur === value)?.label ?? value;
  };
  const reasons = new Map<string, string>();
  const decisions: Decision[] = [];
  const toBuy: PurchaseItem[] = raw.toBuy.map((item) => {
    const line = item.kind === "direct" ? byLine.get(item.lineIds[0] ?? "") : fournitureOfNeed(item);
    const f = line?.fourniture;
    // Un article que le code ajoute d'office (la naissance) garde son nom, sans les données que le modèle n'a pas demandées (« Ø? ») ;
    // il attend la question du modèle sur la donnée qui lui manque (le développé), comme la ligne qui l'écrit.
    if (!line || !f) {
      const estimated = (item.rules ?? []).some((r) => r.key.startsWith("estimation:"));
      const own = ctx.engine.filter((n) => item.needIds.includes(n.needId));
      const unknown = estimated ? [] : [...new Set(own.flatMap((n) => [...(n.unknownParams ?? []), ...(ctx.precisionWaits.has(`${n.workItemId}/${n.needId}`) ? [ctx.precisionWaits.get(`${n.workItemId}/${n.needId}`)!] : [])]))];
      // « Naissances dév. ? » : la donnée inconnue du nom est une question ouverte de l'ouvrage (le développé de la gouttière).
      const works = [...new Set(own.map((n) => baseOf(n.workItemId)))];
      const named = !estimated && /\?/.test(item.label) ? asked.filter((a) => unresolved(a) && ctx.ref.workItems.some((w) => works.includes(w.id) && w.params.some((p) => p.key === a.q.cle))).map((a) => a.q.cle) : [];
      // Une donnée prise par défaut (la pente à 45°) que le modèle demande encore : la quantité attend la réponse.
      const assumed = estimated ? [] : asked.filter((a) => a.q.ligne === null && unresolved(a) && item.assumptionKeys.includes(`param:${a.q.cle}`)).map((a) => a.q.cle);
      const waits = [...new Set([...unknown, ...named, ...assumed])].map((cle) => open(cle)).filter((a): a is Asked => !!a);
      const pending = [...new Set([...(item.waitsOn ?? []), ...waits.map((a) => a.key)])];
      if (waits.length > 0) reasons.set(item.key, raisonCourte(waits.map((a) => a.q.donnee)));
      return {
        ...item,
        label: item.label.replace(/\s*(?:d[ée]v\.\s*)?\S*\?\S*/g, "").replace(/\s{2,}/g, " ").trim() || item.label,
        ...(pending.length > 0 ? { waitsOn: pending, asks: waits.map((a) => ({ key: a.key, text: a.question.text.replace(/\s*\?$/, ""), unit: a.question.unit ?? null, options: a.question.options ?? [] })) } : {}),
      };
    }
    const estimated = (item.rules ?? []).some((r) => r.key.startsWith("estimation:"));
    const strictWaits = ctx.engine.filter((n) => item.needIds.includes(n.needId)).map((n) => ctx.precisionWaits.get(`${n.workItemId}/${n.needId}`)).filter((c): c is string => !!c);
    const assumed = asked.filter((a) => a.q.ligne === null && unresolved(a) && item.assumptionKeys.includes(`param:${a.q.cle}`)).map((a) => a.q.cle);
    const waits = estimated ? [] : [...new Set([...f.attend, ...strictWaits, ...assumed])].map((cle) => open(cle, line.ligne.ref)).filter((a): a is Asked => !!a);
    // Une quantité calculée n'attend que les questions du modèle ; une quantité encore vide attend aussi sa donnée du calcul.
    const pending = [...new Set([...(item.quantity === null ? (item.waitsOn ?? []) : []), ...waits.map((a) => a.key)])];
    const preciser = f.aPreciser.length > 0 && ctx.answers[`a-preciser:${line.id}`] === undefined;
    // (la règle « à préciser » de la ligne est aussi sa décision, « C'est bon » : voir plus bas)
    const subjects = [...waits.map((a) => a.q.donnee), ...(preciser ? f.aPreciser : [])];
    // Ce que l'artisan a répondu pour cette ligne : la réponse du calcul (« Espagne 1er choix ») avec le nom, celle d'une
    // question de la fiche avec sa question (« Marque des ardoises : Cupa »), pour le comptoir.
    const isFiche = (cle: string) => asked.find((a) => a.q.cle === cle)?.key.startsWith("fiche:") === true;
    const said = f.attend.filter((cle) => !isFiche(cle)).map(answered).filter((v): v is string => !!v);
    const saidFiche = f.attend.filter(isFiche).map((cle) => {
      const v = answered(cle);
      // « Fenêtre de toit : quelle taille ? » nomme l'article : la valeur suffit ; « Marque des ardoises ? » : la question et la valeur.
      const texte = asked.find((a) => a.q.cle === cle)!.q.texte.replace(/\s*\?$/, "");
      return v ? (/\s:\s/.test(texte) ? v : `${texte} : ${v}`) : null;
    }).filter((v): v is string => !!v);
    const precision = [f.precision, ...said].filter(Boolean).join(", ");
    // Ce que la ligne attend se dit par la question du modèle, jamais deux fois : les règles « manque » du calcul tombent.
    const kept = (item.rules ?? []).filter((r) => !r.key.startsWith("manque:"));
    const rules = preciser ? [...kept, { key: `a-preciser:${line.id}`, text: `${f.aPreciser.join(", ")} à préciser avec le fournisseur`, said: true as const, local: true as const }] : kept;
    const state = preciser ? ("to_confirm" as const) : item.state;
    if (subjects.length > 0) reasons.set(item.key, raisonCourte(subjects));
    const { waitsOn: _w, asks: _a, ...rest } = item;
    // Un modèle écrit par l'artisan sous « Autre » (« Ardoise d'Angers ») nomme la ligne : le calcul l'a déjà mis dans le nom.
    const typed = [...Object.values(ctx.customProducts), ...Object.values(ctx.answers_).map((v) => (typeof v === "string" ? v : v?.value ?? ""))].filter((c) => c.length >= 3 && !/^\d+(?:[.,]\d+)?$/.test(c));
    const custom = typed.some((c) => normalizeText(item.label).includes(normalizeText(c)));
    // Le nom calculé reste quand l'article a son produit (« Bandes cuivre façonnées 0,6 mm ») et rien d'inconnu ; sinon le
    // nom du modèle, avec ce que le calcul y ajoute.
    // Un article calculé dont le produit est une spécification (« Bacs joint debout Quartz-Zinc 0,65 mm », « Lames pin 27×145 »)
    // garde le nom du calcul : c'est lui que le comptoir charge. Un nom sans spécification (« Gouttière dév. 33 ») prend celui du modèle.
    const specific = item.kind !== "direct" && !/\?/.test(item.label) && /\d+(?:[.,]\d+)?\s*(?:mm|cm|m²|m2|kg|g|l)(?![a-z])|\d+\s*[×x]\s*\d+/i.test(item.label.replace(/d[ée]v\.?\s*\d+(?:[.,]\d+)?(?:\s*(?:mm|cm))?/gi, ""));
    return {
      ...rest,
      state,
      label: custom || specific ? item.label : nomAvecCalcul(f.nom, item.label),
      // La précision du calcul (« 48 m² × 40,7 ardoises/m² ») d'abord ; sinon celle du modèle, et la réponse donnée.
      ...(item.precision || precision || saidFiche.length ? { precision: [item.precision || precision, ...saidFiche].filter(Boolean).join("; ") } : {}),
      ...(pending.length > 0 ? { waitsOn: pending, asks: waits.map((a) => ({ key: a.key, text: a.question.text.replace(/\s*\?$/, ""), unit: a.question.unit ?? null, options: a.question.options ?? [] })) } : {}),
      ...(rules?.length ? { rules } : {}),
    };
  });
  // Les décisions de la liste qui ne sont pas des questions du calcul (la quantité d'un modèle écrit par l'artisan) restent.
  for (const d of raw.questions) if (!/^(engine:|role:|comptoir:|precise:|a-preciser:[^:]+:\d+$)/.test(d.key) && !d.question && ctx.answers[d.key] === undefined) decisions.push(d);
  // Les questions du modèle, chacune une décision de l'écran ; « C'est bon » pour une ligne que le fournisseur précisera.
  for (const l of lignes) {
    const f = l.fourniture;
    if (!f || f.aPreciser.length === 0) continue;
    const title = f.aPreciser.map((t, i) => (i === 0 ? t.charAt(0).toUpperCase() + t.slice(1) : t)).join(", ");
    decisions.push({ key: `a-preciser:${l.id}`, state: "to_confirm", title, text: `${title} à préciser : écris-le dans le nom de la ligne, ou laisse le fournisseur proposer.`, lineIds: [l.id], primary: { action: "keep", label: "C'est bon" }, secondary: ["edit"] });
  }
  for (const a of asked) {
    // Une question close sans réponse reste une décision de l'écran (elle se rouvre dans sa carte, §49.8).
    if (isAnswered(a) && ctx.answers[a.key] !== null) continue;
    const lineIds = lignes.filter((l) => l.fourniture?.attend.includes(a.q.cle) || l.cites.some((c) => c.attend.includes(a.q.cle))).map((l) => l.id);
    decisions.push({ key: `engine:${a.key}`, state: "missing", title: a.q.texte.replace(/\s*\?$/, ""), text: a.q.texte, lineIds, primary: { action: "answer", label: "Renseigner" }, secondary: [], question: a.question });
  }
  // §49.1 : la liste suit l'ordre du devis : la ligne, puis ses fournitures dans l'ordre du modèle, puis ce que le calcul y
  // ajoute d'office (la naissance de la gouttière).
  const rank = (item: PurchaseItem) => {
    const line = item.kind === "direct" ? byLine.get(item.lineIds[0] ?? "") : fournitureOfNeed(item);
    const first = Math.min(...item.lineIds.map((id) => byLine.get(id)?.ligne.ref ?? "").map((ref) => lignes.findIndex((l) => l.ligne.ref === ref)).filter((i) => i >= 0), Number.MAX_SAFE_INTEGER);
    const within = line ? (order.get(line.id) ?? 0) : Number.MAX_SAFE_INTEGER;
    return [first, within] as const;
  };
  // Les consommables acceptés (§49.6) ferment la liste, dans l'ordre du devis entre eux.
  const sorted = [...toBuy].map((item, i) => ({ item, i, r: rank(item) })).sort((a, b) => Number(a.item.consumable === true) - Number(b.item.consumable === true) || a.r[0] - b.r[0] || a.r[1] - b.r[1] || a.i - b.i).map((x) => x.item);
  const rows: ScreenRow[] = sorted.map((item) => {
    const waits = (item.waitsOn ?? []).map((k) => decisions.find((d) => d.question?.key === k)).filter((d): d is Decision => !!d);
    // Une donnée qui manque encore (question ouverte, ou close sans réponse) : orange.
    const check = item.state === "to_confirm" || (item.waitsOn ?? []).length > 0;
    const decision = waits[0] ?? decisions.find((d) => d.key.startsWith("a-preciser:") && d.lineIds.some((id) => item.lineIds.includes(id)));
    return { key: `item:${item.key}`, status: check ? "check" : "ok", itemKey: item.key, ...(decision ? { decisionKey: decision.key } : {}), lineIds: item.lineIds };
  });
  for (const q of raw.toQuote) rows.push({ key: `quote:${q.key}`, status: "supplier", quoteKey: q.key, lineIds: q.lineIds });
  // Une décision sans article (la quantité d'un modèle écrit) : sa ligne orange, réglée dans sa carte (§49.8).
  for (const d of decisions) {
    if (d.question || rows.some((r) => r.decisionKey === d.key) || d.lineIds.length === 0 || rows.some((r) => r.itemKey && r.lineIds.some((id) => d.lineIds.includes(id)))) continue;
    const quote = raw.toQuote.find((q) => q.lineIds.some((id) => d.lineIds.includes(id)));
    const at = quote ? rows.findIndex((r) => r.quoteKey === quote.key) : -1;
    const row: ScreenRow = { key: `decision:${d.key}`, status: "check", pending: { label: d.title, quantity: quote?.measure ?? null }, decisionKey: d.key, lineIds: d.lineIds };
    if (at >= 0) rows.splice(at, 1, row);
    else rows.push(row);
  }
  const screen = { groups: [{ key: "devis", label: "Fournitures", measure: null, kind: "autres" as const, rows }], total: rows.length, toCheck: rows.filter((r) => r.status === "check").length };
  const purchase: PurchaseView = { ...raw, toBuy: sorted, questions: decisions, screen, canValidate: rows.length > 0 && rows.every((r) => r.status !== "check") && decisions.every((d) => ctx.answers[d.key] !== undefined) };
  const answers = ctx.answers as Record<string, string | { value: string; unit: string } | null>;
  const overridden = applyPurchaseOverrides(purchase, answers);
  const confirmed = ctx.validated ? applyRuleConfirmations(overridden, answers, ctx.validated) : overridden;
  // Les interdits du code (§41.3 : jamais de m² d'ardoises, de lot, de métal sans dimension) : orange, comme partout.
  const finished = withShortReasons(ctx.interdits ? applyOrangeFlags(confirmed, forbiddenFlags(confirmed), answers) : confirmed);
  // La raison d'une ligne orange : la donnée que le modèle demande, ou ce que le fournisseur précisera (§51.5).
  return { ...finished, warnings: [...new Set([...finished.warnings, ...ctx.notes])], screen: { ...finished.screen, groups: finished.screen.groups.map((g) => ({ ...g, rows: g.rows.map((r) => (r.status === "check" && r.itemKey && reasons.has(r.itemKey) ? { ...r, reason: reasons.get(r.itemKey)! } : r)) })) } };
}

/**
 * Une lecture SANS modèle (lignes d'un partenaire §38, ancien quantitatif sans lecture enregistrée) : chaque ligne est la
 * fourniture telle qu'écrite, sans ouvrage ni calcul ; une unité en heures, forfait ou jour n'est jamais une fourniture
 * (§49.9). Aucun mot n'est cherché dans la ligne.
 */
export function lectureDepuisLignes(lines: readonly { id: string; designation: string; quantity: string | null; unit: string | null }[]): LectureDevis {
  return {
    fiche: { donnees: [] },
    bref: [],
    questions: [],
    lignes: lines.map((l) => {
      const sans = isWithoutSupplyUnit(l.unit);
      return {
        ref: l.id,
        designation: l.designation,
        quantite: l.quantity,
        unite: l.unit,
        role: sans ? ("hors_quantitatif" as const) : ("fourniture" as const),
        fournitures: sans ? [] : [{ nom: withoutLabour(l.designation).split(" - ")[0]!.trim() || l.designation, quantite: l.quantity, unite: l.unit, ouvrage: null, emplacement: null, donnees: {}, attend: [], aPreciser: [], precision: null }],
      };
    }),
    contexte: null,
    notes: [],
  };
}
