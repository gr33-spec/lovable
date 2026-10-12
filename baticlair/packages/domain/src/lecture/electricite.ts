/**
 * TEMPS TROIS, électricité (référentiel électricité du fondateur, 11 octobre 2026, `docs/referentiel-electricite.md`) :
 * le code convertit chaque ligne de POINT en ce que le point contient (§1, §3), additionne sur tout le devis, puis passe
 * aux unités commandables (§2) : couronnes de 100 m, boîtes de 100 m, pièces. Zéro IA ; le modèle dit seulement, ligne
 * par ligne, de quel point il s'agit (l'identifiant ci-dessous, dans `ouvrage`).
 *
 * Retour du fondateur (2026-10-12) : « Prises 9 + 9 + 6 : une ligne 24, c'est le quantitatif. Garde la trace des trois
 * lignes du devis dans la raison de la ligne. » Les longueurs par point sont les moyennes du §3 : ratios en cours de
 * validation par un électricien (§7 ; le fondateur, 2026-10-12 : « garde la mention »).
 * Décisions du fondateur (2026-10-12) : une prise réfrigérateur est une prise 16 A ; deux interrupteurs par va-et-vient,
 * plus un permutateur sur une ligne « 3 points ».
 */

/** Les points du §3, tels que le modèle les nomme dans `ouvrage`. */
export const POINTS_ELECTRIQUES: readonly { id: string; label: string }[] = [
  { id: "point-lumineux", label: "Point lumineux simple (simple allumage)" },
  { id: "va-et-vient-1", label: "Va-et-vient 1 point lumineux" },
  { id: "va-et-vient-2", label: "Va-et-vient 2 points lumineux" },
  { id: "va-et-vient-3", label: "Va-et-vient 3 points de commande (permutateur)" },
  { id: "telerupteur", label: "Télérupteur 1 point lumineux" },
  { id: "prise-16a", label: "Prise de courant 16 A+T (réfrigérateur compris)" },
  { id: "prise-cuisson", label: "Prise four ou prise plaque (sortie de câble 32 A)" },
  { id: "prise-20a", label: "Prise lave-vaisselle, lave-linge, sèche-linge, chauffe-eau (20 A)" },
  { id: "prise-hotte", label: "Alimentation hotte (prise 16 A)" },
  { id: "alim-radiateur", label: "Alimentation radiateur (sortie de câble avec fil pilote)" },
  { id: "prise-rj45", label: "Prise RJ45" },
  { id: "prise-tv", label: "Prise TV" },
];

/** Les anciens ouvrages du tiroir, lus comme leurs points. */
const ALIAS: Record<string, string> = { prises: "prise-16a", "points-lumineux": "point-lumineux" };

type Conditionnement = { taille: number; une: string; plusieurs: string };
const COURONNE: Conditionnement = { taille: 100, une: "couronne de 100 m", plusieurs: "couronnes de 100 m" };
const BOITE_100: Conditionnement = { taille: 100, une: "boîte de 100 m", plusieurs: "boîtes de 100 m" };

interface Article {
  label: string;
  unite: "u" | "m";
  conditionnement?: Conditionnement;
  /** Un article d'appareillage : sa gamme et sa teinte viennent du devis et des réponses. */
  appareillage?: boolean;
}
const A = {
  interrupteur: { label: "Interrupteur simple allumage", unite: "u", appareillage: true },
  vaEtVient: { label: "Interrupteur va-et-vient", unite: "u", appareillage: true },
  permutateur: { label: "Permutateur", unite: "u", appareillage: true },
  poussoir: { label: "Bouton poussoir", unite: "u", appareillage: true },
  telerupteur: { label: "Télérupteur modulaire", unite: "u" },
  prise16: { label: "Prise 2P+T 16 A", unite: "u", appareillage: true },
  prise20: { label: "Prise 2P+T 20 A", unite: "u", appareillage: true },
  sortie32: { label: "Sortie de câble 32 A", unite: "u", appareillage: true },
  sortieRadiateur: { label: "Sortie de câble avec fil pilote (radiateur)", unite: "u", appareillage: true },
  rj45: { label: "Prise RJ45 grade 2", unite: "u", appareillage: true },
  tv: { label: "Prise TV", unite: "u", appareillage: true },
  boite40: { label: "Boîte d'encastrement Ø67 prof. 40", unite: "u" },
  boite50: { label: "Boîte d'encastrement Ø67 prof. 50", unite: "u" },
  dcl: { label: "Boîte DCL plafond avec douille", unite: "u" },
  c3g15: { label: "Câble rigide 3G1,5", unite: "m", conditionnement: COURONNE },
  c4g15: { label: "Câble rigide 4G1,5", unite: "m", conditionnement: COURONNE },
  c2x15: { label: "Câble rigide 2×1,5", unite: "m", conditionnement: COURONNE },
  c3g25: { label: "Câble rigide 3G2,5", unite: "m", conditionnement: COURONNE },
  c3g6: { label: "Câble rigide 3G6", unite: "m", conditionnement: COURONNE },
  grade2: { label: "Câble réseau grade 2", unite: "m", conditionnement: BOITE_100 },
  coax: { label: "Câble coaxial TV", unite: "m", conditionnement: COURONNE },
  gaine20: { label: "Gaine ICTA Ø20", unite: "m", conditionnement: COURONNE },
  gaine25: { label: "Gaine ICTA Ø25", unite: "m", conditionnement: COURONNE },
} satisfies Record<string, Article>;
type Cle = keyof typeof A;

/** §3 : ce que contient un point, par point (multiplié par la quantité du devis). */
const CONVERSIONS: Record<string, readonly [Cle, number][]> = {
  "point-lumineux": [["interrupteur", 1], ["boite40", 1], ["dcl", 1], ["c3g15", 10], ["gaine20", 10]],
  "va-et-vient-1": [["vaEtVient", 2], ["boite40", 2], ["dcl", 1], ["c3g15", 10], ["c4g15", 6], ["gaine20", 16]],
  "va-et-vient-2": [["vaEtVient", 2], ["boite40", 2], ["dcl", 2], ["c3g15", 14], ["c4g15", 6], ["gaine20", 20]],
  // Retour du fondateur (2026-10-12) : « deux interrupteurs par VV, sauf ligne « 3 points » = permutateur en plus ». La
  // troisième commande ajoute une navette (4G1,5 6 m, gaine 6 m), sur le modèle du va-et-vient 1 point : ratio en cours de validation (§7).
  "va-et-vient-3": [["vaEtVient", 2], ["permutateur", 1], ["boite40", 3], ["dcl", 1], ["c3g15", 10], ["c4g15", 12], ["gaine20", 22]],
  telerupteur: [["poussoir", 3], ["telerupteur", 1], ["boite40", 3], ["dcl", 1], ["c3g15", 10], ["c2x15", 12], ["gaine20", 22]],
  "prise-16a": [["prise16", 1], ["boite40", 1], ["c3g25", 8], ["gaine20", 8]],
  "prise-cuisson": [["sortie32", 1], ["boite50", 1], ["c3g6", 8], ["gaine25", 8]],
  "prise-20a": [["prise20", 1], ["boite40", 1], ["c3g25", 8], ["gaine20", 8]],
  "prise-hotte": [["prise16", 1], ["boite40", 1], ["c3g25", 8], ["gaine20", 8]],
  "alim-radiateur": [["sortieRadiateur", 1], ["boite40", 1], ["c4g15", 8], ["gaine20", 8]],
  "prise-rj45": [["rj45", 1], ["boite40", 1], ["grade2", 12], ["gaine20", 12]],
  "prise-tv": [["tv", 1], ["boite40", 1], ["coax", 12], ["gaine20", 12]],
};

/** Le point d'une fourniture (son `ouvrage`), ou null si ce n'en est pas un. */
export function pointElectrique(ouvrage: string | null | undefined): string | null {
  if (!ouvrage) return null;
  const id = ALIAS[ouvrage] ?? ouvrage;
  return CONVERSIONS[id] ? id : null;
}

export interface LignePoint {
  /** L'identifiant de la ligne (repère de lecture ou ligne enregistrée) et son repère dans le devis. */
  id: string;
  ref: string;
  point: string;
  quantite: number;
  /** Les questions du modèle que la ligne attend (la teinte de l'appareillage). */
  attend: readonly string[];
}

export interface ArticleElectrique {
  key: string;
  label: string;
  /** « 161 pièces », « 15 couronnes de 100 m ». */
  quantite: string;
  order: { count: string; unit: string };
  /** Le besoin en mètres d'un article au mètre (« 1 472 m à poser »). */
  approx: string | null;
  /** La trace des lignes du devis (« 9 + 9 + 6, lignes 12, 25 et 38 »). */
  precision: string;
  lineIds: string[];
  /** Les questions que ses lignes attendent (l'appareillage seulement). */
  attend: string[];
  /** Le total, dans l'unité du besoin (pièces ou mètres), pour les tests et la demande de prix. */
  total: number;
}

const fr = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 2 }).replace(/ | /g, " ");

/** Les lignes du devis qui donnent une ligne de liste, en trace lisible : jusqu'à six, ensuite le compte. */
function trace(parts: readonly { ref: string; n: number }[], unite: "u" | "m"): string {
  const shown = parts.slice(0, 6);
  const somme = shown.map((p) => fr(p.n)).join(" + ") + (parts.length > shown.length ? ` + … (${parts.length} lignes)` : "");
  // Le repère enregistré d'une ligne (« 1:003 », document puis ligne) se dit comme au devis : « 3 ».
  const refs = shown.map((p) => p.ref.replace(/^\d+:0*(?=\d)/, ""));
  const lignes = refs.length === 1 ? `ligne ${refs[0]}` : `lignes ${refs.slice(0, -1).join(", ")} et ${refs[refs.length - 1]}${parts.length > shown.length ? ", …" : ""}`;
  return `${unite === "m" ? `${somme} m` : somme}, ${lignes} du devis`;
}

/**
 * §3 puis §2 : les fournitures de toutes les lignes de point, additionnées sur le devis, dans l'ordre où elles
 * apparaissent ; un article au mètre se commande en couronnes (ou boîtes) de 100 m, arrondies au-dessus, sans chute
 * ajoutée (« la moyenne par point la contient déjà »).
 */
export function fournituresElectriques(lignes: readonly LignePoint[]): ArticleElectrique[] {
  const parArticle = new Map<Cle, { parts: { id: string; ref: string; n: number }[]; attend: Set<string> }>();
  for (const l of lignes) {
    for (const [cle, parPoint] of CONVERSIONS[l.point] ?? []) {
      const e = parArticle.get(cle) ?? { parts: [], attend: new Set<string>() };
      e.parts.push({ id: l.id, ref: l.ref, n: l.quantite * parPoint });
      if ((A[cle] as Article).appareillage) for (const c of l.attend) e.attend.add(c);
      parArticle.set(cle, e);
    }
  }
  return [...parArticle].map(([cle, e]) => {
    const article = A[cle] as Article;
    const total = Math.round(e.parts.reduce((s, p) => s + p.n, 0) * 100) / 100;
    // Une ligne du devis qui revient (la même référence) compte une fois dans la trace, avec son total.
    const parts = [...e.parts.reduce((m, p) => m.set(p.ref, (m.get(p.ref) ?? 0) + p.n), new Map<string, number>())].map(([ref, n]) => ({ ref, n }));
    const c = article.conditionnement;
    const count = c ? Math.ceil(total / c.taille) : Math.ceil(total);
    return {
      key: `elec:${cle}`,
      label: article.label,
      quantite: c ? `${count} ${count > 1 ? c.plusieurs : c.une}` : `${fr(count)} ${count > 1 ? "pièces" : "pièce"}`,
      order: { count: String(count), unit: c ? (count > 1 ? c.plusieurs : c.une) : count > 1 ? "pièces" : "pièce" },
      approx: c ? `${fr(total)} m à poser` : null,
      precision: trace(parts, article.unite),
      lineIds: [...new Set(e.parts.map((p) => p.id))],
      attend: [...e.attend],
      total,
    };
  });
}

/** Pour le modèle : la liste des points, ajoutée à l'export du référentiel électricité. */
export function pointsPourLecture(): string {
  return [
    "POINTS ÉLECTRIQUES (référentiel électricité §3) : pour une ligne de point, la fourniture a pour « ouvrage » l'identifiant du point, pour « emplacement » \"point\", pour quantité le nombre de points ; le code en tire l'appareil, les boîtes, les câbles et les gaines.",
    ...POINTS_ELECTRIQUES.map((p) => `  - ${p.id} : ${p.label}`),
  ].join("\n");
}
