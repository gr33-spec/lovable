import { Decimal } from "../shared/decimal.js";
import { parseUnit, type UnitCode } from "../quantity/unit.js";
import type { ChantierContext, SiteFact } from "../referential/context.js";
import type { CompanyPreferences, EngineOptions, ParamValue, Question, WorkItemInput } from "../referential/engine.js";
import { ficheFacts, parseFiche, type FicheChantier } from "../referential/fiche.js";
import type { LineRole, RoleProposal } from "../referential/line-roles.js";
import { baseOf, INSTANCE_SEP, type Referential, type Slot, type WorkItemType } from "../referential/model.js";
import { readDimension, type LinePlan, type QuotePlan } from "../referential/plan.js";
import { parseRefUnit, sameDim } from "../referential/units.js";
import type { LineValidation, TakeoffValidation } from "../takeoff/validation.js";
import { artisanView, computeWithAnswers, slotsGivenByQuote, scopedKey, type ArtisanView, type Decision, type EngineAnswer } from "../trust/artisan-view.js";
import { applyRuleConfirmations, purchaseView, type PurchaseItem, type PurchaseView, type ScreenRow } from "../trust/purchase-view.js";
import { applyOrangeFlags } from "../trust/orange.js";
import { forbiddenFlags } from "../trust/forbidden.js";
import { withShortReasons } from "../trust/short-reason.js";
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
    fiche: parseFiche(o.fiche) ?? { donnees: [] },
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
      out.push({ id, ligne, fourniture: null, designation: ligne.designation, quantity: ligne.quantite, unit: ligne.unite });
      continue;
    }
    ligne.fournitures.forEach((f, i) => {
      const key = ligne.fournitures.length === 1 ? ligne.ref : `${ligne.ref}.${i + 1}`;
      const id = ids?.get(key) ?? key;
      out.push({ id, ligne, fourniture: f, designation: f.nom, quantity: f.quantite ?? ligne.quantite, unit: f.unite ?? ligne.unite });
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

/**
 * Le plan du calcul à partir de la lecture : chaque fourniture rattachée à son ouvrage et son emplacement, ses données
 * en faits du chantier, un ouvrage écrit sur plusieurs lignes pris ligne par ligne (une instance par ligne, §48.6).
 * Aucune règle de mots : l'ouvrage, l'emplacement et les données viennent du modèle, qui a lu le devis entier.
 */
export function planDeLecture(ref: Referential, lecture: LectureDevis, lignes: readonly LigneLecture[], extraFacts: readonly SiteFact[] = []): QuotePlan {
  const refsByWork = new Map<string, Set<string>>();
  for (const l of lignes) {
    const w = workOf(ref, l.fourniture?.ouvrage ?? null);
    if (w) refsByWork.set(w.id, new Set([...(refsByWork.get(w.id) ?? []), l.ligne.ref]));
  }
  const idFor = (w: WorkItemType, lineRef: string) => ((refsByWork.get(w.id)?.size ?? 0) >= 2 || w.perLine ? `${w.id}${INSTANCE_SEP}${lineRef}` : w.id);
  const facts: SiteFact[] = [...ficheFacts(ref, lecture.fiche), ...extraFacts];
  const plans: LinePlan[] = [];
  const inputs = new Map<string, WorkItemInput>();
  for (const l of lignes) {
    const f = l.fourniture;
    if (!f) {
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
    const input = inputs.get(wid) ?? { workItemId: wid, params: {}, products: {}, mentioned: [], ...(wid.includes(INSTANCE_SEP) ? { label: f.nom } : {}) };
    if (!input.mentioned.includes(slot.key)) input.mentioned.push(slot.key);
    // La quantité de la ligne mesure l'ouvrage quand une donnée de l'ouvrage se lit dans la quantité (17,40 m de gouttière,
    // 4 fenêtres) : une longueur ou une surface, ou le nombre d'un emplacement qui compte l'ouvrage (`measureOnly`). Un
    // nombre de pièces sur un autre emplacement (4 raccords) est la quantité à commander, telle qu'écrite.
    const unit = l.unit ? parseUnit(l.unit) : null;
    const refUnit = unit ? LINE_UNITS[unit] : undefined;
    let measures = false;
    if (refUnit && l.quantity && (refUnit !== "u" || slot.measureOnly)) {
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
        facts.push({ key: p.key, value: new Decimal(qty).toFixed(), unit: refUnit, evidence: `Devis, ${l.id}`, origin: "devis", workItemId: wid, ...(slot.measureOnly ? { fromMeasureLine: true as const } : {}) });
      }
    }
    // Les données écrites sur la ligne, telles que le modèle les a lues (« taille_fenetre » : « 114x118 »).
    for (const [key, raw] of Object.entries(f.donnees)) {
      const def = work.params.find((p) => p.key === key);
      if (!def) continue;
      const found = readValue(def, raw);
      if (!found) continue;
      const value: ParamValue = { value: found.value, unit: found.unit, origin: "devis", evidence: `Devis, ${l.id} (« ${raw} »)` };
      input.params[key] = value;
      if (!facts.some((x) => x.key === key && x.workItemId === wid)) facts.push({ key, value: found.value, unit: found.unit, evidence: value.evidence!, origin: "devis", workItemId: wid });
    }
    inputs.set(wid, input);
    plans.push({ ref: l.id, status: "planned", workItemId: wid, slot: slot.key, mentions: [], characteristics: [], ...(measures ? { measures: true as const } : {}) });
  }
  // Les faits du chantier (fiche, réponses, code postal) complètent chaque ouvrage, sans écraser ce que sa ligne écrit.
  const context: ChantierContext = { facts };
  for (const input of inputs.values()) {
    const work = ref.workItems.find((w) => w.id === baseOf(input.workItemId))!;
    for (const p of work.params) {
      if (input.params[p.key]) continue;
      const own = facts.find((x) => x.key === p.key && x.workItemId === input.workItemId) ?? facts.find((x) => x.key === p.key && !x.workItemId);
      if (!own) continue;
      let ok = false;
      try {
        ok = sameDim(parseRefUnit(own.unit).dim, parseRefUnit(p.unit).dim);
      } catch {
        ok = false;
      }
      if (ok) input.params[p.key] = { value: own.value, unit: own.unit, origin: own.origin === "artisan" ? "artisan" : "devis", evidence: own.evidence };
    }
  }
  return { lines: plans, inputs: [...inputs.values()], context, characteristicsBySlot: {}, conflicts: [], contradictions: [] };
}

/** La clé de réponse d'une question de la lecture : celle de la donnée du référentiel (par pièce quand elle vise une ligne), sinon « fiche:<clé> ». */
export function cleDeQuestion(ref: Referential, plan: QuotePlan, q: LectureQuestion): string {
  const def = ref.workItems.flatMap((w) => w.params).find((p) => p.key === q.cle);
  if (!def) return `fiche:${q.cle}`;
  if (q.ligne) {
    const instance = plan.lines.find((l) => l.status === "planned" && (l.ref === q.ligne || l.ref.startsWith(`${q.ligne}.`)) && ref.workItems.find((w) => w.id === baseOf(l.workItemId))?.params.some((p) => p.key === q.cle));
    if (instance?.status === "planned" && instance.workItemId.includes(INSTANCE_SEP)) return scopedKey(q.cle, instance.workItemId);
  }
  return `param:${q.cle}`;
}

/** La question du calcul (boutons, unité) telle que l'écran la pose : celle du modèle, mot pour mot. */
export function questionDeLecture(ref: Referential, plan: QuotePlan, q: LectureQuestion): Question {
  const key = cleDeQuestion(ref, plan, q);
  const def = ref.workItems.flatMap((w) => w.params).find((p) => p.key === q.cle);
  const options = q.boutons.map((b) => ({ label: b.label, value: b.valeur }));
  const unit = q.unite ?? def?.unit ?? "u";
  // Une question sans boutons, ou dont la donnée se nomme (une teinte, un profil) : la réponse s'écrit (« Autre »).
  const named = options.length === 0 || !def || (def.unit === "u" && !def.choices?.length);
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
function validationDeLecture(trade: string, lignes: readonly LigneLecture[], plan: QuotePlan): TakeoffValidation {
  const lines: LineValidation[] = lignes.map((l) => {
    if (!l.fourniture) return { lineId: l.id, kind: "labor", family: null, familyLabel: null, unit: null, quantity: null, basis: "purchase", status: "certain", issues: [] };
    const planned = plan.lines.find((p) => p.ref === l.id);
    const unit: UnitCode | null = l.unit ? parseUnit(l.unit) : null;
    let quantity: Decimal | null = null;
    try {
      quantity = l.quantity ? new Decimal(l.quantity.replace(/\s/g, "").replace(",", ".")) : null;
    } catch {
      quantity = null;
    }
    const measures = planned?.status === "planned" && planned.measures === true;
    return { lineId: l.id, kind: "material", family: null, familyLabel: null, unit, quantity, basis: measures ? "work" : "purchase", status: "certain", issues: [] };
  });
  const labor = lines.filter((l) => l.kind === "labor").length;
  return { trade, lines, issues: [], counts: { certain: lines.length - labor, probable: 0, toVerify: 0, labor, blocking: 0 } };
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
  /** §47.4 : les règles « à vérifier » déjà validées par trois entreprises (vertes partout). */
  validated?: ReadonlySet<string>;
}): EcranDeLecture {
  const { ref, lecture } = input;
  const answers = input.answers ?? {};
  const lignes = lignesDeLecture(lecture, input.ids).map((l) => {
    const edited = input.lines?.get(l.id);
    return edited?.designation !== undefined ? { ...l, designation: edited.designation, quantity: edited.quantity ?? null, unit: edited.unit ?? null } : l;
  });
  const plan = planDeLecture(ref, lecture, lignes, input.extraFacts);
  const validation = validationDeLecture(ref.trade, lignes, plan);
  const roles = new Map<string, RoleProposal>();
  for (const l of lignes) {
    if (!l.fourniture) continue;
    const planned = plan.lines.find((p) => p.ref === l.id);
    const measures = planned?.status === "planned" && planned.measures === true;
    roles.set(l.id, measures ? { role: "measure", why: "La quantité mesure l'ouvrage ; ce qui se commande en découle." } : { role: "purchase", why: "L'article se commande tel qu'écrit." });
  }
  const roleOf = new Map<string, LineRole>([...roles].map(([k, v]) => [k, v.role]));
  const given = slotsGivenByQuote(plan, validation);
  // Le calcul compte ; une donnée qui ne change que la désignation (le développé, la pose des crochets) ne l'arrête pas :
  // le modèle nomme la fourniture, et demande lui-même ce qui manque (§51.2).
  const options: EngineOptions = { ...(input.options ?? {}), quantityOnly: true, blankUnknown: true };
  const engine = plan.inputs.length > 0 ? computeWithAnswers(ref, plan, answers, input.preferences ?? {}, options, given) : { needs: [], questions: [], declined: [], checks: [], unknowns: [], customProducts: {} };
  // §51.2 : les questions sont celles du modèle, et seulement elles (le moteur ne demande rien de lui-même).
  const asked: Asked[] = lecture.questions.map((q) => {
    const question = questionDeLecture(ref, plan, q);
    return { q, key: question.key, question };
  });
  const questions = asked.filter((a) => answers[a.key] === undefined).map((a) => a.question);
  const viewLines = lignes.map((l) => ({ id: l.id, designation: l.designation, quantity: l.quantity, unit: l.unit, confirmed: input.lines?.get(l.id)?.confirmed ?? false, enteredByArtisan: input.lines?.get(l.id)?.enteredByArtisan ?? false }));
  const view = artisanView(viewLines, validation, { needs: engine.needs, questions, declined: engine.declined }, { plan, roles: roleOf, ref });
  const raw = purchaseView(view, { ...engine, questions }, { plan, roles: roleOf, ref, validation });
  const purchase = finishPurchase(raw, { ref, plan, lignes, asked, answers, validated: input.validated ?? new Set(), engine: [...engine.needs, ...(engine.unknowns ?? [])] });
  const sansFourniture = lignes.filter((l) => !l.fourniture).map((l) => ({ lineId: l.id, label: l.designation.trim(), measure: [l.quantity?.trim(), l.unit?.trim()].filter(Boolean).join(" ") || null }));
  return { plan, validation, roles, view, purchase, questions, lignes, sansFourniture };
}

interface Asked {
  q: LectureQuestion;
  key: string;
  question: Question;
}

/**
 * La liste telle que le fondateur la lit (§51.5) : chaque fourniture sous le nom du modèle, dans l'ordre du devis ; orange
 * quand elle attend une réponse (`attend`) ou une précision du fournisseur (`aPreciser`), avec sa raison en quelques mots ;
 * les décisions de l'écran sont les questions du modèle, et le « C'est bon » d'une ligne à préciser.
 */
function finishPurchase(
  raw: PurchaseView,
  ctx: { ref: Referential; plan: QuotePlan; lignes: readonly LigneLecture[]; asked: readonly Asked[]; answers: Answers; validated: ReadonlySet<string>; engine: readonly { needId: string; workItemId: string; slot: string }[] },
): PurchaseView {
  const { plan, lignes, asked } = ctx;
  const order = new Map(lignes.map((l, i) => [l.id, i]));
  const byLine = new Map(lignes.map((l) => [l.id, l]));
  const workOfLine = (id: string) => {
    const p = plan.lines.find((x) => x.ref === id);
    return p?.status === "planned" ? p : undefined;
  };
  // La fourniture que calcule un besoin : celle de la ligne de son instance (les lignes de l'article), au même emplacement.
  const fournitureOfNeed = (item: PurchaseItem) => {
    const works = new Set(item.lineIds.map((id) => workOfLine(id)?.workItemId).filter(Boolean));
    const n = ctx.engine.find((x) => item.needIds.includes(x.needId) && works.has(x.workItemId));
    if (!n) return undefined;
    return lignes.find((l) => {
      const p = workOfLine(l.id);
      return p !== undefined && p.workItemId === n.workItemId && p.slot === n.slot;
    });
  };
  const open = (cle: string) => asked.find((a) => a.q.cle === cle && ctx.answers[a.key] === undefined);
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
    // Un article que le code ajoute d'office (la naissance) garde son nom, sans les données que le modèle n'a pas demandées (« Ø? »).
    if (!line || !f) return { ...item, label: item.label.replace(/\s*\S*\?\S*/g, "").replace(/\s{2,}/g, " ").trim() || item.label };
    const waits = f.attend.map(open).filter((a): a is Asked => !!a);
    // Une quantité calculée n'attend que les questions du modèle ; une quantité encore vide attend aussi sa donnée du calcul.
    const pending = [...new Set([...(item.quantity === null ? (item.waitsOn ?? []) : []), ...waits.map((a) => a.key)])];
    const preciser = f.aPreciser.length > 0 && ctx.answers[`a-preciser:${line.id}`] === undefined;
    const subjects = [...waits.map((a) => a.q.donnee), ...(preciser ? f.aPreciser : [])];
    const said = f.attend.map(answered).filter((v): v is string => !!v);
    const precision = [f.precision, ...said].filter(Boolean).join(", ");
    // Ce que la ligne attend se dit par la question du modèle, jamais deux fois : les règles « manque » du calcul tombent.
    const kept = (item.rules ?? []).filter((r) => !r.key.startsWith("manque:"));
    const rules = preciser ? [...kept, { key: `a-preciser:${line.id}`, text: `${f.aPreciser.join(", ")} à préciser avec le fournisseur`, said: true as const, local: true as const }] : kept;
    if (subjects.length > 0) reasons.set(item.key, `${subjects.map((t, i) => (i === 0 ? t.charAt(0).toUpperCase() + t.slice(1) : t)).join(", ")} à préciser`);
    const { waitsOn: _w, asks: _a, ...rest } = item;
    return {
      ...rest,
      label: f.nom,
      ...(precision ? { precision } : item.precision ? { precision: item.precision } : {}),
      ...(pending.length > 0 ? { waitsOn: pending, asks: waits.map((a) => ({ key: a.key, text: a.question.text, unit: a.question.unit ?? null, options: a.question.options ?? [] })) } : {}),
      ...(rules?.length ? { rules } : {}),
    };
  });
  // Les questions du modèle, chacune une décision de l'écran ; « C'est bon » pour une ligne que le fournisseur précisera.
  for (const a of asked) {
    if (ctx.answers[a.key] !== undefined) continue;
    const lineIds = lignes.filter((l) => l.fourniture?.attend.includes(a.q.cle)).map((l) => l.id);
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
  const sorted = [...toBuy].map((item, i) => ({ item, i, r: rank(item) })).sort((a, b) => a.r[0] - b.r[0] || a.r[1] - b.r[1] || a.i - b.i).map((x) => x.item);
  const rows: ScreenRow[] = sorted.map((item) => {
    const waits = (item.waitsOn ?? []).map((k) => decisions.find((d) => d.question?.key === k)).filter((d): d is Decision => !!d);
    const check = item.state === "to_confirm" || waits.length > 0 || (item.rules ?? []).length > 0;
    const decision = waits[0];
    return { key: `item:${item.key}`, status: check ? "check" : "ok", itemKey: item.key, ...(decision ? { decisionKey: decision.key } : {}), lineIds: item.lineIds };
  });
  for (const q of raw.toQuote) rows.push({ key: `quote:${q.key}`, status: "supplier", quoteKey: q.key, lineIds: q.lineIds });
  const screen = { groups: [{ key: "devis", label: "Fournitures", measure: null, kind: "autres" as const, rows }], total: rows.length, toCheck: rows.filter((r) => r.status === "check").length };
  const purchase: PurchaseView = { ...raw, toBuy: sorted, questions: decisions, assumptions: [], screen, canValidate: rows.every((r) => r.status !== "check") && decisions.length === 0 };
  const answers = ctx.answers as Record<string, string | { value: string; unit: string } | null>;
  const confirmed = applyRuleConfirmations(purchase, answers, ctx.validated);
  // Les interdits du code (§41.3 : jamais de m² d'ardoises, de lot, de métal sans dimension) : orange, comme partout.
  const finished = withShortReasons(applyOrangeFlags(confirmed, forbiddenFlags(confirmed), answers));
  // La raison d'une ligne orange : la donnée que le modèle demande, ou ce que le fournisseur précisera (§51.5).
  return { ...finished, screen: { ...finished.screen, groups: finished.screen.groups.map((g) => ({ ...g, rows: g.rows.map((r) => (r.status === "check" && r.itemKey && reasons.has(r.itemKey) ? { ...r, reason: reasons.get(r.itemKey)! } : r)) })) } };
}
