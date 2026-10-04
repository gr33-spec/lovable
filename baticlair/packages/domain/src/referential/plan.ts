import { Decimal } from "../shared/decimal.js";
import { keyCharacteristics } from "../takeoff/characteristics.js";
import { validateTakeoffLine } from "../takeoff/validation.js";
import { keywordPosition, normalizeText, type TradeProfile } from "../trades/trade-profile.js";
import type { ChantierContext, SiteFact } from "./context.js";
import { paramsFromContext } from "./context.js";
import type { CompanyPreferences, SlotChoice, WorkItemInput } from "./engine.js";
import type { ProductFamily, Referential, Slot, WorkItemType } from "./model.js";
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
  characteristicsBySlot: Record<string, string[]>;
  /** Questions de cohérence (deux valeurs différentes pour la même donnée), en phrases. */
  conflicts: string[];
  /**
   * Les mêmes, structurées : deux sources (devis, en-tête lu, croquis) qui ne disent pas la même chose, sans
   * réponse de l'artisan. Jamais tranchées en silence : une question avec les deux valeurs en boutons.
   */
  contradictions: { workItemId: string; key: string; label: string; unit: string; facts: { value: string; unit: string; evidence: string }[] }[];
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
const TEXT_UNITS: Record<string, string> = { mm: "mm", cm: "cm", m: "m", ml: "m", m2: "m2", "m²": "m2", "%": "%", "°": "°" };

/** « entraxe 90 cm », « hauteur : 4m », « pureau de 34,3 cm » → valeur et unité, seulement si elles sont écrites. */
function readLabelled(normalized: string, label: string): { value: string; unit: string } | null {
  const pos = keywordPosition(normalized, label);
  if (pos < 0) return null;
  const after = normalized.slice(pos + normalizeText(label).length);
  const m = /^[a-z]{0,2}\s*(?:de |d |: |:|= |a )?\s*(\d+(?:[.,]\d+)?)\s*(mm|cm|ml|m²|m2|m|%|°)(?![a-z0-9])/.exec(after);
  if (!m) return null;
  return { value: m[1]!.replace(",", "."), unit: TEXT_UNITS[m[2]!]! };
}

/** Une valeur lue par le prompt A (« 35° », « 5,50 m », « 45 % », « 0,65 mm ») → valeur et unité du référentiel. */
function readDimension(raw: string): { value: string; unit: string } | null {
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
  const add = (name: string, raw: string, evidence: string) => {
    const found = readDimension(raw);
    if (!found) return;
    const n = normalizeText(name);
    for (const p of params) {
      if (normalizeText(p.key.replace(/_/g, " ")) !== n && !(p.textLabels ?? []).some((l) => normalizeText(l) === n)) continue;
      if (!sameDimUnit(p.unit, found.unit)) continue;
      const asRef = isAngleUnit(p.unit) && found.unit === "%" ? { value: percentSlopeToDegrees(new Decimal(found.value)).toString(), unit: p.unit } : found;
      if (facts.some((f) => f.key === p.key && f.value === asRef.value && f.unit === asRef.unit)) continue;
      facts.push({ key: p.key, ...asRef, evidence: `${evidence} (« ${name} : ${raw.trim()} »)`, origin: "devis" });
    }
  };
  for (const line of lines) for (const [name, raw] of Object.entries(line.dimensions ?? {})) if (typeof raw === "string") add(name, raw, `Devis, ${line.ref}`);
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
  const families = covered ? ref.families.filter((f) => f.keywords?.length).map((f) => ({ item: f.code, keywords: f.keywords! })) : [];
  const read = lines.map((line) => {
    const v = validateTakeoffLine({ id: line.ref, designation: line.designation, quantityRaw: line.quantity, unitRaw: line.unit, source: "client_quote" }, profile);
    const text = normalizeText(line.designation);
    const general = v.kind === "labor" ? null : earliest(text, families);
    // « Tuiles (… tuiles canal …) » : la famille générale lue en premier est précisée par une famille plus précise nommée ensuite.
    const precise = general ? ref.families.find((f) => f.refines === general && (f.keywords ?? []).some((k) => keywordPosition(text, k) >= 0)) : undefined;
    return { line, v, text, family: precise?.code ?? general };
  });

  // 1. Les ouvrages présents : ceux qu'une ligne déclenche.
  const active = ref.workItems.filter((w) => read.some((r) => r.family && w.triggers.includes(r.family)));

  const plans: LinePlan[] = [];
  const facts: SiteFact[] = [];
  const products = new Map<string, Map<string, SlotChoice | "conflict">>();
  const mentioned = new Map<string, Set<string>>();
  const characteristicsBySlot: Record<string, string[]> = {};

  for (const { line, v, text, family } of read) {
    if (v.kind === "labor") {
      plans.push({ ref: line.ref, status: "not_material" });
      continue;
    }
    const work = family ? active.find((w) => w.slots.some((s) => s.family === family)) : undefined;
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
    const mentions = work.slots
      .filter((s) => s.family !== slot.family && slotWords(ref, s).some((k) => keywordPosition(text, k) >= 0))
      .map((s) => s.key);
    const seen = mentioned.get(work.id) ?? new Set<string>();
    [slot.key, ...mentions].forEach((k) => seen.add(k));
    mentioned.set(work.id, seen);

    // 3. Les produits nommés par la ligne (un seul candidat par famille, sinon le moteur posera la question).
    const chosen = products.get(work.id) ?? new Map<string, SlotChoice | "conflict">();
    for (const s of [slot, ...work.slots.filter((x) => mentions.includes(x.key))]) {
      const found = identifyProducts(line.designation, ref, s.family).candidates;
      if (found.length !== 1) continue;
      const choice: SlotChoice = { productId: found[0]!.product.id, origin: found[0]!.product.generic ? "devis" : "alias" };
      const before = chosen.get(s.key);
      chosen.set(s.key, before && before !== "conflict" && before.productId !== choice.productId ? "conflict" : (before ?? choice));
    }
    products.set(work.id, chosen);

    // 4. Les données écrites : la quantité de la ligne, et les valeurs annoncées par leur nom.
    const unit = v.unit ? LINE_UNITS[v.unit] : undefined;
    const fromQuantity = work.params.filter((x) => x.fromLineQuantity && (!x.forSlots || x.forSlots.includes(slot.key)));
    let measureInText: { value: string; unit: string } | undefined;
    if (unit && v.quantity && fromQuantity.some((p) => sameDimUnit(p.unit, unit))) {
      for (const p of fromQuantity.filter((x) => sameDimUnit(x.unit, unit))) {
        facts.push({ key: p.key, value: v.quantity.toFixed(), unit, evidence: `Devis, ${line.ref}`, origin: "devis", workItemId: work.id });
      }
    } else {
      // Quantité en forfait, ensemble ou absente, mais « 200 m² » écrit dans la désignation : c'est la
      // mesure de l'ouvrage (règle du fondateur : un couvreur qui parle de 200 m² parle de toiture).
      // Une seule mesure de la bonne dimension, sinon rien n'est deviné.
      for (const p of fromQuantity) {
        const found = measuresInText(text).filter((m) => sameDimUnit(p.unit, m.unit));
        if (found.length !== 1) continue;
        measureInText = found[0]!;
        facts.push({ key: p.key, ...found[0]!, evidence: `Devis, ${line.ref} (« ${found[0]!.value.replace(".", ",")} ${found[0]!.unit === "m2" ? "m²" : found[0]!.unit} » dans le texte)`, origin: "devis", workItemId: work.id });
      }
    }
    for (const p of work.params) {
      for (const label of p.textLabels ?? []) {
        const found = readLabelled(text, label);
        if (!found || !sameDimUnit(p.unit, found.unit)) continue;
        // « pente 45 % » dans un devis : gardée en degrés, l'unité de la pente partout dans BatiClair.
        const asRef = isAngleUnit(p.unit) && found.unit === "%" ? { value: percentSlopeToDegrees(new Decimal(found.value)).toString(), unit: p.unit } : found;
        facts.push({ key: p.key, ...asRef, evidence: `Devis, ${line.ref} (« ${label} »)`, origin: "devis" });
      }
    }
    const chars = productCharacteristics(ref, work, slot, line.designation);
    if (chars.length > 0) characteristicsBySlot[slot.key] = [...new Set([...(characteristicsBySlot[slot.key] ?? []), ...chars])];
    plans.push({ ref: line.ref, status: "planned", workItemId: work.id, slot: slot.key, mentions, characteristics: chars, ...(measureInText ? { measureInText } : {}) });
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
  for (const f of extraFacts) {
    if (f.origin !== "artisan" && fromText.some((x) => x.key === f.key && sameAs(x, f))) continue;
    facts.push(f);
  }
  const context: ChantierContext = { facts };
  const conflicts: string[] = [];
  const contradictions: QuotePlan["contradictions"] = [];
  const inputs: WorkItemInput[] = active
    .filter((w) => mentioned.has(w.id))
    .map((w: WorkItemType) => {
      const { params, conflicts: c } = paramsFromContext(context, w);
      c.forEach((x) => {
        const def = w.params.find((p) => p.key === x.key);
        conflicts.push(`${def?.label ?? x.key} : ${x.facts.map((f) => `${f.value} ${f.unit} (${f.evidence})`).join(" / ")}`);
        contradictions.push({ workItemId: w.id, key: x.key, label: def?.label ?? x.key, unit: def?.unit ?? x.facts[0]!.unit, facts: x.facts.map((f) => ({ value: f.value, unit: f.unit, evidence: f.evidence })) });
      });
      const chosen = [...(products.get(w.id) ?? new Map()).entries()].filter((e): e is [string, SlotChoice] => e[1] !== "conflict");
      return {
        workItemId: w.id,
        params,
        products: Object.fromEntries(chosen),
        mentioned: [...mentioned.get(w.id)!],
        ...(preferences ? { preferences } : {}),
      };
    });
  return { lines: plans, inputs, context, characteristicsBySlot, conflicts: [...new Set(conflicts)], contradictions };
}

/**
 * Caractéristiques du devis qui décrivent le PRODUIT de cet emplacement
 * (coloris, matière, section) : on retire ce qui est déjà ailleurs —
 * une donnée du chantier lue (« entraxe 90 cm »), un produit d'une autre
 * famille (« pour tuiles HP10 » sur une ligne de liteaux), un composant
 * cité (« crochets et naissances compris » devient ses propres lignes).
 */
function productCharacteristics(ref: Referential, work: WorkItemType, slot: Slot, designation: string): string[] {
  return keyCharacteristics(designation).filter((c) => {
    const n = normalizeText(c);
    if (/^(avec|comprenant) /.test(n) || / compris$/.test(n)) return false;
    if (work.params.some((p) => (p.textLabels ?? []).some((label) => readLabelled(n, label)))) return false;
    const products = identifyProducts(c, ref).candidates;
    return !(products.length > 0 && products.every((x) => x.product.family !== slot.family));
  });
}

function sameDimUnit(a: string, b: string): boolean {
  return sameDim(parseRefUnit(a).dim, parseRefUnit(b).dim);
}
