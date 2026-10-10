import { baseOf, INSTANCE_SEP } from "./model.js";
import { Decimal } from "../shared/decimal.js";
import { keyCharacteristics } from "../takeoff/characteristics.js";
import { validateTakeoffLine } from "../takeoff/validation.js";
import { keywordPosition, normalizeText, type TradeProfile } from "../trades/trade-profile.js";
import type { ChantierContext, SiteFact } from "./context.js";
import { paramsFromContext } from "./context.js";
import type { CompanyPreferences, SlotChoice, WorkItemInput } from "./engine.js";
import type { ParamDef, ProductFamily, Referential, Slot, WorkItemType } from "./model.js";
import { identifyProducts } from "./resolve.js";
import { parseRefUnit, sameDim, isAngleUnit, percentSlopeToDegrees } from "./units.js";

/**
 * DU DEVIS AU MOTEUR : chaque ligne du devis client est rattachée, sans
 * saisie, à un ouvrage du référentiel, à ses emplacements (tuile, liteau…),
 * aux produits qu'elle nomme et aux données qu'elle contient. Tout vient
 * du VOCABULAIRE du référentiel (données), rien n'est écrit pour un devis
 * particulier.
 *
 * Ce qui n'est pas reconnu le reste, avec la raison : jamais un rattachement
 * « au plus proche ».
 */
export interface QuoteLine {
  ref: string;
  designation: string;
  quantity: string | null;
  unit: string | null;
  /** Titres du devis au-dessus de la ligne (voir TakeoffLineInput.section). */
  section?: readonly string[];
}

export type LinePlan =
  | {
      ref: string;
      status: "planned";
      workItemId: string;
      /** Emplacement que la ligne désigne (« contre_liteau »). */
      slot: string;
      /** Autres emplacements que la ligne cite (« crochets et naissances compris »). */
      mentions: string[];
      characteristics: string[];
      /** La mesure de l'ouvrage est écrite dans le texte (« sur 200 m² »), pas dans la colonne quantité. */
      measureInText?: { value: string; unit: string };
      /** Sa quantité s'ajoute à celle d'une autre ligne du même article (bandes de rive + bande porte-solin, D-2026-020). */
      adds?: true;
    }
  /** Main-d'œuvre, location, forfait : rien à acheter. */
  | { ref: string; status: "not_material" }
  /** Pas d'ouvrage connu pour cette ligne : BatiClair le dit. */
  | { ref: string; status: "not_covered"; family: string | null; reason: string };

export interface QuotePlan {
  lines: LinePlan[];
  inputs: WorkItemInput[];
  context: ChantierContext;
  /** Caractéristiques du devis par emplacement, pour le nom des lignes d'achat. */
  /** Caractéristiques lues dans les lignes, par emplacement d'UN ouvrage (clé « ouvrage/emplacement ») : les crochets de la gouttière ne prêtent rien aux crochets d'ardoise. */
  characteristicsBySlot: Record<string, string[]>;
  /** Questions de cohérence (deux valeurs différentes pour la même donnée), en phrases. */
  conflicts: string[];
  /**
   * Les mêmes, structurées : deux sources (devis, en-tête lu, croquis) qui ne disent pas la même chose, sans
   * réponse de l'artisan. Jamais tranchées en silence : une question avec les deux valeurs en boutons.
   */
  contradictions: { workItemId: string; key: string; label: string; unit: string; facts: { value: string; unit: string; evidence: string }[] }[];
  /** Ce que l'artisan doit savoir (l'amiante, §18), dès qu'une ligne la nomme, même une ligne de main-d'œuvre. */
  warnings?: string[];
}

/**
 * La famille que NOMME la première parenthèse de la ligne, quand elle commence par le nom d'un autre article d'un
 * ouvrage qui a aussi la famille du titre (« Tubes de descente (Coude zinc Ø80) » : un coude). Sinon null.
 */
function namedInParenthesis(designation: string, general: string, families: { item: string; keywords: string[] }[], ref: Referential): string | null {
  const inner = /^[^()]{3,80}\(([^()]{3,120})\)/.exec(designation)?.[1];
  if (!inner) return null;
  const text = normalizeText(inner);
  const head = families.find((f) => f.item !== general && f.keywords.some((k) => keywordPosition(text, k) === 0));
  if (!head) return null;
  const together = ref.workItems.some((w) => w.slots.some((s) => s.family === general) && w.slots.some((s) => s.family === head.item));
  return together ? head.item : null;
}

/** Le mot le plus tôt dans la ligne nomme l'ouvrage ; à égalité, l'expression la plus longue (« tuile de rive » > « tuile »). */
function earliest<T>(text: string, items: { item: T; keywords: string[] }[]): T | null {
  let best: { item: T; pos: number; len: number } | null = null;
  for (const { item, keywords } of items) {
    for (const k of keywords) {
      const pos = keywordPosition(text, k);
      if (pos < 0) continue;
      if (!best || pos < best.pos || (pos === best.pos && k.length > best.len)) best = { item, pos, len: k.length };
    }
  }
  return best?.item ?? null;
}

const familyOf = (ref: Referential, code: string): ProductFamily | undefined => ref.families.find((f) => f.code === code);
const slotWords = (ref: Referential, slot: Slot) => [...(slot.keywords ?? []), ...(familyOf(ref, slot.family)?.keywords ?? [])];

/** « sur 200 m² », « 35 ml de gouttière » : les mesures d'ouvrage écrites dans un texte (surfaces et longueurs). */
function measuresInText(normalized: string): { value: string; unit: string }[] {
  const out: { value: string; unit: string }[] = [];
  for (const m of normalized.matchAll(/(?:^|[^0-9.,x*])(\d{1,3}(?:[ .]\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?)\s*(m²|m2|ml)(?![a-z0-9])/g)) {
    out.push({ value: m[1]!.replace(/[ .](?=\d{3})/g, "").replace(",", "."), unit: m[2] === "ml" ? "m" : "m2" });
  }
  return out;
}

/** Unités de ligne de devis → unités du référentiel. */
export const LINE_UNITS: Record<string, string> = { U: "u", M: "m", ML: "m", M2: "m2", M3: "m3", KG: "kg", T: "t" };
const TEXT_UNITS: Record<string, string> = { mm: "mm", cm: "cm", m: "m", ml: "m", m2: "m2", "m²": "m2", "%": "%", "°": "°", metre: "m", metres: "m", degre: "°", degres: "°" };

/** « entraxe 90 cm », « hauteur : 4m », « pureau de 34,3 cm » → valeur et unité, seulement si elles sont écrites. */
function readLabelled(normalized: string, label: string, gap = 0, bare: string | null = null): { value: string; unit: string } | null {
  // Chaque place du mot, dans l'ordre : « tuyau de descente zinc…, 2 descentes de 3 m » se lit à la seconde.
  let offset = 0;
  for (;;) {
    const pos = keywordPosition(normalized.slice(offset), label);
    if (pos < 0) return null;
    const found = readAfter(normalized.slice(offset + pos + normalizeText(label).length), gap, bare);
    if (found) return found;
    offset += pos + 1;
  }
}

function readAfter(after: string, gap: number, bare: string | null = null): { value: string; unit: string } | null {
  // « crochets inox de 11 cm » : quelques mots permis entre l'annonce et la valeur, jamais un autre nombre.
  // « 3 mètres », « 30 degrés » : l'unité écrite en toutes lettres compte comme « m », « ° ».
  const words = gap > 0 ? `(?:\\s+[a-z][a-z'-]*){0,${gap}}` : "";
  const m = new RegExp(`^[a-z]{0,2}\\.?${words}\\s*(?:de |d |: |:|= |a )?\\s*(\\d+(?:[.,]\\d+)?)\\s*(mm|cm|ml|m²|m2|metres|metre|m|%|°|degres|degre)?(?![a-z0-9])`).exec(after);
  if (!m) return null;
  // Sans unité (« crochets de 11 ») : seulement pour une donnée qui le permet, dans son unité (et sa plage, vérifiée après).
  if (!m[2]) return bare ? { value: m[1]!.replace(",", "."), unit: bare } : null;
  return { value: m[1]!.replace(",", "."), unit: TEXT_UNITS[m[2]!]! };
}

/** Une valeur lue dans le texte, dans les valeurs plausibles de la donnée (« crochet Ø 2,7 mm » n'est pas une longueur). */
function withinTextRange(p: ParamDef, found: { value: string; unit: string }): boolean {
  if (!p.textRange) return true;
  const read = parseRefUnit(found.unit);
  const own = parseRefUnit(p.unit);
  const v = new Decimal(found.value).times(read.factor);
  return v.greaterThanOrEqualTo(new Decimal(p.textRange.min).times(own.factor)) && v.lessThanOrEqualTo(new Decimal(p.textRange.max).times(own.factor));
}

/** Une valeur lue par le prompt A (« 35° », « 5,50 m », « 45 % », « 0,65 mm ») → valeur et unité du référentiel. */
export function readDimension(raw: string): { value: string; unit: string } | null {
  const m = /^\s*(\d{1,3}(?:[ .]\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?)\s*(mm|cm|ml|m²|m2|m|%|°|degres|degre|deg)\s*$/i.exec(normalizeText(raw).replace(/\s+/g, " "));
  if (!m) return null;
  const unit = /^deg/.test(m[2]!.toLowerCase()) ? "°" : TEXT_UNITS[m[2]!.toLowerCase()];
  if (!unit) return null;
  return { value: m[1]!.replace(/[ .](?=\d{3})/g, "").replace(",", "."), unit };
}

/**
 * Ce que le prompt A (§41.1) a lu en plus du texte : les dimensions de chaque ligne ({ pente: "35°",
 * rampant: "5,50 m" }) et le contexte du devis (en-tête, notes). Chaque donnée dont le nom est celui
 * d'un paramètre d'ouvrage (sa clé ou un de ses mots du devis) devient un fait du chantier, preuve à
 * l'appui ; une pente en % est convertie en degrés. Ces faits valent moins que le texte lu par le code
 * (ils complètent, jamais ne contredisent) et plus que les hypothèses par défaut : la pente lue par
 * l'IA n'est plus une question à 45°.
 */
export function factsFromReading(ref: Referential, lines: readonly { ref: string; dimensions?: Record<string, string> | null }[], context?: Record<string, string> | null): SiteFact[] {
  const params = ref.workItems.flatMap((w) => w.params);
  const facts: SiteFact[] = [];
  const add = (name: string, raw: string, evidence: string, line?: string) => {
    const found = readDimension(raw);
    if (!found) return;
    const n = normalizeText(name);
    for (const p of params) {
      if (normalizeText(p.key.replace(/_/g, " ")) !== n && !(p.textLabels ?? []).some((l) => normalizeText(l) === n)) continue;
      if (!sameDimUnit(p.unit, found.unit)) continue;
      const asRef = isAngleUnit(p.unit) && found.unit === "%" ? { value: percentSlopeToDegrees(new Decimal(found.value)).toString(), unit: p.unit } : found;
      if (facts.some((f) => f.key === p.key && f.value === asRef.value && f.unit === asRef.unit && f.line === line)) continue;
      facts.push({ key: p.key, ...asRef, evidence: `${evidence} (« ${name} : ${raw.trim()} »)`, origin: "devis", ...(line ? { line } : {}) });
    }
  };
  for (const line of lines) for (const [name, raw] of Object.entries(line.dimensions ?? {})) if (typeof raw === "string") add(name, raw, `Devis, ${line.ref}`, line.ref);
  for (const [name, raw] of Object.entries(context ?? {})) if (typeof raw === "string") add(name, raw, "Devis, en-tête");
  return facts;
}

const NUMBER_WORDS: Record<string, string> = { un: "1", une: "1", deux: "2", trois: "3", quatre: "4", cinq: "5", six: "6", sept: "7", huit: "8", neuf: "9", dix: "10" };

/**
 * Les phrasés d'artisan (§44.2, banc de 30 phrasés) ramenés à la forme lue par le code : « pte » = pente ; « environ »,
 * « env », « ~ », « ≈ » s'effacent (la valeur reste celle écrite) ; « 6m50 » = 6,50 m ; « 38 degrés » = 38° ;
 * « 12 lin » = 12 ml ; « deux descentes » = 2 descentes ; « hauteur des descentes 5 m » = hauteur 5 m ;
 * « 2 × 6,50 m » (deux pans) = 6,50 m.
 */
function artisanPhrasing(normalized: string): string {
  return normalized
    .replace(/\bpte\b/g, "pente")
    .replace(/[~≈]/g, " ")
    .replace(/\b(environ|env|approx|approximativement|a peu pres)\b/g, " ")
    .replace(/(\d+)\s*m\s*(\d{2})(?![0-9])/g, "$1,$2 m")
    .replace(/(\d)\s*(degres|degre|deg)\b/g, "$1°")
    .replace(/(\d)\s*(lin|lineaires?|m lineaires?|metres lineaires?)\b/g, "$1 ml")
    .replace(/\b(un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix)\s+(?=[a-z])/g, (_, w: string) => `${NUMBER_WORDS[w]} `)
    .replace(/\b(des|du|de la|de l)\s+[a-z]+\s+(?=\d)/g, "")
    .replace(/\b(\d+)\s*[x×]\s*(\d+(?:[.,]\d+)?)/g, "$2")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * LA NOTE DE L'ARTISAN (infos chantier facultatives) : du texte libre tapé au dépôt ou dans le chat, ou le
 * commentaire d'un croquis. Seule une mesure NOMMÉE et non ambiguë devient un fait (« Pente 42° », « Rampants
 * 2 × 6,50 m », « 2 descentes ») ; le reste est du contexte, gardé tel quel, jamais transformé en mesure.
 * Chaque fait porte sa preuve (la phrase) et l'origine « artisan » : il passe devant le texte du devis.
 */
export function readSiteNotes(ref: Referential, notes: string | null | undefined, evidencePrefix = "Votre note"): SiteFact[] {
  if (!notes?.trim()) return [];
  const facts: SiteFact[] = [];
  const params = ref.workItems.flatMap((w) => w.params).filter((p) => p.textLabels?.length);
  // Le point d'une abréviation (« ép. », « env. », « dév. ») ne coupe pas la phrase.
  const sentences = notes
    .replace(/(^|[^\p{L}])(ép|ep|env|dév|dev|approx|pte)\./giu, "$1$2")
    .split(/\n|[.;!?](?=\s|$)/)
    .map((x) => x.trim())
    .filter(Boolean);
  for (const sentence of sentences) {
    const normalized = artisanPhrasing(normalizeText(sentence));
    for (const p of params) {
      for (const label of p.textLabels ?? []) {
        let found = readLabelled(normalized, label);
        // « 2 rampants de 6,5 » : une longueur écrite sans unité après son nom se lit en mètres (et seulement une longueur).
        if (!found && p.unit === "m") {
          const pos = keywordPosition(normalized, label);
          const m = pos < 0 ? null : /^[a-z]{0,2}\s*(?:de |: |:|= )?\s*(\d+(?:[.,]\d+)?)(?![0-9a-z°%,.])/.exec(normalized.slice(pos + normalizeText(label).length));
          if (m) found = { value: m[1]!.replace(",", "."), unit: "m" };
        }
        // Un nombre d'ouvrages écrit avant son nom (« 2 descentes », « 1 cheminée ») : seulement pour une donnée comptée.
        if (!found && parseRefUnit(p.unit).dim.L === 0 && parseRefUnit(p.unit).dim.M === 0 && p.unit === "u") {
          const m = new RegExp(`(?:^|[^0-9,.])(\\d+)\\s+${normalizeText(label)}(?:s|x)?(?![a-z0-9])`).exec(normalized);
          if (m) found = { value: m[1]!, unit: "u" };
        }
        if (!found || !sameDimUnit(p.unit, found.unit)) continue;
        const asRef = isAngleUnit(p.unit) && found.unit === "%" ? { value: percentSlopeToDegrees(new Decimal(found.value)).toString(), unit: p.unit } : found;
        if (facts.some((f) => f.key === p.key)) continue;
        facts.push({ key: p.key, ...asRef, evidence: `${evidencePrefix} (« ${sentence} »)`, origin: "artisan" });
        break;
      }
    }
  }
  return facts;
}

/** Une phrase d'exclusion de la note (§44.2) : ce qu'elle vise (mots significatifs) et la phrase, citée telle quelle. */
export interface SiteExclusion {
  words: string[];
  phrase: string;
}

// Mots qui ne désignent pas un ouvrage précis : « la petite toiture du garage » vise le garage, pas « toiture ».
const EXCLUSION_STOPWORDS = new Set(
  "le la les l un une des du de d au aux et ou a en sur pour par avec sans ce cette ces son sa ses leur leurs mon ma mes est sont n ne pas plus deja tout tous toute toutes petite petit grande grand partie parties toiture toitures couverture travaux ouvrage ouvrages client clients fourni fournis fournie fournies conserve conserves conservee conservees non compris comprise compris comprises exclu exclus exclue exclues hors sauf garder garde gardes gardee gardees existant existants existante existantes ancien anciens ancienne anciennes".split(" "),
);

/**
 * LES PHRASES D'EXCLUSION de la note (§44.2) : « garage non compris », « Velux fournis par le client », « charpente
 * conservée », « hors abri de jardin ». Sans IA : le déclencheur est un des tournures ci-dessous, la cible est faite
 * des mots significatifs de la même phrase. Une ligne du devis qui nomme TOUS ces mots est exclue (jamais devinée
 * au plus proche) ; elle reste dans le détail sans prix, avec la mention « exclu par l'artisan ».
 */
export function readExclusions(notes: string | null | undefined): SiteExclusion[] {
  if (!notes?.trim()) return [];
  const out: SiteExclusion[] = [];
  const triggers =
    /\b(?:n est pas compris|ne sont pas compris|pas compris|non compris|non inclus|pas inclus|fournis? par le client|fournies? par le client|fournis? par client|conserves?|conservees?|a conserver|on garde|exclus?|exclues?)(?:es?|s)?\b|\b(?:hors|sauf)\s+/;
  for (const raw of notes.split(/\n|[.;!?](?=\s|$)/).map((x) => x.trim()).filter(Boolean)) {
    for (const part of raw.split(/,/).map((x) => x.trim()).filter(Boolean)) {
      const n = normalizeText(part).replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
      if (!triggers.test(n)) continue;
      const words = n
        .replace(triggers, " ")
        .split(" ")
        .filter((w) => w.length >= 3 && !/^\d/.test(w) && !EXCLUSION_STOPWORDS.has(w))
        // Pluriel simple ramené au singulier : « Velux » reste « velux », « charpentes » → « charpente ».
        .map((w) => (w.length > 4 && /[^s]s$/.test(w) ? w.slice(0, -1) : w));
      if (words.length > 0 && words.length <= 3) out.push({ words, phrase: part });
    }
  }
  return out;
}

/** La phrase d'exclusion qui vise cette ligne du devis (tous ses mots y sont), ou null. */
export function exclusionFor(designation: string, exclusions: readonly SiteExclusion[]): SiteExclusion | null {
  const text = ` ${normalizeText(designation).replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ")} `;
  return exclusions.find((e) => e.words.every((w) => new RegExp(` ${w}(?:s|x)? `).test(text))) ?? null;
}

/**
 * @param extraFacts données du chantier connues hors du texte des lignes (zone climatique déduite du
 *   code postal de l'adresse, dimensions lues par le prompt A) : elles complètent le contexte, le
 *   texte du devis l'emporte s'il les écrit. Deux valeurs différentes entre elles font un conflit, donc une question.
 */
export function planQuote(lines: QuoteLine[], ref: Referential, profile: TradeProfile, preferences?: CompanyPreferences, extraFacts: readonly SiteFact[] = []): QuotePlan {
  // Le vocabulaire d'un référentiel ne vaut que pour SON métier : dans un devis de plombier,
  // « coude PVC » n'est pas un coude de descente de gouttière.
  const covered = profile.id.split(",").includes(ref.trade);
  // Une famille qui en précise une autre (« gouttière » → « PVC ») ne se lit qu'après elle : « alu » seul n'est pas une gouttière.
  const families = covered ? ref.families.filter((f) => f.keywords?.length && !f.refines).map((f) => ({ item: f.code, keywords: f.keywords! })) : [];
  const designations = lines.map((l) => l.designation);
  const read = lines.map((line) => {
    const v = validateTakeoffLine({ id: line.ref, designation: line.designation, quantityRaw: line.quantity, unitRaw: line.unit, source: "client_quote" }, profile, designations);
    const text = normalizeText(line.designation);
    const dominant = !covered ? undefined : ref.families.find((f) => f.dominant && (f.keywords ?? []).some((k) => keywordPosition(text, k) >= 0))?.code;
    // Une ligne de pose seule garde son ouvrage : elle n'achète rien, mais ce qu'elle écrit (pente, crochets, façonnage) se lit.
    const general = dominant ?? earliest(text, families);
    // « Tuiles (… tuiles canal …) » : la famille générale lue en premier est précisée par une famille plus précise nommée ensuite.
    const precise = general ? ref.families.find((f) => f.refines === general && (f.keywords ?? []).some((k) => keywordPosition(text, k) >= 0)) : undefined;
    // « Tubes de descente (Coude zinc Ø80) » : le titre de la ligne range l'article, la parenthèse qui le suit le NOMME.
    // Le mot entre parenthèses l'emporte quand il désigne un autre article du même ouvrage (D-2026-020 : 4 coudes, pas
    // 4 descentes). « (Fourniture & Pose) », « (2 rives de 6 m) » ne nomment rien : la ligne garde son titre.
    const named = general && !precise ? namedInParenthesis(line.designation, general, families, ref) : null;
    return { line, v, text, family: precise?.code ?? named ?? general, titled: named ? general : null };
  });

  // 1. Les ouvrages présents : ceux qu'une ligne déclenche.
  const active = ref.workItems.filter((w) => read.some((r) => r.v.kind !== "labor" && r.family && w.triggers.includes(r.family)));

  const plans: LinePlan[] = [];
  const facts: SiteFact[] = [];
  const products = new Map<string, Map<string, SlotChoice | "conflict">>();
  const mentioned = new Map<string, Set<string>>();
  const cited = new Map<string, { slot: string; word: string; line: string }[]>();
  const characteristicsBySlot: Record<string, string[]> = {};
  const askInstead = new Map<string, Set<string>>();
  const quantities: { fact: SiteFact; slot: string; ref: string }[] = [];
  // §48.6 « une question par pièce de zinguerie écrite au devis » : un ouvrage « perLine » écrit sur deux lignes ou plus
  // (bande de solin, bande de ventilation…) devient une instance par ligne, avec ses données et ses questions.
  const workOf = (family: string | null | undefined) => (family ? active.find((w) => w.slots.some((s) => s.family === family)) : undefined);
  const supplyRefs = new Map<string, string[]>();
  for (const r of read) {
    const w = workOf(r.family);
    if (r.v.kind === "labor" || !w?.perLine) continue;
    supplyRefs.set(w.id, [...(supplyRefs.get(w.id) ?? []), r.line.ref]);
  }
  const instanced = (w: WorkItemType) => (supplyRefs.get(w.id)?.length ?? 0) >= 2;
  const idFor = (w: WorkItemType, lineRef: string) => (instanced(w) ? `${w.id}${INSTANCE_SEP}${lineRef}` : w.id);
  const pieceLabels = new Map<string, string>();
  for (const r of read) {
    const w = workOf(r.family);
    // La pièce garde son nom même seule : sa question dit « Bande de ventilation… », jamais la liste de l'ouvrage.
    if (w?.perLine && r.v.kind !== "labor") pieceLabels.set(idFor(w, r.line.ref), pieceName(r.line.designation));
  }
  // Une ligne de POSE (« Façonnage et pose des bandes de rive ») vaut pour la pièce qu'elle nomme ; sans pièce nommée,
  // pour toutes celles de l'ouvrage.
  const targetsOf = (w: WorkItemType, text: string): string[] => {
    if (!instanced(w)) return [w.id];
    const refs = supplyRefs.get(w.id)!;
    const named = refs.filter((ref) => {
      const own = normalizeText(read.find((r) => r.line.ref === ref)!.line.designation);
      return PIECE_WORDS.some((k) => keywordPosition(text, k) >= 0 && keywordPosition(own, k) >= 0);
    });
    return (named.length > 0 ? named : refs).map((ref) => idFor(w, ref));
  };

  for (const { line, v, text, family, titled } of read) {
    const work = workOf(family);
    if (v.kind === "labor") {
      // « Pose … pente 30° », « Façonnage et pose des bandes » : les données écrites valent pour l'ouvrage nommé.
      if (work) for (const id of targetsOf(work, text)) readWritten(work, line.ref, text, facts, id);
      // §49.6 : « fixation … des tuyaux de descente » cite les colliers sans les chiffrer : ils sortent, orange.
      for (const s of work?.slots ?? []) {
        const word = (s.citedBy ?? []).find((k) => keywordPosition(text, k) >= 0);
        if (!word || !work) continue;
        for (const id of targetsOf(work, text)) {
          const list = cited.get(id) ?? [];
          if (!list.some((c) => c.slot === s.key)) list.push({ slot: s.key, word, line: line.ref });
          cited.set(id, list);
        }
      }
      plans.push({ ref: line.ref, status: "not_material" });
      continue;
    }
    if (!work || !family) {
      const label = family ? (familyOf(ref, family)?.label ?? family) : null;
      plans.push({
        ref: line.ref,
        status: "not_covered",
        family,
        reason: !covered
          ? "Le calcul des quantités n'existe pas encore pour ce métier."
          : label
            ? `${label} : pas encore de règle de calcul dans BatiClair.`
            : "Ouvrage non reconnu par BatiClair.",
      });
      continue;
    }
    // 2. L'emplacement : celui de la famille ; si deux emplacements partagent la famille, leurs mots départagent.
    const candidates = work.slots.filter((s) => s.family === family);
    const slot = candidates.length === 1 ? candidates[0]! : earliest(text, candidates.map((s) => ({ item: s, keywords: s.keywords ?? [] })));
    if (!slot) {
      plans.push({ ref: line.ref, status: "not_covered", family, reason: `Emplacement ambigu dans « ${work.label} ».` });
      continue;
    }
    // Un emplacement de la MÊME famille n'est jamais « cité » par la ligne d'un autre
    // (« contre-lattes en liteaux » ne parle pas du lattage) : il lui faut sa propre ligne.
    // Le titre devant la parenthèse range l'article : il ne « cite » pas son emplacement (les tubes d'une ligne de coudes).
    const mentions = work.slots
      .filter((s) => s.family !== slot.family && s.family !== titled && slotWords(ref, s).some((k) => namedAsArticle(text, k)))
      .map((s) => s.key);
    const wid = idFor(work, line.ref);
    const seen = mentioned.get(wid) ?? new Set<string>();
    [slot.key, ...mentions].forEach((k) => seen.add(k));
    mentioned.set(wid, seen);

    // 3. Les produits nommés par la ligne (un seul candidat par famille, sinon le moteur posera la question).
    const chosen = products.get(wid) ?? new Map<string, SlotChoice | "conflict">();
    for (const s of [slot, ...work.slots.filter((x) => mentions.includes(x.key))]) {
      const found = identifyProducts(line.designation, ref, s.family).candidates;
      if (found.length !== 1) continue;
      const choice: SlotChoice = { productId: found[0]!.product.id, origin: found[0]!.product.generic ? "devis" : "alias" };
      const before = chosen.get(s.key);
      chosen.set(s.key, before && before !== "conflict" && before.productId !== choice.productId ? "conflict" : (before ?? choice));
    }
    products.set(wid, chosen);

    // 4. Les données écrites : la quantité de la ligne, et les valeurs annoncées par leur nom.
    const unit = v.unit ? LINE_UNITS[v.unit] : undefined;
    const fromQuantity = work.params.filter((x) => x.fromLineQuantity && (!x.forSlots || x.forSlots.includes(slot.key)));
    let measureInText: { value: string; unit: string } | undefined;
    if (unit && v.quantity && fromQuantity.some((p) => sameDimUnit(p.unit, unit))) {
      for (const p of fromQuantity.filter((x) => sameDimUnit(x.unit, unit))) {
        const fact: SiteFact = { key: p.key, value: v.quantity.toFixed(), unit, evidence: `Devis, ${line.ref}`, origin: "devis", workItemId: wid, ...(slot.measureOnly ? { fromMeasureLine: true as const } : {}) };
        facts.push(fact);
        quantities.push({ fact, slot: slot.key, ref: line.ref });
      }
    } else {
      // Quantité en forfait, ensemble ou absente, mais « 200 m² » écrit dans la désignation : c'est la
      // mesure de l'ouvrage (règle du fondateur : un couvreur qui parle de 200 m² parle de toiture).
      // Une seule mesure de la bonne dimension, sinon rien n'est deviné.
      for (const p of fromQuantity) {
        const found = measuresInText(text).filter((m) => sameDimUnit(p.unit, m.unit));
        if (found.length !== 1) continue;
        measureInText = found[0]!;
        facts.push({ key: p.key, ...found[0]!, evidence: `Devis, ${line.ref} (« ${found[0]!.value.replace(".", ",")} ${found[0]!.unit === "m2" ? "m²" : found[0]!.unit} » dans le texte)`, origin: "devis", workItemId: wid });
      }
    }
    for (const p of work.params) {
      for (const word of p.textCount ?? []) {
        const m = new RegExp(`(?:^|[^\\d.,])(\\d{1,3}) ${normalizeText(word)}s?(?![a-z0-9])`).exec(text);
        if (m && Number(m[1]) > 0 && !facts.some((f) => f.key === p.key && f.workItemId === wid && f.evidence.startsWith(`Devis, ${line.ref}`))) {
          facts.push({ key: p.key, value: m[1]!, unit: p.unit, evidence: `Devis, ${line.ref} (« ${m[1]} ${word}s »)`, origin: "devis", workItemId: wid });
        }
      }
    }
    readWritten(work, line.ref, text, facts, wid);
    // Règle du comptoir (§47.8) : le devis nomme la chose sans la préciser (« zinc prépatiné », sans teinte) :
    // l'hypothèse par défaut ne vaut plus, on demande.
    for (const p of work.params) {
      const vague = p.default?.unlessText?.some((k) => keywordPosition(text, k) >= 0);
      if (vague && !facts.some((f) => f.key === p.key && f.workItemId === wid && f.evidence.startsWith(`Devis, ${line.ref} `))) {
        askInstead.set(wid, new Set([...(askInstead.get(wid) ?? []), p.key]));
      }
    }
    const chars = productCharacteristics(ref, work, slot, line.designation);
    // La naissance prend la matière et la forme de la gouttière (« charsFrom ») : un emplacement suit l'autre.
    for (const key of [slot.key, ...work.slots.filter((s) => s.charsFrom === slot.key).map((s) => s.key)]) {
      const charKey = slotCharacteristicsKey(wid, key);
      if (chars.length > 0) characteristicsBySlot[charKey] = [...new Set([...(characteristicsBySlot[charKey] ?? []), ...chars])];
    }
    plans.push({ ref: line.ref, status: "planned", workItemId: wid, slot: slot.key, mentions, characteristics: chars, ...(measureInText ? { measureInText } : {}) });
  }

  // Deux lignes du MÊME article d'un ouvrage (« bandes de rive 4 m », « bande porte-solin 4 m ») : deux longueurs qui
  // s'additionnent, pas deux fois la même. Deux articles différents (ardoises et écran, 48 m² chacun) restent une seule mesure.
  const groups = new Map<string, typeof quantities>();
  for (const q of quantities) groups.set(`${q.fact.workItemId}|${q.fact.key}`, [...(groups.get(`${q.fact.workItemId}|${q.fact.key}`) ?? []), q]);
  for (const group of groups.values()) {
    if (new Set(group.map((q) => q.ref)).size < 2 || new Set(group.map((q) => q.slot)).size > 1) continue;
    for (const q of group) {
      q.fact.fromMeasureLine = true;
      const plan = plans.find((l) => l.ref === q.ref);
      if (plan?.status === "planned") plan.adds = true;
    }
  }

  // Une donnée hors texte des lignes (code postal, en-tête lu par l'IA, croquis) complète le devis ; si elle le
  // CONTREDIT, les deux restent et font une question (jamais tranchée en silence). La note de l'artisan, elle,
  // entre toujours : elle passe devant le devis, et l'explication dit les deux.
  const sameAs = (a: SiteFact, b: SiteFact) => {
    try {
      const ua = parseRefUnit(a.unit);
      const ub = parseRefUnit(b.unit);
      return sameDim(ua.dim, ub.dim) && new Decimal(a.value).times(ua.factor).equals(new Decimal(b.value).times(ub.factor));
    } catch {
      return a.value === b.value;
    }
  };
  const fromText = [...facts];
  // Une dimension lue sur une ligne vaut pour l'ouvrage (la pièce) de cette ligne.
  const lineWork = new Map(plans.flatMap((l) => (l.status === "planned" ? [[l.ref, l.workItemId] as const] : [])));
  extraFacts = extraFacts.map((f) => (f.line && !f.workItemId && lineWork.has(f.line) ? { ...f, workItemId: lineWork.get(f.line)! } : f));
  for (const f of extraFacts) {
    if (f.origin !== "artisan" && fromText.some((x) => x.key === f.key && sameAs(x, f))) continue;
    facts.push(f);
  }
  // Une donnée lue sur les AUTRES ouvrages du devis (la couverture sous une sortie de toit) : une seule valeur possible, sinon on demande.
  const instancesOf = (w: WorkItemType) => [...mentioned.keys()].filter((id) => baseOf(id) === w.id);
  const present = (id: string) => instancesOf({ id } as WorkItemType).length > 0;
  for (const w of active) {
    for (const wid of instancesOf(w)) {
      for (const p of w.params) {
        if (!p.fromWorks || facts.some((f) => f.key === p.key && f.workItemId === wid)) continue;
        const hits = p.fromWorks.filter((fw) => fw.workItems.some((id) => present(id)));
        const values = [...new Set(hits.map((h) => h.value))];
        if (values.length !== 1) continue;
        const by = active.find((x) => hits[0]!.workItems.includes(x.id) && present(x.id))!;
        facts.push({ key: p.key, value: values[0]!, unit: p.unit, evidence: `Devis : ${by.label.replace(/\s*\(.*\)$/, "").toLowerCase()}`, origin: "devis", workItemId: wid });
      }
    }
  }
  const context: ChantierContext = { facts };
  const conflicts: string[] = [];
  const contradictions: QuotePlan["contradictions"] = [];
  const inputs: WorkItemInput[] = active
    .flatMap((w) => instancesOf(w).map((wid) => ({ w, wid })))
    .map(({ w, wid }) => {
      const { params, conflicts: c } = paramsFromContext(context, w, new Set(active.filter((x) => x.section === "principal").map((x) => x.id)), wid);
      c.forEach((x) => {
        const def = w.params.find((p) => p.key === x.key);
        conflicts.push(`${def?.label ?? x.key} : ${x.facts.map((f) => `${f.value} ${f.unit} (${f.evidence})`).join(" / ")}`);
        contradictions.push({ workItemId: wid, key: x.key, label: def?.label ?? x.key, unit: def?.unit ?? x.facts[0]!.unit, facts: x.facts.map((f) => ({ value: f.value, unit: f.unit, evidence: f.evidence })) });
      });
      const chosen = [...(products.get(wid) ?? new Map()).entries()].filter((e): e is [string, SlotChoice] => e[1] !== "conflict");
      return {
        workItemId: wid,
        ...(pieceLabels.has(wid) ? { label: pieceLabels.get(wid)! } : {}),
        params,
        products: Object.fromEntries(chosen),
        mentioned: [...mentioned.get(wid)!],
        ...(cited.has(wid) ? { cited: cited.get(wid)! } : {}),
        ...(preferences ? { preferences } : {}),
        ...(askInstead.has(wid) ? { askInstead: [...askInstead.get(wid)!] } : {}),
      };
    });
  const warnings = !covered ? [] : [...new Set(ref.families.filter((f) => f.warning && read.some((r) => (f.keywords ?? []).some((k) => keywordPosition(r.text, k) >= 0))).map((f) => f.warning!))];
  return { lines: plans, inputs, context, characteristicsBySlot, conflicts: [...new Set(conflicts)], contradictions, ...(warnings.length ? { warnings } : {}) };
}

/**
 * Caractéristiques du devis qui décrivent le PRODUIT de cet emplacement
 * (coloris, matière, section) : on retire ce qui est déjà ailleurs —
 * une donnée du chantier lue (« entraxe 90 cm »), un produit d'une autre
 * famille (« pour tuiles HP10 » sur une ligne de liteaux), un composant
 * cité (« crochets et naissances compris » devient ses propres lignes).
 */
/** La clé des caractéristiques d'un emplacement : propre à l'ouvrage (deux ouvrages ont chacun leurs « crochets »). */
export const slotCharacteristicsKey = (workItemId: string, slot: string) => `${workItemId}/${slot}`;

/** Dernière place d'un des mots dans le texte (-1 sinon) ; « crochets d'ardoise » : « ardoise » complète le crochet, il ne compte pas. */
/**
 * Les données écrites d'une ligne, annoncées par leur nom (« pente 30° », « crochets de 11 », « Ø 80 ») ou par un mot
 * (« Façonnage et pose ») : elles valent pour l'ouvrage de la ligne, qu'elle fournisse ou qu'elle pose seulement.
 */
function readWritten(work: WorkItemType, lineRef: string, text: string, facts: SiteFact[], wid: string = work.id): void {
  for (const p of work.params) {
    for (const label of p.textLabels ?? []) {
      const found = readLabelled(text, label, p.labelGap, p.bareNumber ? p.unit : null);
      if (!found || !sameDimUnit(p.unit, found.unit) || !withinTextRange(p, found)) continue;
      // « pente 45 % » dans un devis : gardée en degrés, l'unité de la pente partout dans BatiClair.
      const asRef = isAngleUnit(p.unit) && found.unit === "%" ? { value: percentSlopeToDegrees(new Decimal(found.value)).toString(), unit: p.unit } : found;
      facts.push({ key: p.key, ...asRef, evidence: `Devis, ${lineRef} (« ${label} »)`, origin: "devis", workItemId: wid });
    }
  }
  for (const p of work.params) {
    // « Ø 150 » sans unité : lu seulement si 150 est une des réponses proposées (un bouton), jamais deviné.
    if (p.choices && !facts.some((f) => f.key === p.key && f.workItemId === wid)) {
      for (const label of p.textLabels ?? []) {
        const pos = keywordPosition(text, label);
        if (pos < 0 || readLabelled(text, label)) continue;
        const m = /^[a-z]{0,2}\.?\s*(?:de |: |:|= )?\s*(\d+)(?![\d,.]|\s*(?:mm|cm|ml|m2|m²|m|%|°)(?![a-z0-9]))/.exec(text.slice(pos + normalizeText(label).length));
        if (m && p.choices.some((c) => c.value === m[1])) {
          facts.push({ key: p.key, value: m[1]!, unit: p.unit, evidence: `Devis, ${lineRef} (« ${label} ${m[1]} »)`, origin: "devis", workItemId: wid });
          break;
        }
      }
    }
    for (const tv of p.textValues ?? []) {
      const kw = tv.keywords.find((k) => keywordPosition(text, k) >= 0);
      if (kw && !facts.some((f) => f.key === p.key && f.workItemId === wid && f.value === tv.value && f.evidence.startsWith(`Devis, ${lineRef} `))) {
        facts.push({ key: p.key, value: tv.value, unit: p.unit, evidence: `Devis, ${lineRef} (« ${kw} »)`, origin: "devis", workItemId: wid });
      }
    }
  }
}

/**
 * Le mot d'un autre article NOMME cet article, sauf quand il ne fait que compléter un nom : « crochets de gouttière »,
 * « fixation de la gouttière », « dévoiement des descentes » parlent d'autre chose (D-2026-020). « et crochets »,
 * « avec coudes », « fourniture de crochets », « accessoires de fixation » le nomment.
 */
function namedAsArticle(text: string, keyword: string): boolean {
  for (let offset = 0; ; ) {
    const pos = keywordPosition(text.slice(offset), keyword);
    if (pos < 0) return false;
    const at = offset + pos;
    const m = /(?:^|\s)([a-z]+)\s+(?:de la|de l|des|du|de|d|pour la|pour le|pour les|pour)\s*$/.exec(text.slice(0, at));
    if (!m || NOT_A_NOUN.has(m[1]!)) return true;
    offset = at + 1;
  }
}
// Les mots qui laissent nommer l'article qui suit : « et de crochets », « accessoires de fixation », « kit de raccordement ».
const NOT_A_NOUN = new Set(["et", "ou", "avec", "fourniture", "pose", "plus", "compris", "y", "accessoire", "accessoires", "kit", "kits", "piece", "pieces", "element", "elements", "systeme"]);

function lastWord(text: string, words: readonly string[], skipComplement = false): number {
  let best = -1;
  for (const w of words) {
    const k = normalizeText(w);
    for (let at = text.indexOf(k); at >= 0; at = text.indexOf(k, at + 1)) {
      // « des crochets » nomme les crochets ; « crochet d'ardoise », « pour tuiles » ne les nomment pas.
      if (skipComplement && /(?:^|\s)(?:de|d|du|pour)\s*$/.test(text.slice(0, at))) continue;
      best = Math.max(best, at);
    }
  }
  return best;
}

function productCharacteristics(ref: Referential, work: WorkItemType, slot: Slot, designation: string): string[] {
  const text = normalizeText(designation);
  const own = slotWords(ref, slot);
  const others = work.slots.filter((s) => s.key !== slot.key && s.family !== slot.family).flatMap((s) => slotWords(ref, s));
  return keyCharacteristics(designation).filter((c) => {
    const n = normalizeText(c);
    // « Ardoises 32x22 posées au crochet inox » : « inox » qualifie le crochet, nommé juste avant, pas l'ardoise.
    const at = text.indexOf(n);
    if (at > 0 && others.length > 0 && lastWord(text.slice(0, at), others, true) > lastWord(text.slice(0, at), own)) return false;
    if (/^(avec|comprenant) /.test(n) || / compris$/.test(n)) return false;
    if (work.params.some((p) => (p.textLabels ?? []).some((label) => readLabelled(n, label)))) return false;
    // « Ø80 » sur la ligne de gouttière : le diamètre des descentes (une donnée de l'ouvrage), pas la gouttière.
    if (work.params.some((p) => (p.textValues ?? []).some((tv) => tv.keywords.some((k) => normalizeText(k) === n)))) return false;
    const products = identifyProducts(c, ref).candidates;
    return !(products.length > 0 && products.every((x) => x.product.family !== slot.family));
  });
}

function sameDimUnit(a: string, b: string): boolean {
  return sameDim(parseRefUnit(a).dim, parseRefUnit(b).dim);
}

/** Les mots d'une pièce de zinguerie : une ligne de pose qui en nomme un vaut pour cette pièce seulement. */
const PIECE_WORDS = ["solin", "porte-solin", "rive", "egout", "ventilation", "couvre-joint", "couvre joint", "bavette", "couvertine", "habillage", "noue", "abergement", "faitage"];

/** La pièce telle que le devis l'écrit, sans la mention de pose ni la description qui suit (« Bande de ventilation en Z en zinc quartz »). */
export function pieceName(designation: string): string {
  let text = designation.replace(/\s*\((?:fourniture\s*(?:&|et)\s*pose|f\.?\s*(?:&|et)\s*p\.?|fourniture\s+seule|fourniture)\)/gi, " ").replace(/\s+/g, " ").trim();
  const dash = text.search(/\s[-–—]\s/);
  if (dash >= 8) text = text.slice(0, dash);
  const pose = /\s(?:fourniture\s*(?:&|et)\s*pose|fourniture\s+de|pose\s+de)\b/i.exec(text);
  if (pose && pose.index >= 8) text = text.slice(0, pose.index);
  // « Bande de rive zinc dév. 33 » : « dév. » n'est pas une fin de phrase ; seule une nouvelle phrase coupe.
  const stop = /(?:[;:]\s|\.\s+(?=\p{Lu}))/u.exec(text);
  if (stop && stop.index >= 8) text = text.slice(0, stop.index);
  text = text.trim();
  if (text.length > 60) text = `${text.slice(0, 60).replace(/\s+\S*$/, "")}…`;
  return text;
}
