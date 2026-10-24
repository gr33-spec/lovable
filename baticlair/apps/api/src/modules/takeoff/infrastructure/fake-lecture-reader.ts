import {
  tradeIdOf,
  COMMON_LABOR,
  computeWithAnswers,
  containsKeyword,
  DE00000071_LECTURE,
  ficheDeCalcul,
  FICHE_PARAMS_CHANTIER,
  isWithoutSupplyUnit,
  LABOR_ONLY,
  lignesDeLecture,
  normalizeText,
  planDeLecture,
  readDimension,
  referentialFor,
  slotsGivenByQuote,
  validationDeLecture,
  withoutLabour,
  type LectureDevis,
  type LectureFourniture,
  type FicheMetier,
  type LectureQuestion,
  type Referential,
} from "@baticlair/domain";
import type { ReadAttempt } from "../../../platform/ai/document-reader.js";
import { fakeRows } from "../../../platform/ai/fake-table.js";
import type { LectureReader, LectureRequest } from "../application/lecture-reader.js";

/**
 * Lecture SIMULÉE (développement et tests, jamais en ligne). Deux sources :
 *  - les lectures ENREGISTRÉES des devis réels (le numéro du devis dans le texte) : rendues telles quelles ;
 *  - sinon une lecture SIMULÉE du tableau de test (« réf  désignation  qté unité  … ») : elle joue le rôle du modèle,
 *    avec le vocabulaire du référentiel (mots des emplacements et des familles, noms des données), pour tester tout le
 *    parcours sans appel payant. Ce n'est pas la lecture de l'app : en ligne, seul le modèle lit (§51.5).
 */
const RECORDED: { marker: RegExp; lecture: LectureDevis }[] = [{ marker: /\bDE0{4,8}71\b/, lecture: DE00000071_LECTURE }];

export class FakeLectureReader implements LectureReader {
  readonly provider = "fake";

  constructor(private readonly recorded: readonly { marker: RegExp; lecture: LectureDevis }[] = RECORDED) {}

  async lire(request: LectureRequest): Promise<ReadAttempt<LectureDevis> | null> {
    const text = request.document.numberedText;
    const hit = this.recorded.find((r) => r.marker.test(text));
    const lue = hit ? structuredClone(hit.lecture) : lectureSimulee(request);
    // Comme le vrai lecteur : une tranche ne rend que ses lignes (modèle rapide), la synthèse tout sauf les lignes.
    const lecture: LectureDevis =
      request.etape === "lignes" ? { ...lue, metier: null, lots: [], fiche: { donnees: [] }, bref: [], questions: [], contexte: null, notes: [] } : request.etape === "synthese" ? { ...lue, lignes: [] } : lue;
    return {
      provider: this.provider,
      model: request.etape === "lignes" ? "claude-sonnet-5-5" : "claude-opus-5-5",
      usage: { inputTokens: Math.ceil(text.length / 3) + 16000, outputTokens: 1200 },
      status: "success",
      output: lecture,
      errorCode: null,
      durationMs: 1,
    };
  }
}

/** « pente 35° · rampant 5,50 m » → { pente: "35°", rampant: "5,50 m" } (rien si aucun fragment n'a cette forme). */
function fakeDimensions(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of text.split(/\s*(?:·|;|,\s|\.\s|\n)\s*/)) {
    const m = /^([a-zéèêàç' ]+?)\s*:?\s*(\d+(?:[.,]\d+)?\s*(?:mm|cm|ml|m²|m2|m|%|°))\.?$/i.exec(part.trim());
    if (m) out[m[1]!.trim().toLowerCase().replace(/\s+(?:de|du|d')$/, "")] = m[2]!;
  }
  return out;
}

/** La donnée du référentiel que nomme un mot (« pente », « rampant », « longueur rampant ») : par sa clé ou ses mots du devis. */
function paramOf(ref: Referential, name: string): { key: string; unit: string } | null {
  const n = normalizeText(name);
  for (const w of ref.workItems) {
    for (const p of w.params) {
      if (normalizeText(p.key.replace(/_/g, " ")) === n || (p.textLabels ?? []).some((l) => normalizeText(l) === n)) return { key: p.key, unit: p.unit };
    }
  }
  return null;
}

const UNITS: Record<string, string> = { mm: "mm", cm: "cm", m: "m", ml: "m", m2: "m2", "m²": "m2", "%": "%", "°": "°" };

/**
 * Les données écrites dans la ligne, comme le modèle les lit (« dév. 33 », « Ø80 », « 2 descentes », « pente 35° ») :
 * par les mots du devis de chaque donnée du référentiel (`textLabels`, `textCount`, `textValues`), dans l'unité de la donnée.
 */
function donneesDe(ref: Referential, ouvrage: string, designation: string): Record<string, string> {
  const text = normalizeText(designation);
  const out: Record<string, string> = {};
  const work = ref.workItems.find((w) => w.id === ouvrage);
  for (const p of work?.params ?? []) {
    // Les mots du devis d'une donnée, et ceux que tout devis emploie pour un développé (« dév. 33 ») ou un diamètre (« Ø80 », « diam. 80 »).
    const labels = [...(p.textLabels ?? []), ...(/^developpe/.test(p.key) ? ["dev", "dev.", "developpe"] : []), ...(/^diametre/.test(p.key) ? ["ø", "diam", "diam.", "diametre"] : [])];
    for (const label of labels) {
      const l = normalizeText(label).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const m = new RegExp(`(?:^|[^a-z])${l}\\.?\\s*(?:de |: |:|= )?\\s*(\\d+(?:[.,]\\d+)?)\\s*(mm|cm|ml|m²|m2|m|%|°)?(?![a-z0-9])`).exec(text);
      if (m && !out[p.key]) {
        const unit = m[2] ? UNITS[m[2]]! : p.unit;
        out[p.key] = `${m[1]!.replace(",", ".")} ${unit}`.trim();
      }
    }
    for (const word of p.textCount ?? []) {
      const m = new RegExp(`(\\d+)\\s+${normalizeText(word)}s?(?![a-z])`).exec(text);
      if (m && !out[p.key]) out[p.key] = m[1]!;
    }
    for (const v of p.textValues ?? []) {
      if (!out[p.key] && v.keywords.some((k) => containsKeyword(text, normalizeText(k)))) out[p.key] = v.value;
    }
    // « Gouttière demi-ronde 25 » : le développé d'une gouttière s'écrit souvent par son seul nombre, parmi les boutons.
    if (!out[p.key] && /^developpe/.test(p.key) && p.choices) {
      const m = new RegExp(`(?:^|\\s)(${p.choices.map((c) => c.value).join("|")})(?![\\d,.x×])`).exec(text);
      if (m) out[p.key] = `${m[1]!} ${p.unit}`;
    }
  }
  return out;
}

/** L'ouvrage et l'emplacement du référentiel que nomme la désignation : le mot nommé en premier l'emporte (« Couverture en ardoises … au crochet » : l'ardoise), puis le plus précis. */
function emplacementDe(ref: Referential, designation: string): { ouvrage: string; emplacement: string } | null {
  // L'article est en tête de ligne : avant la virgule, le tiret, « pour », « sur » ou « de » (« Chatière de ventilation » n'est pas une bande de ventilation).
  const full = normalizeText(withoutLabour(designation)).replace(/^(?:fourniture et pose|fourniture|pose|remplacement|mise en place)\s+(?:de |d'|des |du )?/, "");
  // D'abord le seul premier mot composé (« chatière »), puis l'article jusqu'à la virgule (« sortie de toit », « bande de rive »).
  for (const text of [full.split(/,| - |\s(?:pour|sur|de|des|du)\s/)[0]!, full.split(/,| - /)[0]!]) {
    const hit = emplacementDans(ref, text);
    if (hit) return hit;
  }
  return null;
}

function emplacementDans(ref: Referential, text: string): { ouvrage: string; emplacement: string } | null {
  let best: { ouvrage: string; emplacement: string; at: number; score: number } | null = null;
  for (const w of ref.workItems) {
    for (const s of w.slots) {
      const words = [...(s.keywords ?? []).map((k) => ({ k: normalizeText(k), own: true })), ...(ref.families.find((f) => f.code === s.family)?.keywords ?? []).map((k) => ({ k: normalizeText(k), own: false }))];
      for (const { k, own } of words) {
        if (!containsKeyword(text, k)) continue;
        const at = text.indexOf(k);
        const score = (own ? 1000 : 0) + k.length;
        if (!best || at < best.at || (at === best.at && score > best.score)) best = { ouvrage: w.id, emplacement: s.key, at, score };
      }
    }
  }
  return best ? { ouvrage: best.ouvrage, emplacement: best.emplacement } : null;
}

const MOTS_VIDES = new Set(["de", "du", "des", "la", "le", "les", "en", "et", "sur", "sous", "sans", "pas", "au", "aux", "ep"]);
const motsDe = (t: string) => normalizeText(t).split(/[^a-z0-9]+/).filter((w) => w.length >= 2 && !MOTS_VIDES.has(w));
const uniteNormale = (u: string) => normalizeText(u).replace(/^ml$/, "m").replace(/^m2$/, "m²").replace(/^m3$/, "m³");

/**
 * §52, une fiche métier : l'ouvrage que nomme la désignation, par la colonne « Ce que le devis écrit » (la phrase dont le
 * plus de mots sont sur la ligne, dans l'unité de la ligne), et les données écrites qui répondent à une question de la
 * fiche (« 20 cm », « Ø125 » : le libellé d'un bouton écrit tel quel). Double de test seulement : en ligne, le modèle lit.
 */
export function ouvrageDeFiche(fiche: FicheMetier, designation: string, unite: string): { ouvrage: string; donnees: Record<string, string> } | null {
  const ligne = new Set(motsDe(designation));
  let best: { ouvrage: string; score: number } | null = null;
  for (const o of fiche.ouvrages) {
    if (uniteNormale(o.unite) !== uniteNormale(unite)) continue;
    for (const phrase of [o.libelle, ...[...o.ecrit.matchAll(/«\s*([^»]+?)\s*»/g)].map((m) => m[1]!)]) {
      const mots = motsDe(phrase);
      if (mots.length === 0) continue;
      const score = mots.filter((w) => ligne.has(w)).length / mots.length;
      if (score >= 0.5 && (!best || score > best.score)) best = { ouvrage: o.id, score };
    }
  }
  if (!best) return null;
  // « 60x60 » et « 60×60 » s'écrivent pareil.
  const texte = designation.toLowerCase().replace(/×/g, "x").replace(/\s+/g, " ");
  const donnees: Record<string, string> = {};
  for (const q of fiche.questions.filter((x) => x.ouvrages.includes(best.ouvrage))) {
    // Le bouton le plus long écrit sur la ligne (« 2,2 m² » plutôt que « 2 m² »).
    const b = [...q.boutons].sort((x, y) => y.label.length - x.label.length).find((x) => x.label.length >= 3 && new RegExp(`(?:^|[^\\p{L}\\d])${x.label.toLowerCase().replace(/×/g, "x").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\d])`, "u").test(texte));
    if (b) donnees[q.cle] = b.valeur;
  }
  return { ouvrage: best.ouvrage, donnees };
}

/** Le produit du référentiel que la ligne nomme (« HP10 », « 32x22 »), par ses appellations. */
function produitDe(ref: Referential, designation: string): string | null {
  const text = normalizeText(designation);
  const hit = ref.products.find((p) => [p.shortLabel, ...p.aliases].some((a) => a && a.length >= 3 && containsKeyword(text, normalizeText(a))));
  return hit?.id ?? null;
}

const labour = (designation: string) => {
  const text = normalizeText(designation);
  return LABOR_ONLY.some((k) => containsKeyword(text, k)) || (COMMON_LABOR.some((k) => text.startsWith(normalizeText(k))) && !/\b(fourniture|fournir|fourni)\b/.test(text));
};

/** La lecture simulée d'un tableau de test : une fourniture par ligne, les données écrites, les questions du calcul. */
export function lectureSimulee(request: LectureRequest): LectureDevis {
  const ref = request.trade ? (referentialFor(request.trade) ?? null) : null;
  const text = request.document.numberedText;
  const rows = fakeRows(text);
  const rowRefs = new Set(rows.map((r) => r.ref));
  // L'en-tête et les notes : une donnée du toit nommée (« pente 35° ») va à la fiche.
  const fiche: LectureDevis["fiche"]["donnees"] = [];
  const headerOf = new Map<string, string>();
  for (const raw of text.split("\n")) {
    const m = /^\[(\d+:\d+)\]\s(.*)$/.exec(raw);
    if (!m || rowRefs.has(m[1]!)) continue;
    for (const [name, value] of Object.entries(fakeDimensions(m[2]!))) {
      const p = ref ? paramOf(ref, name) : null;
      if (p && !fiche.some((d) => d.cle === p.key)) {
        fiche.push({ cle: p.key, libelle: name, valeur: value, origine: "devis", preuve: `en-tête du devis : « ${m[2]!.trim()} »` });
        headerOf.set(p.key, m[2]!.trim());
      }
    }
  }
  // La note de l'artisan envoyée avec le devis (« Pente 35°. Rampant 6 m. ») : le modèle la lit dans la fiche, origine
  // « réponse » (elle passe devant le devis) ; une quantité d'article dans la note n'est jamais une donnée.
  for (const [name, value] of Object.entries(fakeDimensions(request.siteNotes ?? ""))) {
    const p = ref ? paramOf(ref, name) : null;
    if (!p) continue;
    const d = { cle: p.key, libelle: name, valeur: value, origine: "reponse" as const, preuve: "Ta note" };
    const i = fiche.findIndex((x) => x.cle === p.key);
    if (i >= 0) fiche[i] = d;
    else fiche.push(d);
    headerOf.delete(p.key);
  }
  const questions: LectureQuestion[] = [];
  const lignes: LectureDevis["lignes"] = rows.map((row) => {
    const designation = row.cols[row.index - 1]!;
    const quantite = row.quantity.trim();
    const unite = row.unit;
    // « 100 m2 » dans une seule cellule : les colonnes de plus commencent juste après ; « 100 | m2 » : une colonne plus loin.
    const extra = row.cols.slice(row.index + (row.cols[row.index]!.trim() === row.quantity.trim() ? 2 : 1));
    const donnees: Record<string, string> = {};
    const attend: string[] = [];
    const manques: { cle: string; donnee: string }[] = [];
    for (const col of extra) {
      const manque = /^manque\s*:\s*(.+)$/i.exec(col.trim());
      if (manque) {
        // « manque : section des liteaux (25x38, 18x40) » : une question du modèle, boutons tirés de la parenthèse.
        for (const item of manque[1]!.split(/\s*;\s*/)) {
          const paren = /^(.*?)\s*\(([^)]*)\)\s*$/.exec(item.trim());
          const donnee = (paren ? paren[1]! : item).trim();
          const choix = paren ? paren[2]!.split(/,\s*(?=[^\d]|\d+(?:[.,]\d+)?\s*(?:mm|cm|m|x|×)?\s*(?:,|$))/).map((c) => c.trim()).filter(Boolean) : [];
          const cle = normalizeText(donnee).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
          const texte = `${donnee.charAt(0).toUpperCase()}${donnee.slice(1)} ?`;
          if (!questions.some((q) => q.cle === cle)) questions.push({ cle, texte, boutons: choix.map((c) => ({ label: c, valeur: c })), unite: null, donnee, ligne: row.ref });
          manques.push({ cle, donnee });
        }
        continue;
      }
      for (const [name, value] of Object.entries(fakeDimensions(col))) {
        const p = ref ? paramOf(ref, name) : null;
        if (p && readDimension(value)) donnees[p.key] = value;
      }
    }
    if (isWithoutSupplyUnit(unite)) return { ref: row.ref, designation, quantite, unite, role: "hors_quantitatif" as const, fournitures: [] };
    if (labour(designation)) return { ref: row.ref, designation, quantite, unite, role: "pose" as const, fournitures: [] };
    const fm = ref && ref.workItems.length === 0 ? ficheDeCalcul(ref.trade) : null;
    if (fm) {
      const o = ouvrageDeFiche(fm, designation, unite);
      // Une ligne qui ne nomme aucun ouvrage de la fiche : une pièce écrite à l'unité reste telle qu'écrite (§49.1) ; le
      // reste (décapage, fouille, évacuation) est hors commande.
      if (!o && normalizeText(unite) !== "u") return { ref: row.ref, designation, quantite, unite, role: "pose" as const, fournitures: [] };
      const nom = withoutLabour(designation).split(" - ")[0]!.trim() || designation;
      const f: LectureFourniture = { nom, quantite, unite, ouvrage: o?.ouvrage ?? null, emplacement: o ? "ouvrage" : null, donnees: { ...donnees, ...(o?.donnees ?? {}) }, attend, aPreciser: [], precision: null };
      // La pose d'un article écrit (une fenêtre) : l'article lui-même reste aussi, tel qu'écrit (§49.1).
      const garde = o && fm.ouvrages.find((x) => x.id === o.ouvrage)?.garde ? [{ ...f, ouvrage: null, emplacement: null, donnees: {}, attend: [] }] : [];
      return { ref: row.ref, designation, quantite, unite, role: "fourniture" as const, fournitures: [f, ...garde] };
    }
    const place = ref ? emplacementDe(ref, designation) : null;
    const produit = ref && place ? produitDe(ref, designation) : null;
    if (ref && place) for (const [k, v] of Object.entries(donneesDe(ref, place.ouvrage, designation))) donnees[k] ??= v;
    const fourniture: LectureFourniture = {
      nom: withoutLabour(designation).split(" - ")[0]!.trim() || designation,
      quantite,
      unite,
      ouvrage: place?.ouvrage ?? null,
      emplacement: place?.emplacement ?? null,
      donnees: { ...donnees, ...(produit ? { produit } : {}) },
      attend,
      aPreciser: [],
      precision: null,
    };
    // Les autres articles de l'ouvrage que la ligne cite (« posées au crochet », « crochets et naissances compris ») : des fournitures citées, sans quantité.
    const cited: LectureFourniture[] = [];
    if (ref && place) {
      const work = ref.workItems.find((w) => w.id === place.ouvrage)!;
      const text = normalizeText(designation);
      for (const s of work.slots) {
        if (s.key === place.emplacement || s.measureOnly) continue;
        const words = [...(s.keywords ?? []), ...(ref.families.find((f) => f.code === s.family)?.keywords ?? [])].map((k) => normalizeText(k));
        if (words.some((k) => containsKeyword(text, k))) cited.push({ nom: s.label, quantite: null, unite: null, ouvrage: work.id, emplacement: s.key, donnees: {}, attend: [], aPreciser: [], precision: null });
      }
    }
    // Ce qui manque va à l'article qu'il nomme (« traitement des liteaux » : les liteaux cités, pas les tuiles), sinon à la ligne.
    for (const m of manques) {
      const words = normalizeText(m.donnee).split(/[^a-z0-9]+/).filter((w) => w.length >= 5).map((w) => w.replace(/s$/, ""));
      const target = [...cited, fourniture].find((f) => words.some((w) => normalizeText(f.nom).includes(w))) ?? fourniture;
      if (!target.attend.includes(m.cle)) target.attend.push(m.cle);
    }
    return { ref: row.ref, designation, quantite, unite, role: "fourniture" as const, fournitures: [fourniture, ...cited] };
  });
  // Deux documents qui se contredisent (la ligne dit « pente 40° », l'en-tête « Pente 35° ») : une question avec les deux
  // valeurs, pour tout le chantier ; ni l'une ni l'autre n'est lue tant que l'artisan n'a pas tranché.
  for (const ligne of lignes) {
    for (const f of ligne.fournitures) {
      for (const [key, raw] of Object.entries(f.donnees)) {
        const header = fiche.find((d) => d.cle === key && d.origine === "devis");
        const a = readDimension(raw) ?? readDimension(`${raw} ${ref?.workItems.flatMap((w) => w.params).find((p) => p.key === key)?.unit ?? ""}`);
        const b = header?.valeur ? readDimension(header.valeur) : null;
        if (!header || !a || !b || a.value === b.value || a.unit !== b.unit || questions.some((q) => q.cle === key)) continue;
        const def = ref!.workItems.flatMap((w) => w.params).find((p) => p.key === key)!;
        const show = (v: string) => `${v.replace(".", ",")}${a.unit === "u" ? "" : a.unit === "m2" ? " m²" : a.unit === "°" ? "°" : ` ${a.unit}`}`;
        questions.push({
          cle: key,
          texte: `${def.label} : ${show(a.value)} (devis : « ${ligne.designation} »), ou ${show(b.value)} (en-tête du devis : « ${headerOf.get(key) ?? header.preuve ?? ""} ») ?`,
          boutons: [a.value, b.value].map((v) => ({ label: show(v), valeur: v })),
          unite: def.unit,
          donnee: def.label.toLowerCase(),
          ligne: null,
        });
        fiche.splice(fiche.indexOf(header), 1);
        delete f.donnees[key];
        for (const l of lignes) for (const x of l.fournitures) if (x.ouvrage === f.ouvrage && !x.attend.includes(key)) x.attend.push(key);
      }
    }
  }
  // La fiche nomme l'ouvrage principal et sa surface (§51), comme le modèle : la première ligne mesurée (m², ml) d'un ouvrage.
  const principal = lignes.flatMap((l) => l.fournitures.filter((f) => f.ouvrage && f.quantite && /^(m²|m2|ml|m)$/i.test(f.unite ?? "")).map((f) => ({ f, l }))).find(Boolean);
  if (principal && ref) {
    const label = ref.workItems.find((w) => w.id === principal.f.ouvrage)?.label ?? principal.f.nom;
    const preuve = `Devis, ligne ${principal.l.ref} : « ${principal.l.designation} »`;
    fiche.unshift({ cle: "ouvrage", libelle: "Ouvrage", valeur: label.charAt(0).toLowerCase() + label.slice(1), origine: "devis", preuve });
    if (/^(m²|m2)$/i.test(principal.f.unite ?? "")) fiche.splice(1, 0, { cle: "surface", libelle: "Surface", valeur: `${principal.f.quantite} m²`, origine: "devis", preuve });
  }
  // Pas de bref simulé : l'écran dit alors la fiche (données lues et réponses), puis la ville.
  // §52 : les titres « Lot 1 : Électricité » rangent les lignes qui suivent dans leur lot, comme le modèle les rendrait.
  const lots: LectureDevis["lots"] = [];
  for (const raw of text.split("\n")) {
    const m = /^\[(\d+:\d+)\]\s(.*)$/.exec(raw);
    if (!m) continue;
    const titre = /^\s*Lot\s+\d+\s*[:–-]\s*(.+?)\s*$/i.exec(m[2]!.split(/\s{2,}/)[0]!);
    if (titre) lots.push({ metier: tradeIdOf(titre[1]!), libelle: titre[1]!, lignes: [] });
    else if (rowRefs.has(m[1]!) && lots.length > 0) lots.at(-1)!.lignes.push(m[1]!);
  }
  const lecture: LectureDevis = { metier: ref?.trade ?? null, lots: lots.filter((l) => l.lignes.length > 0).length > 1 ? lots.filter((l) => l.lignes.length > 0) : [], fiche: { donnees: fiche }, bref: [], questions, lignes, contexte: null, notes: [] };
  if (!ref) return lecture;
  // Les questions du calcul (ce que le modèle demanderait : les trous du référentiel), une fois, avec leurs mots.
  const ls = lignesDeLecture(lecture);
  const plan = planDeLecture(ref, lecture, ls);
  if (plan.inputs.length === 0) return lecture;
  const engine = computeWithAnswers(ref, plan, {}, {}, { acceptDraft: true }, slotsGivenByQuote(plan, validationDeLecture(ref.trade, ls, plan)));
  for (const q of engine.questions) {
    const param = /^param:([a-z0-9_]+)(?:@(.+))?$/.exec(q.key);
    const product = /^product:([a-z0-9_]+)$/.exec(q.key);
    const cle = param ? param[1]! : product ? `produit_${product[1]!}` : null;
    if (!cle) continue;
    const def = ref.workItems.flatMap((w) => w.params).find((p) => p.key === cle);
    const instance = param?.[2]
      ? plan.lines.find((l) => l.status === "planned" && l.workItemId === param[2])
      : param && !(FICHE_PARAMS_CHANTIER as readonly string[]).includes(cle) && cle !== "consommables"
        ? plan.lines.find((l) => l.status === "planned" && ref.workItems.find((w) => w.id === l.workItemId.split("__")[0])?.params.some((p) => p.key === cle))
        : undefined;
    const ligne = instance?.status === "planned" ? instance.ref.split(".")[0]! : null;
    // Une donnée du chantier se demande une fois ; une donnée de pièce (le façonnage de la noue, de l'abergement), une fois par ligne.
    if (questions.some((x) => x.cle === cle && (x.ligne === ligne || ligne === null || x.ligne === null))) continue;
    questions.push({ cle, texte: q.text, boutons: (q.options ?? []).map((o) => ({ label: o.label, value: o.value })).map((o) => ({ label: o.label, valeur: o.value })), unite: q.unit ?? null, donnee: def?.label.toLowerCase() ?? cle.replace(/^produit_/, "modèle : ").replace(/_/g, " "), ligne });
    // Les fournitures de l'ouvrage qui demande attendent la réponse.
    for (const l of lecture.lignes) {
      for (const f of l.fournitures) {
        const work = plan.lines.find((p) => p.ref === l.ref);
        const wid = work?.status === "planned" ? work.workItemId : null;
        if (wid && (param?.[2] ? wid === param[2] : wid.split("__")[0] === (engine.needs.find((n) => n.question?.key === q.key)?.workItemId ?? "").split("__")[0]) && !f.attend.includes(cle)) f.attend.push(cle);
      }
    }
  }
  return lecture;
}
