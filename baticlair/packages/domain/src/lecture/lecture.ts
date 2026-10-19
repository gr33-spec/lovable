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
import { fournituresElectriques, pointElectrique, type ArticleElectrique } from "./electricite.js";
import { ficheDeCalcul, fournituresDeFiche, questionsDeFiche, type ArticleFiche, type FicheMetier } from "../referential/fiches/index.js";

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

/** Un lot du devis (temps un) : le métier et les références des lignes qui en relèvent, dans l'ordre du devis. */
export interface LectureLot {
  metier: string;
  libelle: string;
  lignes: string[];
}

export interface LectureDevis {
  /** Temps un : le métier du devis (identifiant du référentiel), ou null si le modèle ne l'a pas dit. */
  metier: string | null;
  /** Temps un : les lots quand le devis en a plusieurs (vide sinon). */
  lots: LectureLot[];
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
  const lots: LectureLot[] = [];
  for (const item of list(o.lots)) {
    if (!item || typeof item !== "object") continue;
    const lot = item as Record<string, unknown>;
    const metier = str(lot.metier, 40);
    if (!metier) continue;
    lots.push({ metier, libelle: str(lot.libelle, 80) ?? metier, lignes: list(lot.lignes).flatMap((r) => str(r, 20) ?? []) });
  }
  return {
    metier: str(o.metier, 40),
    lots,
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
    (w.perLine && (refsByWork.get(w.id)?.size ?? 0) >= 2) || w.slots.some((s) => splitSlot(`${w.id}/${s.key}`)) ? `${w.id}${INSTANCE_SEP}${lineRef.replace(/[^a-zA-Z0-9_-]/g, "-")}` : w.id;
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
export function cleDeQuestion(ref: Referential, plan: QuotePlan, q: LectureQuestion, lignes?: readonly LigneLecture[]): string {
  // Le modèle de l'emplacement (« quelle tuile ? ») : la réponse est le produit, pour tout le chantier.
  if (q.cle.startsWith("produit_") && ref.workItems.some((w) => w.slots.some((s) => s.key === q.cle.slice("produit_".length)))) return `product:${q.cle.slice("produit_".length)}`;
  if (q.cle === CONSUMABLES_KEY) return `param:${CONSUMABLES_KEY}`;
  const def = ref.workItems.flatMap((w) => w.params).find((p) => p.key === q.cle);
  if (!def) return `fiche:${q.cle}`;
  if (q.ligne) {
    // La ligne du devis que vise la question (« 1:005 ») : ses identifiants dans le plan (le repère, ou l'identifiant enregistré).
    const ids = new Set([q.ligne, ...(lignes ?? []).filter((l) => l.ligne.ref === q.ligne).map((l) => l.id)]);
    const instance = plan.lines.find((l) => l.status === "planned" && [...ids].some((id) => l.ref === id || l.ref.startsWith(`${id}.`)) && ref.workItems.find((w) => w.id === baseOf(l.workItemId))?.params.some((p) => p.key === q.cle));
    // La question d'une pièce (une instance par ligne), ou d'un lot quand plusieurs ouvrages demandent la même donnée
    // (le façonnage de la noue et des bandes) : sa réponse ne vaut que pour lui, comme le calcul la lit.
    if (instance?.status === "planned" && (instance.workItemId.includes(INSTANCE_SEP) || piecewiseParams(ref, plan).includes(`param:${q.cle}`))) return scopedKey(q.cle, instance.workItemId);
  }
  return `param:${q.cle}`;
}

/** La question du calcul (boutons, unité) telle que l'écran la pose : celle du modèle, mot pour mot. */
export function questionDeLecture(ref: Referential, plan: QuotePlan, q: LectureQuestion, lignes?: readonly LigneLecture[]): Question {
  const key = cleDeQuestion(ref, plan, q, lignes);
  // La donnée de l'ouvrage de la question (le façonnage du joint debout n'a pas les boutons de celui d'une noue).
  const ouvrage = /^param:[^@]+@([^_]+?)(?:__|$)/.exec(key)?.[1];
  const defs = ref.workItems.flatMap((w) => w.params.filter((p) => p.key === q.cle).map((p) => ({ w, p })));
  const def = (defs.find((x) => x.w.id === ouvrage) ?? defs.find((x) => (x.p.choices?.length ?? 0) > 0) ?? defs[0])?.p;
  // Retour du fondateur (2026-10-12, « Un champ n'est pas correctement rempli » après « En façade (bandeau) ») : un bouton
  // du modèle dont la valeur est en mots (« bandeau ») prend la valeur du référentiel (« 2 ») quand la donnée en a une.
  let options = q.boutons.map((b) => ({ label: b.label, value: def ? valeurDuReferentiel(def, b) : b.valeur }));
  // Garde-fou (retour du fondateur, 2026-10-13 : « Cette réponse ne passe pas » sur « Je façonne (bobine) ») : un bouton qui
  // ne se rattache à aucun choix du référentiel ne s'affiche jamais ; la question prend alors les boutons du référentiel.
  // Sur une donnée chiffrée, le serveur n'accepte qu'un nombre : un bouton en mots prend le nombre qu'il dit seul, sinon il
  // laisse la place aux boutons du référentiel, ou disparaît (la case « Autre » reste pour écrire).
  const chiffre = (v: string) => /^\d+(?:[.,]\d+)?$/.test(v.trim());
  const choix = def?.choices ?? [];
  const aValeur = def !== undefined && !def.named && !(def.unit === "u" && choix.length === 0) && key.startsWith("param:");
  if (aValeur && options.some((o) => !chiffre(o.value))) {
    if (choix.length > 0) options = choix.map((c) => ({ label: c.label, value: c.value }));
    else
      options = options.flatMap((o) => {
        if (chiffre(o.value)) return [o];
        const ns = [...o.label.matchAll(/\d+(?:[.,]\d+)?/g)].map((m) => m[0].replace(",", "."));
        return ns.length === 1 ? [{ label: o.label, value: ns[0]! }] : [];
      });
  }
  const unit = q.unite || def?.unit || "u";
  if (key.startsWith("product:")) return { key, kind: options.some((o) => o.value === "") ? "confirm_product" : "choose_product", text: q.texte, ...(options.length > 0 ? { options } : {}), named: true };
  // Une question sans boutons, ou dont la donnée se nomme (une teinte, un profil, une qualité) : la réponse s'écrit (« Autre »).
  const named = options.length === 0 || !def || def.named === true || (def.unit === "u" && !def.choices?.length);
  return { key, kind: key.startsWith("fiche:") ? "choose" : "param", text: q.texte, unit, ...(options.length > 0 ? { options } : {}), ...(named ? { named: true } : {}) };
}

/** La valeur du référentiel d'un bouton : la sienne si elle en est une, sinon celle du choix nommé par son libellé ou ses mots. */
export function valeurDuReferentiel(def: { choices?: readonly { label: string; value: string }[]; textValues?: readonly { value: string; keywords: readonly string[] }[] }, b: { label: string; valeur: string }): string {
  const choices = def.choices ?? [];
  if (choices.length === 0 || choices.some((c) => c.value === b.valeur)) return b.valeur;
  const dit = ` ${normalizeText(`${b.valeur} ${b.label}`)} `;
  const parLibelle = choices.find((c) => normalizeText(c.label) === normalizeText(b.label) || normalizeText(c.label) === normalizeText(b.valeur));
  if (parLibelle) return parLibelle.value;
  // « 0,65 » ou « 0,65 mm » pour la valeur « 0.65 » : un seul nombre, jamais celui d'une fourchette (« 5,5 à 8 m »).
  const nombres = (t: string) => [...t.matchAll(/\d+(?:[.,]\d+)?/g)].map((m) => Number(m[0].replace(",", ".")));
  const seul = [nombres(b.valeur), nombres(b.label)].find((ns) => ns.length === 1)?.[0];
  const parNombre = seul === undefined ? [] : choices.filter((c) => /^\d+(?:\.\d+)?$/.test(c.value) && Number(c.value) === seul && nombres(c.label).length <= 1);
  if (parNombre.length === 1) return parNombre[0]!.value;
  const parMots = (def.textValues ?? []).find((t) => t.keywords.some((k) => dit.includes(` ${normalizeText(k)} `)) && choices.some((c) => c.value === t.value));
  if (parMots) return parMots.value;
  // Retour du fondateur (2026-10-13, « Je façonne (bobine) » refusé) : les mots PROPRES à un choix (« commande », « bobine »,
  // au singulier comme au pluriel) le désignent ; un mot commun à tous (« façonne ») ne départage rien.
  const mots = (t: string) => normalizeText(t).split(/[^a-z0-9]+/).filter((w) => w.length > 2).map((w) => w.replace(/(?<=..)[sx]$/, ""));
  const dits = new Set(mots(`${b.valeur.replace(/_/g, " ")} ${b.label}`));
  const propres = choices.map((c) => mots(c.label).filter((w) => !choices.some((o) => o !== c && mots(o.label).includes(w))));
  const scores = propres.map((ws) => ws.filter((w) => dits.has(w)).length);
  const meilleur = Math.max(...scores);
  if (meilleur > 0 && scores.filter((x) => x === meilleur).length === 1) return choices[scores.indexOf(meilleur)]!.value;
  // « Je façonne » seul : le choix dont tous les mots, hors parenthèse, sont dits.
  const entier = choices.filter((c) => {
    const coeur = mots(c.label.replace(/\(.*?\)/g, " "));
    return coeur.length > 0 && coeur.every((w) => dits.has(w));
  });
  return entier.length === 1 ? entier[0]!.value : b.valeur;
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

/** Temps deux : la clé de la question d'unité d'une ligne qui n'en a pas, et ses réponses (une case « Autre » pour le reste). */
export const UNITE_KEY = "unite:";
const UNITES: readonly { label: string; value: string }[] = [
  { label: "Pièces", value: "u" },
  { label: "Mètres", value: "m" },
  { label: "m²", value: "m2" },
  { label: "kg", value: "kg" },
  { label: "Litres", value: "l" },
];

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
  /** La fiche métier qui calcule (§52, format commun) ; absent : celle du métier du référentiel. Les tests la donnent. */
  fiche?: FicheMetier;
}): EcranDeLecture {
  const { ref, lecture } = input;
  const answers = input.answers ?? {};
  const lignes = lignesDeLecture(lecture, input.ids).map((l) => {
    const edited = input.lines?.get(l.id);
    const ligne = edited?.designation !== undefined ? { ...l, designation: edited.designation, quantity: edited.quantity ?? null, unit: edited.unit ?? null } : l;
    // Temps deux (§51.6) : l'unité répondue d'une ligne qui n'en avait pas (« unite:<ligne> ») devient la sienne.
    const unite = answers[`${UNITE_KEY}${l.id}`];
    if (typeof unite !== "string" || !unite.trim() || !ligne.fourniture || ligne.fourniture.unite) return ligne;
    return { ...ligne, unit: ligne.unit ?? unite.trim(), fourniture: { ...ligne.fourniture, unite: unite.trim() } };
  });
  // TEMPS TROIS, électricité (référentiel électricité §3, directive du fondateur, 2026-10-12) : une ligne de POINT (le
  // modèle nomme le point dans « ouvrage ») ne part pas telle qu'écrite ; le code la convertit en ce qu'elle contient et
  // additionne sur tout le devis (« Prises 9 + 9 + 6 : une ligne 24 »). Ces lignes sortent du calcul générique.
  // §52, FORMAT COMMUN (mission du fondateur, 2026-10-19) : un métier calculé par sa fiche suit le même chemin : une ligne
  // qui nomme un ouvrage de la fiche se convertit par ses ratios et ses conditionnements, additionnée sur le devis.
  const fiche = input.fiche ?? (ref.workItems.length === 0 ? ficheDeCalcul(ref.trade) : null);
  const ouvragesFiche = new Set((fiche?.ouvrages ?? []).map((o) => o.id));
  const estPoint = (l: (typeof lignes)[number]) => (fiche ? ouvragesFiche.has(l.fourniture?.ouvrage ?? "") : ref.trade === "electrical" && !!pointElectrique(l.fourniture?.ouvrage));
  const pointIds = new Set(lignes.filter((l) => estPoint(l) && nombre(l.fourniture?.quantite ?? l.quantity) !== null).map((l) => l.id));
  const generiques = () => lignes.filter((l) => !pointIds.has(l.id));
  const lignesPoint = lignes.filter((l) => pointIds.has(l.id));
  const points: ArticleElectrique[] = fiche
    ? fournituresDeFiche(
        fiche,
        lignesPoint.map((l) => ({ id: l.id, ref: l.ligne.ref, ouvrage: l.fourniture!.ouvrage!, quantite: nombre(l.fourniture!.quantite ?? l.quantity)!, attend: l.fourniture!.attend, donnees: l.fourniture!.donnees ?? {} })),
        answers,
      )
    : fournituresElectriques(lignesPoint.map((l) => ({ id: l.id, ref: l.ligne.ref, point: pointElectrique(l.fourniture!.ouvrage)!, quantite: nombre(l.fourniture!.quantite ?? l.quantity)!, attend: l.fourniture!.attend })));
  const plan = planDeLecture(ref, lecture, generiques(), input.extraFacts);
  const validation = validationDeLecture(ref.trade, generiques(), plan, new Set([...(input.lines ?? new Map())].filter(([, v]) => v.confirmed).map(([k]) => k)));
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
    const question = questionDeLecture(ref, plan, q, lignes);
    // L'habitude de l'entreprise (« je façonne », apprise sur deux chantiers) répond d'avance à la question du modèle :
    // elle ne se pose plus, la réponse est dite dans le calcul et reste modifiable d'un tap.
    const def = ref.workItems.flatMap((w) => w.params).find((p) => p.key === q.cle);
    const sp = scopedParam(question.key);
    const habit = def?.kind === "artisan_preference" ? (input.preferences?.params?.[`${q.cle}@${sp ? baseOf(sp.workItemId) : ""}`] ?? input.preferences?.params?.[q.cle]) : undefined;
    if (habit !== undefined && answers[question.key] === undefined) return [];
    return [{ q, key: question.key, question }];
  });
  // §51.3, §51.6 (retour du fondateur, 2026-10-12, D.2026.105 : « la teinte et la réf répondues n'apparaissent ni dans la
  // désignation ni dans la précision ») : le temps trois reçoit TOUTES les réponses du temps deux comme données écrites.
  // Une question de la deuxième vague (`fiche:<donnée>`, ouverte par la relecture) est dans la fiche, pas dans la
  // lecture : répondue, elle rejoint les questions posées, pour que sa réponse aille à sa ligne.
  for (const [key, v] of Object.entries(answers)) {
    if (!key.startsWith("fiche:") || v === undefined || v === null) continue;
    const cle = key.slice("fiche:".length);
    if (asked.some((a) => a.key === key || a.q.cle === cle)) continue;
    const d = lecture.fiche.donnees.find((x) => x.cle === cle);
    const donnee = (d?.libelle ?? cle.replace(/_/g, " ")).toLowerCase();
    const texte = d?.question ?? `${donnee.charAt(0).toUpperCase()}${donnee.slice(1)} ?`;
    const boutons = (d?.boutons ?? []).map((b) => ({ label: b.label, valeur: b.valeur }));
    const q: LectureQuestion = { cle, texte, boutons, unite: null, donnee, ligne: null };
    asked.push({ q, key, question: { key, kind: "choose", text: texte, ...(boutons.length > 0 ? { options: boutons.map((b) => ({ label: b.label, value: b.valeur })) } : {}), named: true } });
  }
  // Temps deux (directive du fondateur, 2026-10-12) : « Article ajouté à la main sans unité : orange avec question « unité ? »
  // (case avec unité), jamais vert sans unité (51.6). » Une fourniture reprise telle qu'écrite (aucun ouvrage du référentiel),
  // avec une quantité et sans unité, et dont le modèle ne demande rien : sa question d'unité, sur sa ligne.
  for (const [i, l] of lignes.entries()) {
    const f = l.fourniture;
    if (!f || f.ouvrage || f.unite || !f.quantite || f.attend.length > 0) continue;
    const cle = `unite_${l.id.replace(/[^a-z0-9_]/gi, "_").toLowerCase()}`;
    const key = `${UNITE_KEY}${l.id}`;
    // Une copie : la lecture reçue n'est jamais modifiée.
    lignes[i] = { ...l, fourniture: { ...f, attend: [cle] } };
    const text = `${f.nom} : quelle unité ?`;
    asked.push({ q: { cle, texte: text, boutons: UNITES.map((u) => ({ label: u.label, valeur: u.value })), unite: null, donnee: "unité", ligne: l.ligne.ref }, key, question: { key, kind: "choose", text, options: UNITES.map((u) => ({ ...u })), named: true } });
  }
  // §51.6 avec une fiche : une fourniture qui attend une question de la fiche (une condition de ratio que ni le devis ni
  // l'artisan n'ont tranchée) a sa question, même si le modèle ne l'a pas posée ; tout orange a sa question.
  if (fiche) {
    const posees = new Set(asked.map((a) => a.q.cle));
    for (const q of questionsDeFiche(fiche, points as ArticleFiche[], posees)) {
      const key = `fiche:${q.cle}`;
      const lq: LectureQuestion = { cle: q.cle, texte: q.texte, boutons: q.boutons, unite: null, donnee: q.cle.replace(/_/g, " "), ligne: null };
      asked.push({ q: lq, key, question: { key, kind: "choose", text: q.texte, options: q.boutons.map((b) => ({ label: b.label, value: b.valeur })), named: true } });
    }
  }
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
  // §51.6 : une question laissée sans réponse (« je ne sais pas », null) reste ouverte sur sa ligne, orange, jusqu'à la réponse.
  const repondu = (key: string) => answers[key] !== undefined && answers[key] !== null;
  const answered = (a: Asked) => repondu(a.key) || (scopedParam(a.key) !== null && repondu(`param:${a.q.cle}`));
  // À l'ouverture, toutes les questions du modèle ; une fois qu'on répond, seules celles qu'une fourniture ou le calcul attend encore
  // (le nombre d'arêtiers ne sert plus quand l'arêtier est en zinc).
  // Encore utile : le calcul la demande, ou la donnée manque encore à un article (« dév. ? ») ; un modèle choisi peut rendre
  // une question sans objet (le recouvrement d'une tuile à blocage).
  const needed = (a: Asked) => fallback.some((q) => q.key === a.key || scopedParam(q.key)?.name === a.q.cle || q.key === `param:${a.q.cle}`);
  // Une question qu'attend une fourniture des points (la teinte, la gamme) reste : le calcul générique ne la voit pas.
  const attendPoints = new Set(points.flatMap((p) => p.attend));
  const live = asked.filter((a) => !hasAnswers || a.key.startsWith("fiche:") || a.key.startsWith("product:") || a.key.startsWith(UNITE_KEY) || attendPoints.has(a.q.cle) || needed(a) || answers[a.key] === null);
  const questions = live.filter((a) => !answered(a)).map((a) => a.question);
  const viewLines = generiques().map((l) => ({ id: l.id, designation: l.designation, quantity: l.quantity, unit: l.unit, confirmed: input.lines?.get(l.id)?.confirmed ?? false, enteredByArtisan: input.lines?.get(l.id)?.enteredByArtisan ?? false }));
  const view = artisanView(viewLines, validation, { needs: engine.needs, questions, declined: engine.declined }, { plan, roles: roleOf, ref });
  const raw = purchaseView(view, { ...engine, questions }, { plan, roles: roleOf, ref, validation });
  const purchase = finishPurchase(raw, { ref, plan, lignes, asked: live, posees: asked, answers, validated: input.validated, interdits: input.interdits !== false, customProducts: engine.customProducts, engine: [...engine.needs, ...(engine.unknowns ?? [])], precisionWaits, answers_: answers, notes: lecture.notes, points });
  // Une question close sans réponse (null) qu'aucune ligne n'attend (le calcul a sa valeur par défaut) ne bloque pas l'envoi :
  // elle n'a plus de ligne orange où se régler. Celle qu'une ligne attend reste, avec ses boutons sur la ligne (§51.6).
  const waited = new Set(purchase.toBuy.flatMap((b) => b.waitsOn ?? []));
  const kept = purchase.questions.filter((d) => !(d.question && answers[d.question.key] === null && !waited.has(d.question.key)));
  const canValidate = purchase.toBuy.length + purchase.toQuote.length > 0 && kept.every((q) => q.lineIds.length === 0 && !q.question) && purchase.toBuy.every((b) => b.state === "ready");
  const final = kept.length === purchase.questions.length ? purchase : { ...purchase, questions: kept, canValidate };
  const sansFourniture = lignes.filter((l) => !l.fourniture).map((l) => ({ lineId: l.id, label: l.designation.trim(), measure: [l.quantity?.trim(), l.unit?.trim()].filter(Boolean).join(" ") || null }));
  return { plan, validation, roles, view, purchase: final, questions, lignes, sansFourniture };
}

interface Asked {
  q: LectureQuestion;
  key: string;
  question: Question;
}

/**
 * La précision d'une ligne, sans doublon ni ce que la désignation dit déjà : chaque morceau (séparé par « ; ») une fois ;
 * « épaisseur : au choix du fournisseur » tombe quand l'épaisseur est écrite dans le nom (« 0,65 mm »), et une donnée
 * citée plusieurs fois dans « épaisseur, développé : au choix… » ne garde que celles qui manquent au nom.
 */
export function precisionPropre(precision: string, label: string): string {
  const vus = new Set<string>();
  const morceaux: string[] = [];
  // Les données laissées au fournisseur, réunies en un seul morceau, chacune une fois (à la place du premier).
  const sujets: string[] = [];
  let place = -1;
  for (const brut of precision.split(/\s*;\s*/)) {
    const m = brut.trim().replace(/[.;,]+$/, "");
    if (!m) continue;
    const choix = /^(.+?)\s*(?::\s*au choix du fournisseur|au choix du fournisseur|à voir avec le fournisseur)$/i.exec(m);
    if (choix) {
      for (const t of choix[1]!.split(/\s*(?:,|\bet\b)\s*/).map((x) => x.trim())) {
        if (t && !ecritDans(t, label) && !sujets.some((x) => normalizeText(x) === normalizeText(t))) sujets.push(t);
      }
      if (place < 0) place = morceaux.length;
      continue;
    }
    const cle = normalizeText(m);
    if (vus.has(cle)) continue;
    vus.add(cle);
    // Une réponse « Teinte : bleu-noir » quand la désignation dit déjà « bleu-noir » n'apporte rien (§51.6).
    // Une valeur que le nom donne comme un choix encore ouvert (« acier galvanisé ou zinc ») reste : la réponse le tranche.
    const reponse = normalizeText(/^[^:]{2,40}\s:\s(.+)$/.exec(m)?.[1] ?? m);
    const nom = normalizeText(label);
    if (reponse && nom.includes(reponse) && !nom.includes(`${reponse} ou `) && !nom.includes(` ou ${reponse}`)) continue;
    morceaux.push(m);
  }
  if (sujets.length > 0) morceaux.splice(place < 0 ? morceaux.length : place, 0, `${sujets.join(", ")} : au choix du fournisseur`);
  return morceaux.join(" ; ");
}

/** Les boutons d'une donnée « à préciser » : les choix du référentiel quand l'ouvrage de la ligne a cette donnée (sa teinte, sa matière). */
function choixDuReferentiel(ref: Referential, workItemId: string | undefined, sujets: readonly string[]): { label: string; value: string }[] {
  const work = workItemId ? ref.workItems.find((w) => w.id === baseOf(workItemId)) : undefined;
  if (!work || sujets.length !== 1) return [];
  const sujet = normalizeText(sujets[0]!);
  const def = work.params.find((p) => (p.choices?.length ?? 0) > 0 && normalizeText(p.label).includes(sujet));
  return (def?.choices ?? []).map((c) => ({ label: c.label, value: c.label }));
}

/**
 * Une donnée « à préciser » déjà écrite dans le nom de la ligne : une mesure (épaisseur, diamètre, largeur, longueur,
 * développé) quand le nom porte un nombre avec son unité (« 0,65 mm », « Ø80 »), ou le mot lui-même (« teinte gris »).
 */
function ecritDans(sujet: string, nom: string): boolean {
  const s = normalizeText(sujet);
  const n = normalizeText(nom);
  // Chaque mesure a sa façon de s'écrire dans un nom : l'épaisseur « 0,65 mm », le développé « dév. 25 », le Ø « Ø80 ».
  const ecrite: [RegExp, RegExp][] = [
    [/epaisseur/, /\b\d+[.,]\d+\s*mm\b|epaisseur/],
    [/developpe/, /\bdev\.?\s*\d|developpe/],
    [/diametre/, /(?:ø|⌀)\s?\d|\bdiam/],
    [/largeur/, /largeur|\d+\s*x\s*\d+/],
    [/longueur/, /longueur|\d+\s*x\s*\d+|\b\d+(?:[.,]\d+)?\s*m\b/],
    [/dimension|format|section/, /\d+\s*x\s*\d+/],
  ];
  const mesure = ecrite.find(([sujetRe]) => sujetRe.test(s));
  if (mesure) return mesure[1].test(n);
  return s.length > 3 && n.includes(s);
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
    /** Toutes les questions posées (les deux vagues), répondues comprises, même celles que le calcul n'attend plus. */
    posees: readonly Asked[];
    answers: Answers;
    validated: ReadonlySet<string> | undefined;
    interdits: boolean;
    customProducts: Readonly<Record<string, string>>;
    engine: readonly { needId: string; workItemId: string; slot: string; unknownParams?: readonly string[]; trace?: readonly { label: string; value: string }[] }[];
    /** La donnée d'article que le calcul strict attend encore, par besoin (« ouvrage/besoin » → clé de la donnée). */
    precisionWaits: ReadonlyMap<string, string>;
    answers_: Answers;
    notes: readonly string[];
    /** Temps trois, électricité : les fournitures des lignes de point, additionnées sur le devis (§3 du référentiel électricité). */
    points: readonly ArticleElectrique[];
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
    const a = ctx.posees.find((x) => x.q.cle === cle);
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
      // §51.6 : un article que le calcul tire d'une ligne (la bobine des bacs) porte aussi les réponses de cette ligne.
      const source = item.lineIds.map((id) => byLine.get(id)).find((l): l is LigneLecture => !!l?.fourniture);
      const nomCalcule = item.label.replace(/\s*(?:d[ée]v\.\s*)?\S*\?\S*/g, "").replace(/\s{2,}/g, " ").trim() || item.label;
      const lues = source ? reponsesDeLaLigne(ctx.posees, ctx.answers, source, source.fourniture!, lignes).filter((r) => source.fourniture!.aPreciser.some((t) => tranche(r.a, t)) && !normalizeText(`${nomCalcule} ${item.precision ?? ""}`).includes(normalizeText(r.valeur))).map((r) => reponseLue(r.a.q.donnee, r.valeur)) : [];
      return {
        ...item,
        ...(lues.length > 0 ? { precision: [item.precision, ...new Set(lues)].filter(Boolean).join("; ") } : {}),
        label: nomCalcule,
        ...(pending.length > 0 ? { waitsOn: pending, asks: waits.map((a) => ({ key: a.key, text: a.question.text.replace(/\s*\?$/, ""), unit: a.question.unit ?? null, options: a.question.options ?? [] })) } : {}),
      };
    }
    const estimated = (item.rules ?? []).some((r) => r.key.startsWith("estimation:"));
    const strictWaits = ctx.engine.filter((n) => item.needIds.includes(n.needId)).map((n) => ctx.precisionWaits.get(`${n.workItemId}/${n.needId}`)).filter((c): c is string => !!c);
    const assumed = asked.filter((a) => a.q.ligne === null && unresolved(a) && item.assumptionKeys.includes(`param:${a.q.cle}`)).map((a) => a.q.cle);
    // Retour du fondateur (2026-10-12) : « Crochets de gouttière ? dév. ? » ne sort jamais vert ; une donnée restée en « ? »
    // dans l'article calculé attend la question du modèle sur cette donnée, comme la ligne qui l'écrit (§49.2).
    const blanked = /\?/.test(item.label) ? ctx.engine.filter((n) => item.needIds.includes(n.needId)).flatMap((n) => n.unknownParams ?? []) : [];
    const waits = estimated ? [] : [...new Set([...f.attend, ...strictWaits, ...assumed, ...blanked])].map((cle) => open(cle, line.ligne.ref)).filter((a): a is Asked => !!a);
    // Une quantité calculée n'attend que les questions du modèle ; une quantité encore vide attend aussi sa donnée du calcul.
    const pending = [...new Set([...(item.quantity === null ? (item.waitsOn ?? []) : []), ...waits.map((a) => a.key)])];
    // Retours du fondateur (2026-10-12, §51.6) : « l'orange ne vient que d'une question sans réponse ou retirée », « tout
    // orange a sa question, et elle se règle là où on ouvre la ligne ». Ce qui reste « à préciser » (finition, profil,
    // teinte) est UNE question sur la ligne (`a-preciser:<ligne>`) : ses boutons (ceux du référentiel quand l'ouvrage a la
    // donnée), « Au choix du fournisseur » et « Autre » ; une donnée déjà écrite dans le nom de la ligne (l'épaisseur de
    // « Bobine Quartz-Zinc 0,65 mm ») ou déjà répondue n'est jamais « à préciser ».
    const preciserKey = `a-preciser:${line.id}`;
    // LA CAUSE COMMUNE (retour du fondateur, 2026-10-12 : « Teinte à préciser » après la teinte répondue sur D.2026.105,
    // « Finition à préciser », « Épaisseur à préciser ») : les réponses de la ligne sont celles de TOUTES les questions
    // posées, des deux vagues, même celles que le calcul n'attend plus ; chacune ferme le sujet « à préciser » qu'elle
    // tranche et s'écrit dans la ligne.
    const reponses = reponsesDeLaLigne(ctx.posees, ctx.answers, line, f, lignes);
    const fournisseur = ctx.answers[preciserKey] === undefined ? f.aPreciser.filter((t) => !ecritDans(t, `${item.label} ${f.nom}`) && !reponses.some((r) => tranche(r.a, t))) : [];
    const preciserAsk = fournisseur.length > 0 ? { key: preciserKey, text: raisonCourte(fournisseur).replace(/ à préciser$/, ""), unit: null, options: [...choixDuReferentiel(ctx.ref, workOfLine(line.id)?.workItemId, fournisseur), { label: "Au choix du fournisseur", value: "ok" }] } : null;
    const subjects = [...waits.map((a) => a.q.donnee), ...fournisseur];
    // Ce que l'artisan a répondu pour cette ligne : la réponse du calcul (« Espagne 1er choix ») avec le nom, celle d'une
    // question de la fiche avec sa question (« Marque des ardoises : Cupa »), pour le comptoir.
    const isFiche = (cle: string) => ctx.posees.find((a) => a.q.cle === cle)?.key.startsWith("fiche:") === true;
    const said = f.attend.filter((cle) => !isFiche(cle)).map(answered).filter((v): v is string => !!v);
    const saidFiche = f.attend.filter(isFiche).map((cle) => {
      const v = answered(cle);
      // Retour du fondateur (2026-10-12) : « Ce document sert au négoce, ça ne sert à rien qu'il voie les questions que tu
      // m'as posées. » Jamais le texte de la question : le nom court de la donnée et la réponse (« Matière : zinc »).
      // Une donnée qui nomme déjà l'article ou qui est une question (« Fenêtre de toit : quelle taille ») : la valeur suffit.
      return v ? reponseLue(ctx.posees.find((a) => a.q.cle === cle)!.q.donnee, v) : null;
    }).filter((v): v is string => !!v);
    // Ce que l'artisan écrit pour une ligne « à préciser » (« Profil 1000 T, RAL 7016 ») part dans sa précision.
    const ecrit = ctx.answers[`a-preciser:${line.id}`];
    const choisis = f.aPreciser.filter((t) => !ecritDans(t, `${item.label} ${f.nom}`) && !reponses.some((r) => tranche(r.a, t)));
    const choisi = choisis.length > 0 && ecrit === "ok" ? `${raisonCourte(choisis).replace(/ à préciser$/, "")} au choix du fournisseur` : null;
    const precise = typeof ecrit === "string" && ecrit !== "ok" && ecrit !== "non" ? ecrit : choisi;
    const precision = [f.precision, ...said].filter(Boolean).join(", ");
    // Chaque réponse se lit dans sa ligne (§51.6) : celles que la ligne n'attendait pas nommément (la deuxième vague, une
    // question sur sa ligne), « Teinte : rouge vieilli », sauf si le nom ou la précision la disent déjà.
    const deja = normalizeText(`${item.label} ${f.nom} ${precision} ${saidFiche.join(" ")}`);
    const lues = reponses.filter((r) => !f.attend.includes(r.a.q.cle) && !deja.includes(normalizeText(r.valeur))).map((r) => reponseLue(r.a.q.donnee, r.valeur));
    // Ce que la ligne attend se dit par la question du modèle, jamais deux fois : les règles « manque » du calcul tombent.
    const kept = (item.rules ?? []).filter((r) => !r.key.startsWith("manque:"));
    const rules = kept;
    const state = item.state;
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
      ...(item.precision || precision || saidFiche.length || precise || lues.length ? { precision: [...new Set([item.precision || precision, precise, ...saidFiche, ...lues])].filter(Boolean).join("; ") } : {}),
      ...(pending.length > 0 || preciserAsk
        ? {
            waitsOn: [...pending, ...(preciserAsk ? [preciserAsk.key] : [])],
            asks: [...waits.map((a) => ({ key: a.key, text: a.question.text.replace(/\s*\?$/, ""), unit: a.question.unit ?? null, options: a.question.options ?? [] })), ...(preciserAsk ? [preciserAsk] : [])],
          }
        : {}),
      ...(rules?.length ? { rules } : {}),
    };
  });
  // Temps trois, électricité : une ligne par fourniture des points, la trace des lignes du devis dans sa précision ;
  // l'appareillage attend la teinte (§5), orange jusqu'à la réponse, puis vert.
  for (const a of ctx.points) {
    const waits = a.attend.map((cle) => open(cle)).filter((x): x is Asked => !!x);
    const said = a.attend.map((cle) => {
      const v = answered(cle);
      const q = asked.find((x) => x.q.cle === cle);
      return v && q ? reponseLue(q.q.donnee, v) : null;
    }).filter((v): v is string => !!v);
    if (waits.length > 0) reasons.set(a.key, raisonCourte(waits.map((w) => w.q.donnee)));
    toBuy.push({
      key: a.key,
      label: a.label,
      quantity: a.quantite,
      order: a.order,
      approx: a.approx,
      precision: [a.precision, ...said].join("; "),
      kind: "computed",
      needIds: [],
      lineIds: a.lineIds,
      state: "ready",
      assumptionKeys: [],
      ...(waits.length > 0 ? { waitsOn: waits.map((w) => w.key), asks: waits.map((w) => ({ key: w.key, text: w.question.text.replace(/\s*\?$/, ""), unit: w.question.unit ?? null, options: w.question.options ?? [] })) } : {}),
    });
  }
  // Les décisions de la liste qui ne sont pas des questions du calcul (la quantité d'un modèle écrit par l'artisan) restent.
  for (const d of raw.questions) if (!/^(engine:|role:|comptoir:|precise:|a-preciser:[^:]+:\d+$)/.test(d.key) && !d.question && ctx.answers[d.key] === undefined) decisions.push(d);
  // Les questions du modèle, chacune une décision de l'écran (une ligne que le fournisseur précisera n'en est pas une, §51.6).
  for (const a of asked) {
    // Une question close sans réponse reste une décision de l'écran (elle se rouvre dans sa carte, §49.8).
    if (isAnswered(a) && ctx.answers[a.key] !== null) continue;
    const lineIds = lignes.filter((l) => l.fourniture?.attend.includes(a.q.cle) || l.cites.some((c) => c.attend.includes(a.q.cle))).map((l) => l.id);
    // §51.6 : la question se règle par ses boutons (ou sa case), jamais par un « C'est bon » : pas d'action principale.
    decisions.push({ key: `engine:${a.key}`, state: "missing", title: a.q.texte.replace(/\s*\?$/, ""), text: a.q.texte, lineIds, primary: null, secondary: [], question: a.question });
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
    // Une décision qui vise la ligne (doublon : « garder les deux ? », « à préciser ») la met orange, avec son geste (§49.1, §49.8).
    const lineDecision = decisions.find((d) => !d.question && d.lineIds.some((id) => item.lineIds.includes(id)));
    const check = item.state === "to_confirm" || (item.waitsOn ?? []).length > 0 || lineDecision !== undefined;
    const decision = waits[0] ?? lineDecision;
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
  // Retour du fondateur (2026-10-12) : « une précision ne s'écrit que si elle apporte une info absente de la désignation ;
  // jamais de doublon » (« épaisseur : au choix du fournisseur » deux fois, alors que « 0,65 mm » est dans le nom).
  const toBuyPropre = finished.toBuy.map((b) => {
    if (!b.precision) return b;
    const propre = precisionPropre(b.precision, b.label);
    if (propre === b.precision) return b;
    const { precision: _p, ...rest } = b;
    return propre ? { ...rest, precision: propre } : rest;
  });
  return { ...finished, toBuy: toBuyPropre, warnings: [...new Set([...finished.warnings, ...ctx.notes])], screen: { ...finished.screen, groups: finished.screen.groups.map((g) => ({ ...g, rows: g.rows.map((r) => (r.status === "check" && r.itemKey && reasons.has(r.itemKey) ? { ...r, reason: reasons.get(r.itemKey)! } : r)) })) } };
}

/**
 * Une réponse telle que le négoce la lit (retour du fondateur, 2026-10-12 : « Ce document sert au négoce, ça ne sert à rien
 * qu'il voie les questions que tu m'as posées ») : le nom court de la donnée et la valeur (« Matière de la descente :
 * zinc »), jamais le texte de la question ; une donnée qui nomme l'article ou qui est une question : la valeur seule.
 */
export function reponseLue(donnee: string, valeur: string): string {
  const d = donnee.trim();
  return d && !/\s:\s|\?|\b(tu|ta|ton|tes|te|toi)\b/i.test(d) ? `${d.charAt(0).toUpperCase()}${d.slice(1)} : ${valeur}` : valeur;
}

/** Les mots qui portent une donnée (« teinte », « référence »), sans les mots creux ; « référence » vaut « modèle ». */
const MOTS_CREUX = new Set(["pour", "avec", "dans", "sans", "quel", "quelle", "quels", "quelles", "votre", "cette", "est", "les", "des", "une", "aux", "sur", "type", "choix", "preciser"]);
const SYNONYMES: Record<string, string> = { reference: "modele", ref: "modele", marque: "modele", gamme: "modele", couleur: "teinte", coloris: "teinte", ral: "teinte" };
function motsDeDonnee(t: string): string[] {
  return normalizeText(t)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !MOTS_CREUX.has(w))
    .map((w) => SYNONYMES[w] ?? w.replace(/s$/, ""));
}

/** La question répondue tranche-t-elle ce sujet « à préciser » (« teinte » ↔ « Teinte et référence de la tuile ») ? */
function tranche(a: Asked, sujet: string): boolean {
  const dit = new Set(motsDeDonnee(`${a.q.donnee} ${a.q.texte}`));
  return motsDeDonnee(sujet).some((w) => dit.has(w));
}

/**
 * Les réponses d'une ligne (§51.3, §51.6) : chaque question posée et répondue (les deux vagues) qui la vise : celle que
 * sa fourniture attend, celle posée sur sa ligne, ou celle du chantier qui tranche un de ses sujets « à préciser » et
 * nomme la fourniture (ou dont aucune autre ligne n'a le sujet). Retirée (null) ou sans réponse : pas une réponse.
 */
function reponsesDeLaLigne(posees: readonly Asked[], answers: Answers, line: LigneLecture, f: LectureFourniture, lignes: readonly LigneLecture[]): { a: Asked; valeur: string }[] {
  const nom = new Set(motsDeDonnee(f.nom));
  const out: { a: Asked; valeur: string }[] = [];
  for (const a of posees) {
    const v = answers[a.key] ?? (scopedParam(a.key) !== null ? answers[`param:${a.q.cle}`] : undefined);
    if (v === undefined || v === null) continue;
    const brut = typeof v === "string" ? v : `${v.value}${v.unit && v.unit !== "u" ? ` ${v.unit}` : ""}`;
    const valeur = a.q.boutons.find((b) => b.valeur === brut)?.label ?? brut;
    if (!valeur || valeur === "ok") continue;
    const surLaLigne = a.q.ligne !== null && (a.q.ligne === line.ligne.ref || line.ligne.ref.startsWith(`${a.q.ligne}.`));
    if (f.attend.includes(a.q.cle) || (surLaLigne && (f.aPreciser.some((t) => tranche(a, t)) || !lignes.some((l) => l.id !== line.id && l.ligne.ref === line.ligne.ref && l.fourniture)))) {
      out.push({ a, valeur });
      continue;
    }
    if (a.q.ligne !== null && !surLaLigne) continue;
    const sujets = f.aPreciser.filter((t) => tranche(a, t));
    if (sujets.length === 0) continue;
    const nomme = motsDeDonnee(`${a.q.donnee} ${a.q.texte}`).some((w) => nom.has(w));
    const seule = !lignes.some((l) => l.id !== line.id && l.fourniture && l.fourniture.aPreciser.some((t) => tranche(a, t)));
    if (surLaLigne || nomme || seule) out.push({ a, valeur });
  }
  return out;
}

/** Un nombre écrit (« 151 », « 1 472,5 »), ou null. */
function nombre(v: string | null | undefined): number | null {
  const n = Number((v ?? "").replace(/[\s\u00a0\u202f]/g, "").replace(",", "."));
  return v && Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Une lecture SANS modèle (lignes d'un partenaire §38, ancien quantitatif sans lecture enregistrée) : chaque ligne est la
 * fourniture telle qu'écrite, sans ouvrage ni calcul ; une unité en heures, forfait ou jour n'est jamais une fourniture
 * (§49.9). Aucun mot n'est cherché dans la ligne.
 */
export function lectureDepuisLignes(lines: readonly { id: string; designation: string; quantity: string | null; unit: string | null }[]): LectureDevis {
  return {
    metier: null,
    lots: [],
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
