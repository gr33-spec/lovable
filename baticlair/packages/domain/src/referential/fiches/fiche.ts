import { normalizeText } from "../../trades/trade-profile.js";
import { fr, trace } from "../../lecture/electricite.js";

/**
 * §52, LE FORMAT COMMUN D'UN RÉFÉRENTIEL MÉTIER (mission du fondateur, 2026-10-19 : « un fichier par métier, format commun
 * en 8 sections ; ajouter un métier = ajouter un fichier, zéro code »). Une fiche est un fichier Markdown de
 * `referentiels/metiers/<code>.md` : un en-tête (code, métier, nom, état, version, moteur) puis huit sections :
 *  1 unités et vocabulaire du devis ; 2 ouvrages ; 3 ratios ; 4 conditionnements ; 5 questions ; 6 test permanent ;
 *  7 points à relire par un artisan ; 8 sources.
 * Les tableaux des sections 2 à 6 sont lus par le code ; le texte reste pour l'artisan relecteur et pour le modèle.
 * Le calcul est celui de l'électricité, généralisé (référentiel électricité §3) : une ligne du devis nomme un OUVRAGE de
 * la fiche (le modèle le dit, jamais un mot cherché par le code, §51.5), chaque ratio de l'ouvrage multiplie sa quantité,
 * les besoins s'additionnent sur tout le devis puis se convertissent dans l'unité que le comptoir vend (section 4).
 */

export type EtatFiche = "brouillon" | "en validation" | "relu";
export type Confiance = "sûr" | "usuel" | "à vérifier";

export interface OuvrageFiche {
  id: string;
  libelle: string;
  /** L'unité dans laquelle le devis compte l'ouvrage (m², m³, m, u). */
  unite: string;
  /** Ce que le devis écrit d'habitude pour cet ouvrage (aide au modèle). */
  ecrit: string;
}

export interface RatioFiche {
  ouvrage: string;
  fourniture: string;
  /** Quantité de fourniture par unité d'ouvrage. */
  ratio: number;
  /** L'unité du besoin (m³, kg, m², m, u). */
  unite: string;
  /** « cle=valeur » : la ligne ne compte que si la réponse (ou la donnée lue) vaut cette valeur. */
  condition: { cle: string; valeur: string } | null;
  confiance: Confiance;
  source: string;
}

export interface ConditionnementFiche {
  fourniture: string;
  /** L'unité commandable (« sac », « palette », « m³ », « rouleau »). */
  venduEn: string;
  /** Ce que contient une unité commandable, dans l'unité du besoin. */
  contenance: number;
  unite: string;
  confiance: Confiance;
  source: string;
}

export interface QuestionFiche {
  cle: string;
  texte: string;
  boutons: { label: string; valeur: string }[];
  ouvrages: string[];
}

export interface TestFiche {
  devis: { ligne: string; designation: string; quantite: string; unite: string; ouvrage: string }[];
  bref: string[];
  questions: string[];
  /** Les réponses données pour calculer les comptes (clé → valeur). */
  reponses: Record<string, string>;
  comptes: { fourniture: string; commande: string }[];
}

export interface FicheMetier {
  /** Nom du fichier (« terrassement »). */
  code: string;
  /** L'identifiant du métier dans BatiClair (« earthworks »), celui que lit le repérage. */
  metier: string;
  nom: string;
  etat: EtatFiche;
  version: string;
  /** « fiche » : calculée par ce fichier ; « tiroir » : le métier garde son tiroir TypeScript (couverture, électricité). */
  moteur: "fiche" | "tiroir";
  /** Le document complet quand le métier garde son tiroir (« docs/referentiel-couverture.md »). */
  document: string | null;
  vocabulaire: string;
  ouvrages: OuvrageFiche[];
  ratios: RatioFiche[];
  conditionnements: ConditionnementFiche[];
  questions: QuestionFiche[];
  test: TestFiche;
  aRelire: string[];
  sources: { id: string; texte: string }[];
}

const nombre = (t: string): number | null => {
  const m = /-?\d+(?:[   ]\d{3})*(?:[.,]\d+)?/.exec(t);
  return m ? Number(m[0].replace(/[   ]/g, "").replace(",", ".")) : null;
};
const vide = (t: string | undefined) => !t || /^[—–-]?$/.test(t.trim());

/** Les lignes d'un tableau Markdown, en-tête en clés normalisées. */
function tableau(texte: string): Record<string, string>[] {
  const lignes = texte.split("\n").map((l) => l.trim()).filter((l) => l.startsWith("|"));
  if (lignes.length < 2) return [];
  const cells = (l: string) => l.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
  const tete = cells(lignes[0]!).map((h) => normalizeText(h));
  return lignes.slice(1).filter((l) => !/^\|[\s:|-]+\|$/.test(l)).map((l) => Object.fromEntries(cells(l).map((c, i) => [tete[i] ?? String(i), c])));
}

const col = (row: Record<string, string>, ...noms: string[]) => {
  for (const n of noms) {
    const k = Object.keys(row).find((x) => x.startsWith(normalizeText(n)));
    if (k !== undefined) return row[k] ?? "";
  }
  return "";
};

function sections(texte: string): Map<number, string> {
  const out = new Map<number, string>();
  const parts = texte.split(/^## (\d+)\.[^\n]*$/m);
  for (let i = 1; i < parts.length; i += 2) out.set(Number(parts[i]), parts[i + 1] ?? "");
  return out;
}

function sousSection(texte: string, titre: string): string {
  const parts = texte.split(/^### ([^\n]+)$/m);
  for (let i = 1; i < parts.length; i += 2) if (normalizeText(parts[i]!).startsWith(normalizeText(titre))) return parts[i + 1] ?? "";
  return "";
}

const puces = (texte: string) => texte.split("\n").map((l) => l.trim()).filter((l) => /^[-*] /.test(l)).map((l) => l.replace(/^[-*] /, "").trim());

const confianceDe = (t: string): Confiance => {
  const n = normalizeText(t);
  return n.startsWith("sur") ? "sûr" : n.startsWith("usuel") ? "usuel" : "à vérifier";
};

/** Lit une fiche ; une fiche mal formée lève une erreur qui nomme le fichier (le build s'arrête, rien de faux ne passe). */
export function parseFicheMetier(texte: string, fichier = "fiche"): FicheMetier {
  const fm = /^---\n([\s\S]*?)\n---/.exec(texte);
  if (!fm) throw new Error(`${fichier} : en-tête --- manquant`);
  const meta = Object.fromEntries(fm[1]!.split("\n").map((l) => /^([a-z_]+):\s*(.*)$/.exec(l.replace(/\s+#.*$/, "").trim())).filter((m): m is RegExpExecArray => !!m).map((m) => [m[1]!, m[2]!.trim()]));
  for (const k of ["code", "metier", "nom", "etat", "version", "moteur"]) if (!meta[k]) throw new Error(`${fichier} : « ${k} » manquant dans l'en-tête`);
  const etat = meta.etat as EtatFiche;
  if (!["brouillon", "en validation", "relu"].includes(etat)) throw new Error(`${fichier} : état « ${meta.etat} » (brouillon, en validation ou relu)`);
  const s = sections(texte.slice(fm[0].length));
  const conditionDe = (t: string) => {
    if (vide(t)) return null;
    const m = /^([a-z0-9_]+)\s*=\s*(.+)$/.exec(t.trim());
    if (!m) throw new Error(`${fichier} : condition illisible « ${t} » (attendu cle=valeur)`);
    return { cle: m[1]!, valeur: m[2]!.trim() };
  };
  const ouvrages = tableau(s.get(2) ?? "").map((r) => ({ id: col(r, "ouvrage"), libelle: col(r, "libelle"), unite: col(r, "unite"), ecrit: col(r, "ce que le devis", "devis") }));
  const ratios = tableau(s.get(3) ?? "").map((r) => ({
    ouvrage: col(r, "ouvrage"),
    fourniture: col(r, "fourniture"),
    ratio: nombre(col(r, "ratio", "quantite")) ?? Number.NaN,
    unite: col(r, "unite"),
    condition: conditionDe(col(r, "condition")),
    confiance: confianceDe(col(r, "confiance")),
    source: col(r, "source"),
  }));
  const conditionnements = tableau(s.get(4) ?? "").map((r) => ({
    fourniture: col(r, "fourniture"),
    venduEn: col(r, "vendu"),
    contenance: nombre(col(r, "contenance")) ?? Number.NaN,
    unite: col(r, "unite"),
    confiance: confianceDe(col(r, "confiance")),
    source: col(r, "source"),
  }));
  const questions = tableau(s.get(5) ?? "").map((r) => ({
    cle: col(r, "cle"),
    texte: col(r, "question"),
    boutons: col(r, "boutons").split("/").map((b) => b.trim()).filter(Boolean).map((b) => {
      const [label, valeur] = b.split("=").map((x) => x.trim()) as [string, string | undefined];
      return { label, valeur: valeur ?? normalizeText(label).replace(/\s+/g, "_") };
    }),
    ouvrages: col(r, "ouvrages").split(",").map((o) => o.trim()).filter(Boolean),
  }));
  const t = s.get(6) ?? "";
  const test: TestFiche = {
    devis: tableau(sousSection(t, "Devis")).map((r) => ({ ligne: col(r, "ligne"), designation: col(r, "designation"), quantite: col(r, "quantite"), unite: col(r, "unite"), ouvrage: col(r, "ouvrage") })),
    bref: puces(sousSection(t, "Bref")),
    questions: puces(sousSection(t, "Questions")).map((q) => q.replace(/`/g, "").split(/\s/)[0]!),
    reponses: Object.fromEntries(
      puces(sousSection(t, "Reponses"))
        .map((r) => /^`?([a-z0-9_]+)`?\s*=\s*(.+)$/.exec(r))
        .filter((m): m is RegExpExecArray => !!m)
        .map((m) => [m[1]!, m[2]!.trim()]),
    ),
    comptes: tableau(sousSection(t, "Comptes")).map((r) => ({ fourniture: col(r, "fourniture"), commande: col(r, "commande") })),
  };
  return {
    code: meta.code!,
    metier: meta.metier!,
    nom: meta.nom!,
    etat,
    version: meta.version!,
    moteur: meta.moteur === "tiroir" ? "tiroir" : "fiche",
    document: meta.document ?? null,
    vocabulaire: (s.get(1) ?? "").trim(),
    ouvrages,
    ratios,
    conditionnements,
    questions,
    test,
    aRelire: puces(s.get(7) ?? ""),
    sources: puces(s.get(8) ?? "").map((p) => {
      const m = /^\*{0,2}(S\d+)\*{0,2}\s*[:.]\s*(.+)$/.exec(p);
      return { id: m?.[1] ?? "", texte: m?.[2] ?? p };
    }),
  };
}

/**
 * Les fautes d'une fiche : « Un ratio sans source ni niveau de confiance est interdit » (mission du fondateur,
 * 2026-10-19), un ratio sur un ouvrage inconnu, une fourniture sans conditionnement, une question sans ouvrage, un
 * test qui ne tombe pas sur ses ouvrages. Une fiche du moteur « tiroir » ne porte que son en-tête et son document.
 */
export function fautesDeFiche(f: FicheMetier): string[] {
  const out: string[] = [];
  if (f.moteur === "tiroir") return f.document ? [] : [`${f.code} : moteur tiroir sans « document »`];
  const ouvrages = new Set(f.ouvrages.map((o) => o.id));
  const sources = new Set(f.sources.map((s) => s.id));
  const cles = new Set(f.questions.map((q) => q.cle));
  if (f.ouvrages.length === 0) out.push(`${f.code} : section 2 sans ouvrage`);
  for (const o of f.ouvrages) if (!/^[a-z0-9-]+$/.test(o.id) || !o.libelle || !o.unite) out.push(`${f.code} : ouvrage mal écrit « ${o.id} »`);
  for (const r of f.ratios) {
    const ici = `${f.code} §3 ${r.ouvrage} → ${r.fourniture}`;
    if (!ouvrages.has(r.ouvrage)) out.push(`${ici} : ouvrage inconnu`);
    if (!Number.isFinite(r.ratio) || r.ratio <= 0) out.push(`${ici} : ratio illisible`);
    if (!r.unite) out.push(`${ici} : unité manquante`);
    if (!r.source || !r.source.split(/[,\s]+/).filter(Boolean).every((x) => sources.has(x))) out.push(`${ici} : source absente de la section 8 (« ${r.source} »)`);
    if (r.condition && !cles.has(r.condition.cle)) out.push(`${ici} : condition sur une question inconnue (« ${r.condition.cle} »)`);
    if (!f.conditionnements.some((c) => c.fourniture === r.fourniture)) out.push(`${ici} : fourniture sans conditionnement (section 4)`);
  }
  for (const c of f.conditionnements) {
    if (!Number.isFinite(c.contenance) || c.contenance <= 0 || !c.venduEn || !c.unite) out.push(`${f.code} §4 ${c.fourniture} : conditionnement illisible`);
    if (!c.source || !c.source.split(/[,\s]+/).filter(Boolean).every((x) => sources.has(x))) out.push(`${f.code} §4 ${c.fourniture} : source absente de la section 8`);
  }
  for (const q of f.questions) {
    if (!/^[a-z0-9_]+$/.test(q.cle) || !q.texte || q.boutons.length < 2) out.push(`${f.code} §5 ${q.cle} : question mal écrite (clé, texte, deux boutons au moins)`);
    for (const o of q.ouvrages) if (!ouvrages.has(o)) out.push(`${f.code} §5 ${q.cle} : ouvrage inconnu « ${o} »`);
  }
  if (f.test.devis.length === 0 || f.test.comptes.length === 0) out.push(`${f.code} §6 : test permanent incomplet (devis et comptes attendus)`);
  for (const l of f.test.devis) if (!vide(l.ouvrage) && !ouvrages.has(l.ouvrage)) out.push(`${f.code} §6 ligne ${l.ligne} : ouvrage inconnu « ${l.ouvrage} »`);
  if (f.aRelire.length === 0) out.push(`${f.code} §7 : aucun point à relire`);
  if (f.sources.length === 0 || f.sources.some((s) => !s.id)) out.push(`${f.code} §8 : sources sans identifiant (« S1 : … »)`);
  return out;
}

export interface LigneFiche {
  id: string;
  ref: string;
  ouvrage: string;
  quantite: number;
  /** Les questions que la ligne attend déjà (celles du modèle). */
  attend: readonly string[];
  /** Les données lues sur la ligne, par clé de question (« dosage » → « 350 »). */
  donnees: Readonly<Record<string, string>>;
}

export interface ArticleFiche {
  key: string;
  label: string;
  quantite: string;
  order: { count: string; unit: string };
  approx: string | null;
  precision: string;
  lineIds: string[];
  /** Les questions dont dépend l'article (une condition de ratio non tranchée, ou une question du modèle). */
  attend: string[];
  total: number;
  /** Le niveau de confiance le plus faible de ses ratios et conditionnements (§7). */
  confiance: Confiance;
}

/** Le pluriel français d'une unité commandable (« panneau » → « panneaux », « sac » → « sacs ») ; le premier mot seulement. */
const pluriel = (u: string, n: number) => {
  if (n <= 1 || /³|²|^(m|kg|l|t)$/i.test(u)) return u;
  const [mot, ...reste] = u.split(" ");
  const p = /[sxz]$/i.test(mot!) ? mot! : /(eau|au|eu)$/i.test(mot!) ? `${mot}x` : /al$/i.test(mot!) ? mot!.replace(/al$/i, "aux") : `${mot}s`;
  return [p, ...reste].join(" ");
};
const ordreConfiance: Confiance[] = ["à vérifier", "usuel", "sûr"];
const plusFaible = (a: Confiance, b: Confiance) => (ordreConfiance.indexOf(a) <= ordreConfiance.indexOf(b) ? a : b);

/**
 * Le calcul d'une fiche : chaque ligne nommée par un ouvrage donne ses fournitures (ratio × quantité), additionnées sur
 * tout le devis, puis converties dans l'unité commandable (section 4), arrondies au-dessus. Une ligne de ratio sous
 * condition (« pose=collee ») ne compte que si la réponse ou la donnée lue la tranche ; tant qu'elle n'est pas tranchée,
 * les fournitures de cet ouvrage attendent la question (orange avec sa question, §51.6), jamais une hypothèse.
 */
export function fournituresDeFiche(fiche: FicheMetier, lignes: readonly LigneFiche[], answers: Readonly<Record<string, unknown>>): ArticleFiche[] {
  const valeur = (cle: string, l: LigneFiche): string | null => {
    const a = answers[`fiche:${cle}`];
    if (typeof a === "string" && a.trim()) return a;
    const d = l.donnees[cle];
    return d && d.trim() ? d : null;
  };
  const egal = (a: string, b: string) => normalizeText(a).replace(/\s+/g, "_") === normalizeText(b).replace(/\s+/g, "_");
  const parFourniture = new Map<string, { parts: { id: string; ref: string; n: number }[]; attend: Set<string>; confiance: Confiance }>();
  for (const l of lignes) {
    const rows = fiche.ratios.filter((r) => r.ouvrage === l.ouvrage);
    const enAttente = new Set<string>();
    for (const r of rows) if (r.condition && valeur(r.condition.cle, l) === null) enAttente.add(r.condition.cle);
    for (const r of rows) {
      if (r.condition) {
        const v = valeur(r.condition.cle, l);
        if (v === null || !egal(v, r.condition.valeur)) continue;
      }
      const e = parFourniture.get(r.fourniture) ?? { parts: [], attend: new Set<string>(), confiance: "sûr" as Confiance };
      e.parts.push({ id: l.id, ref: l.ref, n: l.quantite * r.ratio });
      e.confiance = plusFaible(e.confiance, r.confiance);
      for (const c of [...l.attend, ...enAttente]) e.attend.add(c);
      parFourniture.set(r.fourniture, e);
    }
    // Un ouvrage dont toutes les fournitures sont sous condition non tranchée : une ligne d'attente par condition, pour
    // que la ligne du devis ne disparaisse jamais (§49.1) et que sa question soit là (§51.6).
    if (enAttente.size > 0 && !rows.some((r) => !r.condition || (valeur(r.condition.cle, l) !== null && egal(valeur(r.condition.cle, l)!, r.condition.valeur)))) {
      const e = parFourniture.get(`?${l.ouvrage}`) ?? { parts: [], attend: new Set<string>(), confiance: "à vérifier" as Confiance };
      e.parts.push({ id: l.id, ref: l.ref, n: l.quantite });
      for (const c of enAttente) e.attend.add(c);
      parFourniture.set(`?${l.ouvrage}`, e);
    }
  }
  return [...parFourniture].map(([fourniture, e]) => {
    const total = Math.round(e.parts.reduce((s, p) => s + p.n, 0) * 1000) / 1000;
    const parts = [...e.parts.reduce((m, p) => m.set(p.ref, (m.get(p.ref) ?? 0) + p.n), new Map<string, number>())].map(([ref, n]) => ({ ref, n: Math.round(n * 100) / 100 }));
    const lineIds = [...new Set(e.parts.map((p) => p.id))];
    if (fourniture.startsWith("?")) {
      const o = fiche.ouvrages.find((x) => `?${x.id}` === fourniture)!;
      return { key: `fiche:${fiche.code}:${o.id}`, label: o.libelle, quantite: `${fr(total)} ${o.unite}`, order: { count: fr(total), unit: o.unite }, approx: null, precision: trace(parts, o.unite), lineIds, attend: [...e.attend], total, confiance: e.confiance };
    }
    const unite = fiche.ratios.find((r) => r.fourniture === fourniture)!.unite;
    const c = fiche.conditionnements.find((x) => x.fourniture === fourniture)!;
    const confiance = plusFaible(e.confiance, c.confiance);
    const auPas = normalizeText(c.venduEn) === normalizeText(c.unite);
    const count = auPas ? Math.ceil(Math.round((total / c.contenance) * 1000) / 1000) * c.contenance : Math.ceil(Math.round((total / c.contenance) * 1000) / 1000);
    const uniteCmd = auPas ? c.unite : pluriel(c.venduEn, count);
    const detail = auPas || c.contenance === 1 ? "" : ` de ${fr(c.contenance)} ${c.unite}`;
    return {
      key: `fiche:${fiche.code}:${normalizeText(fourniture).replace(/[^a-z0-9]+/g, "-")}`,
      label: fourniture,
      quantite: `${fr(count)} ${uniteCmd}${detail}`,
      order: { count: fr(count), unit: `${uniteCmd}${detail}` },
      approx: auPas || c.contenance === 1 ? null : `${fr(total)} ${unite} nécessaires`,
      precision: trace(parts, unite),
      lineIds,
      attend: [...e.attend],
      total,
      confiance,
    };
  });
}

/** Les questions de la fiche à poser pour ce devis : celles qu'attend une fourniture et que ni le modèle ni la ligne n'ont tranchées. */
export function questionsDeFiche(fiche: FicheMetier, articles: readonly ArticleFiche[], dejaPosees: ReadonlySet<string>): QuestionFiche[] {
  const attendues = new Set(articles.flatMap((a) => a.attend));
  return fiche.questions.filter((q) => attendues.has(q.cle) && !dejaPosees.has(q.cle));
}

/** Pour le modèle (§51.5) : les ouvrages de la fiche, ce que le devis en écrit, et les questions à poser s'il ne le dit pas. */
export function exportFiche(fiche: FicheMetier): string {
  return [
    `RÉFÉRENTIEL ${fiche.nom} (fiche ${fiche.code}, version ${fiche.version}, métier ${fiche.metier}).`,
    "",
    "LECTURE DU DEVIS DE CE MÉTIER (section 1) :",
    fiche.vocabulaire,
    "",
    "OUVRAGES (section 2) : pour chaque ligne du devis qui en relève, la fourniture a pour « ouvrage » l'identifiant ci-dessous, pour « emplacement » \"ouvrage\", pour quantité la quantité de la ligne dans l'unité de l'ouvrage ; le code en tire les fournitures et leurs conditionnements. Une donnée écrite sur la ligne qui répond à une question ci-dessous va dans « donnees » sous sa clé, et la question n'est pas posée.",
    ...fiche.ouvrages.map((o) => `  - ${o.id} : ${o.libelle} (${o.unite}) ; le devis écrit : ${o.ecrit}`),
    "",
    "QUESTIONS (section 5), à poser seulement si le devis ne le dit pas, avec ces clés et ces boutons :",
    ...fiche.questions.map((q) => `  - ${q.cle} : « ${q.texte} » [${q.boutons.map((b) => `${b.label}=${b.valeur}`).join(" | ")}] (ouvrages : ${q.ouvrages.join(", ")})`),
  ].join("\n");
}
