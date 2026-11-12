/**
 * ACHATS GROUPÉS V1 (Greg, 7 novembre 2026 : « La V5.2 est validée… reprendre le développement local de la V1 des achats
 * groupés, dans le périmètre strictement défini par la V5.2 »). Un achat groupé = UN produit précis, une zone (le
 * département de l'entreprise), un mode de réception, une période de besoin. Code pur : produits autorisés (liste
 * blanche et caractéristiques indispensables), classement par lot, circuit d'une ligne, cycle d'états de l'achat et du
 * besoin, volumes (indicatif, confirmé, confirmé pour la consultation), règle des 5 entreprises, calcul de l'offre.
 *
 * Hors V1 (états futurs, jamais atteignables ici) : « Offre acceptée », le second tour, toute commande.
 */
import { normalizeText } from "../trades/trade-profile.js";
import { lireReference } from "./reference-stricte.js";

/* --------------------------------------------------------------------------------------------------- les lots */

export const LOTS_V1 = [
  { id: "couverture", libelle: "Couverture" },
  { id: "zinguerie", libelle: "Zinguerie" },
  { id: "isolation", libelle: "Isolation" },
  { id: "bois", libelle: "Bois" },
  { id: "electricite", libelle: "Électricité" },
  { id: "plomberie", libelle: "Plomberie" },
  { id: "maconnerie", libelle: "Maçonnerie" },
  { id: "platrerie", libelle: "Plâtrerie" },
  { id: "menuiserie", libelle: "Menuiserie" },
  { id: "peinture", libelle: "Peinture" },
  { id: "divers", libelle: "Divers" },
] as const;
export type LotV1 = (typeof LOTS_V1)[number]["id"];
export const estLotV1 = (v: string): v is LotV1 => LOTS_V1.some((l) => l.id === v);
export const libelleLot = (lot: LotV1) => LOTS_V1.find((l) => l.id === lot)!.libelle;
/**
 * LA ZINGUERIE FAIT PARTIE DE LA COUVERTURE, PARTOUT (Greg, 12 novembre 2026 : « même en achat groupé ; ça doit faire
 * partie des sous-menus de la couverture »). Le lot « zinguerie » reste rangé tel quel (aucune donnée réécrite) : il se
 * lit SOUS la couverture, et le filtre « Couverture » le comprend.
 */
export const LOT_PARENT_V1: Readonly<Partial<Record<LotV1, LotV1>>> = { zinguerie: "couverture" };
/** Les lots d'un filtre : lui, puis ses sous-lots (« couverture » → couverture, zinguerie). */
export const lotsComprisV1 = (lot: LotV1): LotV1[] => [lot, ...LOTS_V1.map((l) => l.id).filter((id) => LOT_PARENT_V1[id] === lot)];

/** Les mots qui rangent une ligne dans un lot ; l'ordre compte (« fenêtre de toit » est de la couverture, pas de la menuiserie). */
const MOTS_DES_LOTS: readonly [LotV1, RegExp][] = [
  ["zinguerie", /\b(gouttieres?|zinc|descentes? (ep|eaux pluviales)|dauphins?|cheneaux?|noues?|solins?|naissances?|talons?|crochets? de gouttiere)\b/],
  ["couverture", /\b(ardoises?|tuiles?|faitages?|faitieres?|closoirs?|crochets?|ecrans? (de )?sous ?toiture|velux|fenetres? de toit|chatieres?|rives?|liteaux?|contre ?liteaux?|voliges?|abergements?|sorties? de toit)\b/],
  ["electricite", /\b(cables?|r2v|h07|gaines?|icta|disjoncteurs?|prises?|interrupteurs?|tableaux? electriques?|wago|dominos?|spots?|luminaires?|boites? d.encastrement)\b/],
  ["plomberie", /\b(tubes? (cuivre|per|multicouche)|per|multicouche|robinets?|siphons?|wc|lavabos?|evacuations?|chauffe ?eau|vannes?)\b/],
  ["isolation", /\b(isolants?|laines? (de )?(roche|verre|bois)|polystyrenes?|pir|polyurethane|pare ?vapeur|ouate)\b/],
  ["platrerie", /\b(plaques? de platre|placo|placoplatre|ba ?13|ba ?18|rails?|montants?|bandes? a joint|enduits? a joint)\b/],
  ["maconnerie", /\b(ciments?|parpaings?|mortiers?|sables?|betons?|agglos?|briques?|chaux|graviers?|treillis|fers? a beton|enduits? de facade)\b/],
  ["bois", /\b(chevrons?|bastaings?|madriers?|solives?|pannes?|osb|contreplaques?|bois|lambourdes?)\b/],
  ["menuiserie", /\b(portes?|fenetres?|volets?|plinthes?|parquets?|huisseries?)\b/],
  ["peinture", /\b(peintures?|sous ?couches?|lasures?|vernis|impressions?)\b/],
];

const texteDe = (designation: string) => ` ${normalizeText(designation.replace(/m²/g, "m2")).replace(/[^a-z0-9.,×*]+/g, " ").replace(/\s+/g, " ")} `;

/** Le lot d'une ligne, lu dans sa désignation (saisie manuelle comprise) ; l'artisan le corrige ligne par ligne. */
export function lotDeLaLigne(designation: string): LotV1 {
  const t = texteDe(designation);
  return MOTS_DES_LOTS.find(([, re]) => re.test(t))?.[0] ?? "divers";
}

/* ------------------------------------------------------------------------------ les produits autorisés (V1) */

export interface UniteV1 {
  code: string;
  singulier: string;
  pluriel: string;
  feminin: boolean;
}
const U = {
  piece: { code: "piece", singulier: "pièce", pluriel: "pièces", feminin: true },
  metre: { code: "m", singulier: "m", pluriel: "m", feminin: false },
  m2: { code: "m2", singulier: "m²", pluriel: "m²", feminin: false },
  rouleau: { code: "rouleau", singulier: "rouleau", pluriel: "rouleaux", feminin: false },
  panneau: { code: "panneau", singulier: "panneau", pluriel: "panneaux", feminin: false },
  palette: { code: "palette", singulier: "palette", pluriel: "palettes", feminin: true },
  couronne: { code: "couronne", singulier: "couronne", pluriel: "couronnes", feminin: true },
  botte: { code: "botte", singulier: "botte", pluriel: "bottes", feminin: true },
  paquet: { code: "paquet", singulier: "paquet", pluriel: "paquets", feminin: false },
  longueur: { code: "longueur", singulier: "longueur", pluriel: "longueurs", feminin: true },
} as const satisfies Record<string, UniteV1>;

export interface OptionV1 {
  valeur: string;
  libelle: string;
}
export interface CaracteristiqueV1 {
  attribut: string;
  libelle: string;
  feminin: boolean;
  options: readonly OptionV1[];
  /** Comment la valeur s'écrit dans le nom du produit (par défaut : le libellé de l'option, ou la valeur). */
  ecrire?: (valeur: string) => string;
}
export interface ConditionnementV1 {
  unite: UniteV1;
  /** Une valeur proposée, jamais garantie : l'artisan la confirme ou la corrige (« Confirmer 480 pièces par palette »). */
  parDefaut: number | null;
}
export interface ProduitV1 {
  type: string;
  libelle: string;
  lot: LotV1;
  unite: UniteV1;
  conditionnements: readonly ConditionnementV1[];
  caracteristiques: readonly CaracteristiqueV1[];
  /** À partir de cette quantité (unité de référence), la ligne est « Recommandée » ; en dessous, « Compatible ». */
  seuilRecommande: number;
  /** Le nom exact, caractéristiques comprises (« Ardoise naturelle 32 × 22 · Espagne · 1er choix · 5 mm »). */
  nom: (valeur: (attribut: string) => string) => string;
}

const mm = (v: string) => `${v.replace(".", ",")} mm`;
const fois = (v: string) => v.replace(/x/g, " × ");
const opt = (valeurs: readonly (readonly [string, string])[]): OptionV1[] => valeurs.map(([valeur, libelle]) => ({ valeur, libelle }));

/**
 * La LISTE BLANCHE de la V1 : seules ces familles entrent dans un achat groupé ; les autres restent dans le quantitatif
 * (« Pas encore ouvert aux achats groupés »). Chaque famille a ses caractéristiques indispensables, et seulement elles.
 */
export const PRODUITS_V1: readonly ProduitV1[] = [
  {
    type: "ardoise",
    libelle: "Ardoise naturelle",
    lot: "couverture",
    unite: U.piece,
    conditionnements: [{ unite: U.palette, parDefaut: 480 }],
    caracteristiques: [
      { attribut: "format", libelle: "Format", feminin: false, options: opt([["32x22", "32 × 22"], ["35x25", "35 × 25"], ["40x25", "40 × 25"], ["30x20", "30 × 20"], ["50x25", "50 × 25"]]), ecrire: fois },
      { attribut: "origine", libelle: "Origine", feminin: true, options: opt([["espagne", "Espagne"], ["france", "France"], ["galles", "Pays de Galles"], ["bresil", "Brésil"], ["portugal", "Portugal"]]) },
      { attribut: "qualite", libelle: "Choix", feminin: false, options: opt([["1", "1er choix"], ["2", "2e choix"], ["3", "3e choix"], ["extra", "Extra"]]) },
      { attribut: "epaisseur", libelle: "Épaisseur", feminin: true, options: opt([["3.5", "3,5 mm"], ["4.5", "4,5 mm"], ["5", "5 mm"], ["5.5", "5,5 mm"], ["7", "7 mm"]]), ecrire: mm },
    ],
    seuilRecommande: 2000,
    nom: (v) => `Ardoise naturelle ${v("format")} · ${v("origine")} · ${v("qualite")} · ${v("epaisseur")}`,
  },
  {
    type: "tuile",
    libelle: "Tuile",
    lot: "couverture",
    unite: U.piece,
    conditionnements: [{ unite: U.palette, parDefaut: null }],
    caracteristiques: [
      { attribut: "marque", libelle: "Marque", feminin: true, options: opt([["terreal", "Terreal"], ["edilians", "Edilians"], ["monier", "Monier"], ["koramic", "Koramic"], ["wienerberger", "Wienerberger"]]) },
      { attribut: "modele", libelle: "Modèle", feminin: false, options: opt([["romane", "Romane"], ["canal", "Canal"], ["omega", "Oméga"], ["huguenot", "Huguenot"], ["plate", "Plate"], ["marseille", "Marseille"]]) },
      { attribut: "teinte", libelle: "Teinte", feminin: true, options: opt([["rouge", "Rouge"], ["vieilli", "Vieilli"], ["ardoise", "Ardoisé"], ["brun", "Brun"], ["sable", "Sable"], ["noir", "Noir"]]) },
    ],
    seuilRecommande: 2000,
    nom: (v) => `Tuile ${v("marque")} ${v("modele")} · ${v("teinte")}`,
  },
  {
    type: "fenetre-de-toit",
    libelle: "Fenêtre de toit",
    lot: "couverture",
    unite: U.piece,
    conditionnements: [],
    caracteristiques: [
      { attribut: "gamme", libelle: "Gamme", feminin: true, options: opt([["ggl", "GGL"], ["ggu", "GGU"], ["gpl", "GPL"], ["gpu", "GPU"], ["gtl", "GTL"]]), ecrire: (v) => v.toUpperCase() },
      { attribut: "reference", libelle: "Taille", feminin: true, options: opt([["ck02", "CK02"], ["ck04", "CK04"], ["mk04", "MK04"], ["mk06", "MK06"], ["mk08", "MK08"], ["sk06", "SK06"], ["pk08", "PK08"], ["uk04", "UK04"]]), ecrire: (v) => v.toUpperCase() },
    ],
    seuilRecommande: 4,
    nom: (v) => `Fenêtre de toit ${v("gamme")} ${v("reference")}`,
  },
  {
    type: "ecran-sous-toiture",
    libelle: "Écran sous-toiture",
    lot: "couverture",
    unite: U.rouleau,
    conditionnements: [],
    caracteristiques: [{ attribut: "conditionnement", libelle: "Surface du rouleau", feminin: true, options: opt([["75m2", "75 m²"], ["50m2", "50 m²"], ["45m2", "45 m²"]]), ecrire: (v) => v.replace("m2", " m²") }],
    seuilRecommande: 10,
    nom: (v) => `Écran sous-toiture HPV · rouleau ${v("conditionnement")}`,
  },
  {
    type: "gouttiere",
    libelle: "Gouttière",
    lot: "zinguerie",
    unite: U.metre,
    conditionnements: [{ unite: U.longueur, parDefaut: 4 }],
    caracteristiques: [
      { attribut: "matiere", libelle: "Matière", feminin: true, options: opt([["zinc", "zinc"], ["alu", "alu"], ["pvc", "PVC"], ["cuivre", "cuivre"]]) },
      { attribut: "developpe", libelle: "Développé", feminin: false, options: opt([["25", "dév. 25"], ["33", "dév. 33"], ["40", "dév. 40"], ["50", "dév. 50"]]) },
    ],
    seuilRecommande: 30,
    nom: (v) => `Gouttière ${v("matiere")} ${v("developpe")}`,
  },
  {
    type: "isolant",
    libelle: "Isolant",
    lot: "isolation",
    unite: U.m2,
    conditionnements: [],
    caracteristiques: [
      { attribut: "matiere", libelle: "Matière", feminin: true, options: opt([["laine-de-verre", "Laine de verre"], ["laine-de-roche", "Laine de roche"], ["laine-de-bois", "Laine de bois"], ["pir", "PIR"]]) },
      { attribut: "epaisseur", libelle: "Épaisseur", feminin: true, options: opt([["100", "100 mm"], ["120", "120 mm"], ["140", "140 mm"], ["160", "160 mm"], ["200", "200 mm"], ["240", "240 mm"]]), ecrire: mm },
    ],
    seuilRecommande: 200,
    nom: (v) => `${v("matiere")} · ${v("epaisseur")}`,
  },
  {
    type: "liteau",
    libelle: "Liteaux",
    lot: "couverture",
    unite: U.metre,
    conditionnements: [{ unite: U.botte, parDefaut: null }],
    caracteristiques: [
      { attribut: "format", libelle: "Section", feminin: true, options: opt([["27x40", "27 × 40"], ["25x38", "25 × 38"], ["30x40", "30 × 40"], ["38x38", "38 × 38"]]), ecrire: fois },
      { attribut: "essence", libelle: "Essence", feminin: true, options: opt([["sapin", "sapin"], ["epicea", "épicéa"], ["douglas", "douglas"], ["pin", "pin"]]) },
    ],
    seuilRecommande: 600,
    nom: (v) => `Liteaux ${v("format")} · ${v("essence")}`,
  },
  {
    type: "osb",
    libelle: "OSB",
    lot: "bois",
    unite: U.panneau,
    conditionnements: [],
    caracteristiques: [
      { attribut: "epaisseur", libelle: "Épaisseur", feminin: true, options: opt([["9", "9 mm"], ["12", "12 mm"], ["15", "15 mm"], ["18", "18 mm"], ["22", "22 mm"]]), ecrire: mm },
      { attribut: "format", libelle: "Format", feminin: false, options: opt([["250x125", "250 × 125"], ["250x67.5", "250 × 67,5"], ["244x122", "244 × 122"]]), ecrire: (v) => fois(v).replace(".", ",") },
    ],
    seuilRecommande: 40,
    nom: (v) => `OSB ${v("epaisseur")} · ${v("format")}`,
  },
  {
    type: "cable-r2v",
    libelle: "Câble R2V",
    lot: "electricite",
    unite: U.metre,
    conditionnements: [{ unite: U.couronne, parDefaut: 100 }],
    caracteristiques: [{ attribut: "section", libelle: "Section", feminin: true, options: opt([["3g1.5", "3G1,5"], ["3g2.5", "3G2,5"], ["3g6", "3G6"], ["5g1.5", "5G1,5"], ["5g2.5", "5G2,5"], ["5g6", "5G6"]]), ecrire: (v) => v.toUpperCase().replace(".", ",") }],
    seuilRecommande: 1000,
    nom: (v) => `Câble R2V ${v("section")}`,
  },
];

export const produitV1 = (type: string) => PRODUITS_V1.find((p) => p.type === type) ?? null;

/** Le libellé d'une valeur de caractéristique (option connue, sinon la valeur écrite mise en forme). */
function libelleValeur(c: CaracteristiqueV1, valeur: string): string {
  const o = c.options.find((x) => x.valeur === valeur);
  if (c.ecrire) return c.ecrire(valeur);
  return o?.libelle ?? valeur;
}

/** Le nom exact d'un produit précisé (« Ardoise naturelle 32 × 22 · Espagne · 1er choix · 5 mm »). */
export function nomProduitV1(type: string, attributs: Readonly<Record<string, string>>): string {
  const p = produitV1(type);
  if (!p) return type;
  return p.nom((a) => {
    const c = p.caracteristiques.find((x) => x.attribut === a)!;
    const v = attributs[a];
    return v ? libelleValeur(c, v) : "…";
  });
}

const normaliserValeur = (v: string) => normalizeText(v).replace(/,/g, ".").replace(/\s+/g, "");

/**
 * La CLÉ d'un produit V1 : le type et ses caractéristiques indispensables, dans l'ordre, normalisées. Deux besoins ne
 * se regroupent que sur une clé IDENTIQUE ; une caractéristique manquante n'a pas de clé (null).
 */
export function cleProduitV1(type: string, attributs: Readonly<Record<string, string | undefined>>): string | null {
  const p = produitV1(type);
  if (!p) return null;
  const parts: string[] = [];
  for (const c of p.caracteristiques) {
    const v = attributs[c.attribut];
    if (!v?.trim()) return null;
    parts.push(`${c.attribut}=${normaliserValeur(v)}`);
  }
  return `v1:${p.type}|${parts.join("|")}`;
}

/** Les caractéristiques indispensables qui manquent, dans l'ordre du produit. */
export function manquantesV1(type: string, attributs: Readonly<Record<string, string | undefined>>): CaracteristiqueV1[] {
  const p = produitV1(type);
  return p ? p.caracteristiques.filter((c) => !attributs[c.attribut]?.trim()) : [];
}

/** « À préciser : section et essence manquantes » ; « À préciser : épaisseur manquante ». */
export function phraseAPreciser(manquantes: readonly Pick<CaracteristiqueV1, "libelle" | "feminin">[]): string {
  if (manquantes.length === 0) return "";
  const noms = manquantes.map((m) => m.libelle.toLowerCase());
  const liste = noms.length === 1 ? noms[0]! : `${noms.slice(0, -1).join(", ")} et ${noms.at(-1)}`;
  const feminin = manquantes.every((m) => m.feminin);
  const accord = manquantes.length > 1 ? (feminin ? "manquantes" : "manquants") : feminin ? "manquante" : "manquant";
  return `À préciser : ${liste} ${accord}`;
}

const ESSENCES: readonly [RegExp, string][] = [
  [/\bsapin\b/, "sapin"],
  [/\bepicea\b/, "epicea"],
  [/\bdouglas\b/, "douglas"],
  [/\bpin\b/, "pin"],
];
const ISOLANTS: readonly [RegExp, string][] = [
  [/\blaines? (de )?verre\b/, "laine-de-verre"],
  [/\blaines? (de )?roche\b/, "laine-de-roche"],
  [/\blaines? (de )?bois\b/, "laine-de-bois"],
  [/\b(pir|polyurethane)\b/, "pir"],
];

/**
 * Ce que la V1 lit d'une ligne : le produit autorisé et ses caractéristiques écrites (même incomplètes), ou rien (famille
 * pas encore ouverte, accessoire, ligne ambiguë). Aucune caractéristique n'est inventée.
 */
export function lireProduitV1(designation: string): { type: string; attributs: Record<string, string> } | null {
  const t = texteDe(designation);
  // Le câble R2V : la seule famille électrique de la V1 (section « 3G2,5 »).
  if (/\b(cables?|r2v)\b/.test(t) && /\br2v\b/.test(t)) {
    const s = /\b([35]) ?g ?(\d{1,2}(?:[.,]\d)?)\b/.exec(t);
    return { type: "cable-r2v", attributs: s ? { section: `${s[1]}g${s[2]!.replace(",", ".")}` } : {} };
  }
  const lu = lireReference(designation);
  if (!lu.ok) return null;
  const p = produitV1(lu.type);
  if (!p) return null;
  const attributs: Record<string, string> = {};
  for (const c of p.caracteristiques) {
    const v = (lu.attributs as Record<string, string | undefined>)[c.attribut];
    if (v) attributs[c.attribut] = v;
  }
  if (p.type === "liteau") {
    const e = ESSENCES.find(([re]) => re.test(t))?.[1];
    if (e) attributs.essence = e;
  }
  if (p.type === "isolant") {
    const m = ISOLANTS.find(([re]) => re.test(t))?.[1];
    if (m) attributs.matiere = m;
  }
  return { type: p.type, attributs };
}

/* ------------------------------------------------------------------------------------------- les quantités */

const UNITES_LUES: readonly [RegExp, string][] = [
  [/^(u|un|unite|unites|pce|pces|piece|pieces|pc|pcs|ens)$/, "piece"],
  [/^(m|ml|metre|metres|m lineaire|metre lineaire|metres lineaires)$/, "m"],
  [/^(m2|metre carre|metres carres)$/, "m2"],
  [/^(rouleau|rouleaux|rlx|rlx\.|rl)$/, "rouleau"],
  [/^(panneau|panneaux|pnx|pnl)$/, "panneau"],
  [/^(palette|palettes|pal)$/, "palette"],
  [/^(couronne|couronnes|cour)$/, "couronne"],
  [/^(botte|bottes)$/, "botte"],
  [/^(paquet|paquets|pqt)$/, "paquet"],
];
/** Le code d'une unité écrite (« Palettes » → palette, « ml » → m, « m² » → m2) ; null si inconnue. */
export function codeUnite(unite: string): string | null {
  return lireUnite(unite)?.code ?? null;
}

/**
 * L'unité écrite et, si elle le dit, son contenu (« longueurs de 4 m » → longueur de 4 ; « couronnes de 100 m » →
 * couronne de 100). Ce contenu reste une proposition : l'artisan le confirme toujours.
 */
export function lireUnite(unite: string): { code: string; contenu: number | null } | null {
  const u = normalizeText(unite.replace(/m²/g, "m2")).replace(/\.$/, "").trim();
  const avec = /^(longueurs?|couronnes?|bottes?|rouleaux?|palettes?) de (\d+(?:[.,]\d+)?) ?(m|m2|ml|pieces?|u)?$/.exec(u);
  if (avec) {
    const code = UNITES_LUES.find(([re]) => re.test(avec[1]!))?.[1] ?? (avec[1]!.startsWith("longueur") ? "longueur" : null);
    return code ? { code, contenu: Number(avec[2]!.replace(",", ".")) } : null;
  }
  const code = UNITES_LUES.find(([re]) => re.test(u))?.[1] ?? (/^longueurs?$/.test(u) ? "longueur" : null);
  return code ? { code, contenu: null } : null;
}

/** L'unité écrite est-elle l'unité de référence du produit, un de ses conditionnements, ou aucune des deux ? */
export function uniteDuProduit(p: ProduitV1, unite: string): { sorte: "reference" } | { sorte: "conditionnement"; conditionnement: ConditionnementV1 } | null {
  const code = codeUnite(unite);
  if (!code) return null;
  if (code === p.unite.code) return { sorte: "reference" };
  const c = p.conditionnements.find((x) => x.unite.code === code);
  return c ? { sorte: "conditionnement", conditionnement: c } : null;
}

/** La quantité dans l'unité de référence du produit (10 palettes × 480 = 4 800 pièces). */
export const quantiteReference = (quantite: number, parUnite: number | null) => Math.round(quantite * (parUnite ?? 1) * 1000) / 1000;

const nf = (n: number, decimales = 0) => n.toLocaleString("fr-FR", { minimumFractionDigits: decimales, maximumFractionDigits: Math.max(decimales, 3) }).replace(/ | /g, " ");
const uniteEcrite = (u: Pick<UniteV1, "singulier" | "pluriel">, n: number) => (Math.abs(n) >= 2 ? u.pluriel : u.singulier);
export const quantiteLisible = (n: number, u: Pick<UniteV1, "singulier" | "pluriel">) => `${nf(n)} ${uniteEcrite(u, n)}`;

/** « 10 palettes = 4 800 pièces », ou « 40 m » sans conditionnement. */
export function quantiteAvecConversion(p: ProduitV1, quantite: number, conditionnement: { unite: string; parUnite: number } | null): string {
  if (!conditionnement) return quantiteLisible(quantite, p.unite);
  const c = p.conditionnements.find((x) => x.unite.code === conditionnement.unite);
  if (!c) return quantiteLisible(quantite, p.unite);
  return `${quantiteLisible(quantite, c.unite)} = ${quantiteLisible(quantiteReference(quantite, conditionnement.parUnite), p.unite)}`;
}

/* ------------------------------------------------------------------------- une ligne, un seul circuit */

export const CIRCUITS = ["libre", "surveillee", "demande_individuelle", "achat_groupe", "commandee"] as const;
export type CircuitLigne = (typeof CIRCUITS)[number];

export interface FaitsCircuit {
  demandeEnvoyee: boolean;
  commandee: boolean;
  enRecherche: boolean;
  /** Tenue par un achat groupé (ancien ou V1), besoin actif. */
  dansUnAchatGroupe: boolean;
}

/** Le circuit d'une ligne : une commande l'emporte, puis l'achat groupé, la demande individuelle, la surveillance. */
export function circuitDeLigne(f: FaitsCircuit): CircuitLigne {
  if (f.commandee) return "commandee";
  if (f.dansUnAchatGroupe) return "achat_groupe";
  if (f.demandeEnvoyee) return "demande_individuelle";
  if (f.enRecherche) return "surveillee";
  return "libre";
}

export type ActionCircuit = "rejoindre_achat_groupe" | "envoyer_demande_individuelle";
export type VerdictCircuit = { permis: true; arreterSurveillance?: boolean } | { permis: false; raison: CircuitLigne; message: string };

/**
 * Le tableau « Une ligne, un seul circuit » de la V5.2 : une ligne engagée dans une demande individuelle n'entre jamais en
 * même temps dans un achat groupé, et inversement ; une ligne commandée n'a plus aucun autre circuit ; la surveillance
 * est une simple veille (elle s'arrête, expliquée, quand la ligne rejoint un achat groupé).
 */
export function peutCircuit(f: FaitsCircuit, action: ActionCircuit, designation = "Cette ligne"): VerdictCircuit {
  const c = circuitDeLigne(f);
  const nom = `« ${designation} »`;
  if (c === "commandee") return { permis: false, raison: c, message: `${nom} est déjà commandée : plus aucun autre circuit.` };
  if (action === "rejoindre_achat_groupe") {
    if (c === "achat_groupe") return { permis: false, raison: c, message: `${nom} est déjà dans un achat groupé : une ligne ne rejoint qu'un seul achat groupé.` };
    if (c === "demande_individuelle") return { permis: false, raison: c, message: `${nom} est déjà dans une demande individuelle envoyée aux négoces : elle ne peut pas entrer en même temps dans un achat groupé.` };
    return c === "surveillee" ? { permis: true, arreterSurveillance: true } : { permis: true };
  }
  if (c === "achat_groupe") return { permis: false, raison: c, message: `${nom} est dans un achat groupé : elle ne part pas en même temps en demande individuelle. Retire d'abord ton besoin de l'achat groupé.` };
  return { permis: true };
}

/* ---------------------------------------------------------------- le classement des lignes d'un quantitatif */

export type MentionLigneV1 = "recommande" | "compatible" | "a_preciser" | "demande_individuelle" | "deja_groupe" | "commandee" | "non_ouvert";

export const TEXTES_MENTION: Readonly<Record<MentionLigneV1, string>> = {
  recommande: "Recommandé pour un achat groupé",
  compatible: "Compatible avec un achat groupé",
  a_preciser: "À préciser",
  demande_individuelle: "Déjà dans une demande individuelle",
  deja_groupe: "Déjà dans un achat groupé",
  commandee: "Déjà commandée",
  non_ouvert: "Pas encore ouvert aux achats groupés",
};

export interface LigneClasseeV1 {
  lot: LotV1;
  lotLu: LotV1;
  produit: { type: string; nom: string; cle: string | null; attributs: Record<string, string>; manquantes: { attribut: string; libelle: string }[] } | null;
  /** La quantité comprise : dans l'unité de référence, ou un conditionnement (conversion à confirmer). Null : à préciser. */
  quantite: { valeur: number; unite: string; conditionnement: { unite: string; parDefaut: number | null } | null } | null;
  mention: MentionLigneV1;
  texte: string;
  pourquoi: string;
  selectionnable: boolean;
}

/**
 * Le classement d'une ligne pour « Depuis un quantitatif » : son lot (lu, ou corrigé par l'artisan), le produit V1 et ce
 * qu'il manque, la mention avec sa raison. Rien n'est coché d'office ; seules « Recommandé » et « Compatible » se cochent.
 */
export function classerLigneV1(l: { designation: string; quantite: number; unite: string; lotChoisi?: LotV1 | null; faits: FaitsCircuit }): LigneClasseeV1 {
  const lotLu = lotDeLaLigne(l.designation);
  const lot = l.lotChoisi ?? lotLu;
  const base = { lot, lotLu };
  const circuit = circuitDeLigne(l.faits);
  const lu = lireProduitV1(l.designation);
  const p = lu ? produitV1(lu.type) : null;
  const manquantes = p && lu ? manquantesV1(p.type, lu.attributs) : [];
  const produit = p && lu ? { type: p.type, nom: nomProduitV1(p.type, lu.attributs), cle: cleProduitV1(p.type, lu.attributs), attributs: lu.attributs, manquantes: manquantes.map((m) => ({ attribut: m.attribut, libelle: m.libelle })) } : null;
  const u = p ? uniteDuProduit(p, l.unite) : null;
  const contenu = lireUnite(l.unite)?.contenu ?? null;
  const quantite = p && u && l.quantite > 0 ? { valeur: l.quantite, unite: codeUnite(l.unite)!, conditionnement: u.sorte === "conditionnement" ? { unite: u.conditionnement.unite.code, parDefaut: contenu ?? u.conditionnement.parDefaut } : null } : null;
  const non = (mention: MentionLigneV1, pourquoi: string, texte = TEXTES_MENTION[mention]): LigneClasseeV1 => ({ ...base, produit, quantite, mention, texte, pourquoi, selectionnable: false });
  if (circuit === "commandee") return non("commandee", "Cette ligne est déjà commandée.");
  if (circuit === "achat_groupe") return non("deja_groupe", "Une ligne ne rejoint qu'un seul achat groupé.");
  if (circuit === "demande_individuelle") return non("demande_individuelle", "Une ligne déjà envoyée aux négoces en demande individuelle n'entre pas en même temps dans un achat groupé.");
  if (!p || !produit) return non("non_ouvert", "Cette famille n'a pas encore ses caractéristiques indispensables définies : la ligne reste dans ton quantitatif.");
  if (manquantes.length) return non("a_preciser", "Tant qu'une caractéristique indispensable manque, le produit ne peut rejoindre aucun achat groupé.", phraseAPreciser(manquantes));
  if (!quantite) return non("a_preciser", `La quantité doit être en ${p.unite.pluriel}${p.conditionnements.length ? ` ou en ${p.conditionnements.map((c) => c.unite.pluriel).join(", ")}` : ""}.`, `À préciser : quantité en ${p.unite.pluriel}`);
  const enReference = quantiteReference(quantite.valeur, quantite.conditionnement ? (quantite.conditionnement.parDefaut ?? 0) : 1);
  const recommande = enReference >= p.seuilRecommande;
  return {
    ...base,
    produit,
    quantite,
    mention: recommande ? "recommande" : "compatible",
    texte: TEXTES_MENTION[recommande ? "recommande" : "compatible"],
    pourquoi: recommande ? "Produit suffisamment précis et quantité adaptée à un regroupement." : "Produit précis, mais quantité modeste.",
    selectionnable: true,
  };
}

/* ------------------------------------------------------------------------------- le cycle de l'achat groupé */

export const ETATS_ACHAT_V1 = ["ouvert", "preparation", "consultation", "offre_verification", "offre_a_examiner", "renegociation", "annule"] as const;
export type EtatAchatV1 = (typeof ETATS_ACHAT_V1)[number];

/** « Offre acceptée » et le second tour sont des états FUTURS : absents de la table, donc impossibles à atteindre. */
const TRANSITIONS_ACHAT_V1: Readonly<Record<EtatAchatV1, readonly EtatAchatV1[]>> = {
  ouvert: ["preparation", "annule"],
  preparation: ["consultation", "annule"],
  consultation: ["offre_verification", "renegociation", "annule"],
  offre_verification: ["offre_a_examiner", "renegociation", "annule"],
  offre_a_examiner: ["renegociation", "annule"],
  renegociation: ["offre_verification", "annule"],
  annule: [],
};

export const ETATS_BESOIN_V1 = ["indicatif", "confirme", "reconfirme", "retire"] as const;
export type EtatBesoinV1 = (typeof ETATS_BESOIN_V1)[number];

const TRANSITIONS_BESOIN_V1: Readonly<Record<EtatBesoinV1, readonly EtatBesoinV1[]>> = {
  indicatif: ["confirme", "reconfirme", "retire"],
  confirme: ["reconfirme", "indicatif", "retire"],
  reconfirme: ["retire"],
  retire: [],
};

/** Une transition n'est permise que si elle est dans la table (le serveur refuse tout le reste). */
export function transitionV1(objet: "achat" | "besoin", de: string, vers: string): boolean {
  const table = (objet === "achat" ? TRANSITIONS_ACHAT_V1 : TRANSITIONS_BESOIN_V1) as Record<string, readonly string[]>;
  return (table[de] ?? []).includes(vers);
}

/** Les états où un besoin compte encore (il tient sa ligne de quantitatif). */
export const BESOIN_ACTIF_V1: readonly EtatBesoinV1[] = ["indicatif", "confirme", "reconfirme"];
/** Les états d'achat où la consultation est partie : le volume reconfirmé a été transmis aux négoces. */
export const ACHAT_TRANSMIS_V1: readonly EtatAchatV1[] = ["consultation", "offre_verification", "offre_a_examiner", "renegociation"];

export type ActionBesoinV1 = "modifier_quantite" | "modifier_date" | "retirer" | "reconfirmer" | "confirmer";
export type VerdictBesoinV1 = { permis: true; vers?: EtatBesoinV1; transmis: boolean } | { permis: false; raison: string; message: string };

/**
 * Ce que l'artisan peut faire de son besoin, selon l'état de l'achat et du besoin. Modifier ne retire jamais ; après la
 * consultation, la modification et le retrait sont transmis aux négoces concernés (`transmis`) ; une offre en cours ne
 * se modifie pas (l'offre est calculée sur la quantité) ; reconfirmer seulement pendant la préparation, avant l'heure.
 */
export function peutBesoinV1(a: { statut: EtatAchatV1; reconfirmerAvant: Date | null }, b: { statut: EtatBesoinV1 }, action: ActionBesoinV1, maintenant: Date): VerdictBesoinV1 {
  if (b.statut === "retire") return { permis: false, raison: "besoin_retire", message: "Ce besoin est retiré." };
  if (a.statut === "annule") return { permis: false, raison: "achat_annule", message: "Cet achat groupé est annulé." };
  const transmis = ACHAT_TRANSMIS_V1.includes(a.statut) && b.statut === "reconfirme";
  if (action === "retirer") return { permis: true, vers: "retire", transmis };
  if (action === "modifier_quantite" || action === "modifier_date") {
    if (a.statut === "ouvert" || a.statut === "preparation" || a.statut === "consultation") return { permis: true, transmis };
    return { permis: false, raison: "offre_en_cours", message: "Une offre est en cours sur ta quantité : tu pourras la refuser, mais plus la modifier ici." };
  }
  const avantHeure = !a.reconfirmerAvant || maintenant < a.reconfirmerAvant;
  if (action === "reconfirmer") {
    if (a.statut !== "preparation") return { permis: false, raison: "pas_en_preparation", message: "La reconfirmation n'est demandée que pendant la préparation de la consultation." };
    if (!avantHeure) return { permis: false, raison: "trop_tard", message: "Le délai de reconfirmation est passé : ton besoin reste indicatif pour cette consultation." };
    if (b.statut === "reconfirme") return { permis: true, vers: "reconfirme", transmis: false };
    return { permis: true, vers: "reconfirme", transmis: false };
  }
  // confirmer (un besoin indicatif)
  if (b.statut !== "indicatif") return { permis: false, raison: "deja_confirme", message: "Ce besoin est déjà confirmé." };
  if (a.statut === "ouvert") return { permis: true, vers: "confirme", transmis: false };
  if (a.statut === "preparation" && avantHeure) return { permis: true, vers: "reconfirme", transmis: false };
  return { permis: false, raison: "consultation_partie", message: "La consultation est partie : ton besoin reste indicatif et n'est pas transmis aux négoces." };
}

/** À la clôture des reconfirmations : un besoin confirmé mais pas reconfirmé devient indicatif (jamais transmis). */
export const apresCloture = (statut: EtatBesoinV1): EtatBesoinV1 => (statut === "confirme" ? "indicatif" : statut);

/* -------------------------------------------------------------------------------------- statuts affichés */

export type CodeStatutV1 =
  | "besoin_indicatif"
  | "besoin_confirme"
  | "preparation"
  | "consultation_envoyee"
  | "offre_verification"
  | "offre_a_examiner"
  | "renegociation"
  | "achat_annule"
  | "besoin_retire";

/** Les textes EXACTS du tableau final des statuts (V5.2). « Offre acceptée » n'en fait pas partie en V1. */
export const LIBELLES_STATUT_V1: Readonly<Record<CodeStatutV1, string>> = {
  besoin_indicatif: "Besoin indicatif",
  besoin_confirme: "Besoin confirmé",
  preparation: "Préparation de la consultation",
  consultation_envoyee: "Consultation envoyée",
  offre_verification: "Offre reçue — vérification en cours",
  offre_a_examiner: "Offre à examiner",
  renegociation: "Renégociation nécessaire",
  achat_annule: "Achat groupé annulé",
  besoin_retire: "Besoin retiré",
};

export function statutAfficheV1(a: { statut: EtatAchatV1 }, b: { statut: EtatBesoinV1 }): CodeStatutV1 {
  if (b.statut === "retire") return "besoin_retire";
  if (a.statut === "annule") return "achat_annule";
  if (b.statut === "indicatif") return "besoin_indicatif";
  switch (a.statut) {
    case "ouvert":
      return "besoin_confirme";
    case "preparation":
      return "preparation";
    case "consultation":
      return "consultation_envoyee";
    case "offre_verification":
      return "offre_verification";
    case "offre_a_examiner":
      return "offre_a_examiner";
    default:
      return "renegociation";
  }
}

/* -------------------------------------------------------------------------------------------- les volumes */

export const SEUIL_ENTREPRISES_VOLUMES = 5;

export interface VolumesV1 {
  entreprises: number;
  /** Besoins confirmés (confirmés + reconfirmés), unité de référence. */
  confirmes: number;
  /** Confirmés pour la consultation (reconfirmés) : le seul volume jamais transmis aux négoces. */
  reconfirmes: number;
  indicatifs: number;
  /** Ce qui est transmis aux négoces : le volume reconfirmé, une fois la consultation partie ; 0 avant. */
  transmis: number;
  visibles: boolean;
}

/** Les trois volumes d'un achat ; un besoin retiré sort des totaux. */
export function volumesV1(besoins: readonly { companyId: string; statut: EtatBesoinV1; quantite: number }[], achat: { statut: EtatAchatV1 }): VolumesV1 {
  const somme = (f: (s: EtatBesoinV1) => boolean) => Math.round(besoins.filter((b) => f(b.statut)).reduce((t, b) => t + b.quantite, 0) * 1000) / 1000;
  const entreprises = new Set(besoins.filter((b) => b.statut === "confirme" || b.statut === "reconfirme").map((b) => b.companyId)).size;
  const reconfirmes = somme((s) => s === "reconfirme");
  return {
    entreprises,
    confirmes: somme((s) => s === "confirme" || s === "reconfirme"),
    reconfirmes,
    indicatifs: somme((s) => s === "indicatif"),
    transmis: ACHAT_TRANSMIS_V1.includes(achat.statut) ? reconfirmes : 0,
    visibles: entreprises >= SEUIL_ENTREPRISES_VOLUMES,
  };
}

export const PHRASE_SOUS_5 = "D'autres entreprises se positionnent. Les volumes seront visibles à partir de 5 entreprises.";

/** L'unité d'affichage d'un achat : son conditionnement confirmé (« palettes »), sinon l'unité de référence. */
export interface AffichageV1 {
  unite: Pick<UniteV1, "singulier" | "pluriel" | "feminin">;
  parUnite: number;
}

const enAffichage = (q: number, aff: AffichageV1) => Math.round((q / aff.parUnite) * 10) / 10;

/**
 * Les phrases des volumes, pour les autres entreprises : jamais une quantité individuelle, rien sous 5 entreprises.
 * Ouvert : « 86 palettes de besoins confirmés par 12 entreprises » + « À reconfirmer avant consultation » ; puis
 * « 86 palettes confirmées pour la consultation » ; en second, « 34 palettes supplémentaires encore indicatives ».
 */
export function phrasesVolumesV1(v: VolumesV1, achat: { statut: EtatAchatV1 }, aff: AffichageV1): { principale: string; sous: string | null; indicatif: string | null } {
  if (!v.visibles) return { principale: PHRASE_SOUS_5, sous: null, indicatif: null };
  const q = (n: number) => `${nf(enAffichage(n, aff))} ${uniteEcrite(aff.unite, enAffichage(n, aff))}`;
  const e = aff.unite.feminin ? "es" : "s";
  const indicatif = v.indicatifs > 0 ? `${q(v.indicatifs)} supplémentaire${enAffichage(v.indicatifs, aff) >= 2 ? "s" : ""} encore indicati${aff.unite.feminin ? "ve" : "f"}${enAffichage(v.indicatifs, aff) >= 2 ? "s" : ""}` : null;
  if (achat.statut === "ouvert" || achat.statut === "preparation")
    return { principale: `${q(v.confirmes)} de besoins confirmés par ${v.entreprises} entreprises`, sous: "À reconfirmer avant consultation", indicatif };
  return { principale: `${q(v.reconfirmes)} confirmé${e} pour la consultation`, sous: null, indicatif };
}

/* ------------------------------------------------------------------------------------ la compatibilité */

/** L'écart de date toléré entre un besoin et la date de l'achat groupé. */
export const TOLERANCE_DATE_JOURS = 14;
/** Le délai minimal entre aujourd'hui et la date de besoin pour ouvrir un achat (préparation, consultation, offre). */
export const DELAI_MIN_JOURS = 21;
/** L'achat reste ouvert jusqu'à 18 jours avant la date de besoin (le 2 janvier pour un besoin du 20 janvier). */
export const OUVERT_AVANT_BESOIN_JOURS = 18;

const JOUR = 86_400_000;
const jour = (d: Date) => Math.floor(d.getTime() / JOUR);

export type DifferenceV1 = "produit" | "zone" | "reception" | "date" | "ferme";
export const RAISONS_NE_CONVIENT_PAS = [
  { id: "date", libelle: "Ma date de besoin est différente" },
  { id: "reception", libelle: "Livraison ou retrait différent" },
  { id: "produit", libelle: "Une caractéristique du produit est différente" },
] as const;
export const PHRASE_BESOIN_IDENTIQUE = "Ce besoin est identique : rejoins cet achat groupé pour ne pas diviser les volumes.";

/** Les différences RÉELLES entre un besoin et un achat ; vide = compatible (il faut le rejoindre, jamais en ouvrir un second). */
export function differencesV1(
  achat: { cle: string; departement: string; reception: string; dateBesoin: Date; statut: EtatAchatV1; ouvertJusquau: Date },
  besoin: { cle: string; departement: string; reception: string; dateBesoin: Date },
  maintenant: Date,
): DifferenceV1[] {
  const d: DifferenceV1[] = [];
  if (achat.cle !== besoin.cle) d.push("produit");
  if (achat.departement !== besoin.departement) d.push("zone");
  if (achat.reception !== besoin.reception) d.push("reception");
  if (Math.abs(jour(achat.dateBesoin) - jour(besoin.dateBesoin)) > TOLERANCE_DATE_JOURS) d.push("date");
  if (achat.statut !== "ouvert" || achat.ouvertJusquau <= maintenant) d.push("ferme");
  return d;
}

/** Jusqu'à quand un nouvel achat reste ouvert, ou la raison du refus (date trop proche). */
export function ouvertureV1(dateBesoin: Date, maintenant: Date): { ok: true; ouvertJusquau: Date } | { ok: false; message: string } {
  if (jour(dateBesoin) - jour(maintenant) < DELAI_MIN_JOURS)
    return { ok: false, message: `Pour un achat groupé, la date de besoin doit être au moins ${DELAI_MIN_JOURS} jours après aujourd'hui (préparation, consultation des négoces, offre).` };
  // 18 h, heure de Paris (17 h UTC en hiver), 18 jours avant la date de besoin.
  const fin = new Date((jour(dateBesoin) - OUVERT_AVANT_BESOIN_JOURS) * JOUR + 17 * 3_600_000);
  return { ok: true, ouvertJusquau: fin };
}

/* ---------------------------------------------------------------------- la préparation de la consultation */

export const PREPARATION_HEURES = { defaut: 72, min: 24, max: 120 } as const;
export const RAPPEL_AVANT_HEURES = 24;

export function preparationV1(maintenant: Date, heures: number = PREPARATION_HEURES.defaut): { ok: true; reconfirmerAvant: Date; rappelLe: Date } | { ok: false; message: string } {
  if (!Number.isFinite(heures) || heures < PREPARATION_HEURES.min || heures > PREPARATION_HEURES.max)
    return { ok: false, message: `La préparation dure de ${PREPARATION_HEURES.min} heures à ${PREPARATION_HEURES.max / 24} jours.` };
  const reconfirmerAvant = new Date(maintenant.getTime() + heures * 3_600_000);
  return { ok: true, reconfirmerAvant, rappelLe: new Date(reconfirmerAvant.getTime() - RAPPEL_AVANT_HEURES * 3_600_000) };
}

/* --------------------------------------------------------------------------------- modifier et retirer */

export const MOTIFS_V1 = [
  { id: "quantite", libelle: "Quantité modifiée", geste: "modifier" },
  { id: "report", libelle: "Chantier reporté", geste: "modifier" },
  { id: "annule", libelle: "Besoin annulé", geste: "retirer" },
  { id: "autrement", libelle: "Achat réalisé autrement", geste: "retirer" },
  { id: "autre", libelle: "Autre", geste: "retirer" },
] as const;
export type MotifV1 = (typeof MOTIFS_V1)[number]["id"];
export const MOTIFS_RETRAIT_V1 = MOTIFS_V1.filter((m) => m.geste === "retirer").map((m) => m.id);
export const PHRASE_MODIFICATION_TRANSMISE = "Les nouvelles informations seront transmises aux négoces concernés.";
export const PHRASE_RETRAIT_TRANSMIS = "Retirer ton besoin modifiera les volumes déjà transmis.";

/** Bêta : 3 retraits tardifs (après l'envoi de la consultation) → un rappel ; au-delà, une vérification manuelle ; jamais de suspension. */
export function suiviRetraitsTardifs(n: number): "aucun" | "rappel" | "verification_manuelle" {
  if (n > 3) return "verification_manuelle";
  return n === 3 ? "rappel" : "aucun";
}

/* ---------------------------------------------------------------------------------------- les phrases */

export const CASE_UNE_LIGNE = (dateLisible: string) =>
  `Je confirme que cette quantité correspond à un besoin réel de mon entreprise. Je la maintiendrai à jour jusqu'au ${dateLisible}. Ce n'est pas encore une commande : je pourrai accepter ou refuser l'offre finale.`;
export const CASE_PLUSIEURS_LIGNES =
  "Je confirme qu'il s'agit de besoins réels de mon entreprise. Ce n'est pas encore une commande : je pourrai accepter ou refuser séparément chaque offre finale.";
export const HABILITATIONS_V1 = [
  { id: "dirigeant", libelle: "Dirigeant" },
  { id: "autorise", libelle: "Autorisé à agir pour l'entreprise" },
] as const;
export type HabilitationV1 = (typeof HABILITATIONS_V1)[number]["id"];

/* -------------------------------------------------------------------------------------------- l'offre */

export interface OffreV1 {
  fournisseur: string | null;
  prixUnitaireHt: number | null;
  livraisonHt: number | null;
  tvaPct: number;
  delai: string | null;
  lieu: string | null;
  paiement: string | null;
  validite: string | null;
  annulation: string | null;
}
const CHAMPS_OFFRE: readonly [keyof OffreV1, string][] = [
  ["fournisseur", "fournisseur"],
  ["prixUnitaireHt", "prix unitaire"],
  ["livraisonHt", "frais de livraison"],
  ["delai", "délai"],
  ["lieu", "lieu de livraison ou de retrait"],
  ["paiement", "conditions de paiement"],
  ["validite", "validité"],
  ["annulation", "conditions d'annulation"],
];

/** Une offre complète a toutes ses informations obligatoires ; sinon « Offre reçue — vérification en cours ». */
export function manquesOffreV1(o: OffreV1): string[] {
  return CHAMPS_OFFRE.filter(([k]) => {
    const v = o[k];
    return v === null || v === undefined || (typeof v === "string" && !v.trim());
  }).map(([, l]) => l);
}

const centimes = (n: number) => Math.round(n * 100) / 100;
export const euros = (n: number) => `${nf(centimes(n), 2)} €`;

/** Le détail calculé pour UNE entreprise (sa quantité) : 4 800 × 0,98 € = 4 704,00 € + 45,00 € = 4 749,00 € HT. */
export function calculOffreV1(quantite: number, o: Pick<OffreV1, "prixUnitaireHt" | "livraisonHt" | "tvaPct">) {
  const prix = o.prixUnitaireHt ?? 0;
  const livraison = o.livraisonHt ?? 0;
  const produits = centimes(quantite * prix);
  const ht = centimes(produits + livraison);
  const tva = centimes((ht * o.tvaPct) / 100);
  const ttc = centimes(ht + tva);
  return {
    produits,
    ht,
    tva,
    ttc,
    lignes: [
      `${nf(quantite)} × ${euros(prix)} = ${euros(produits)}`,
      `${euros(produits)} + ${euros(livraison)} = ${euros(ht)} HT`,
      `TVA ${nf(o.tvaPct)} % ${euros(tva)}`,
      `${euros(ttc)} TTC`,
    ],
  };
}

/* ------------------------------------------------------------------------------------------- À faire */

export interface ActionAFaireV1 {
  cle: string;
  texte: string;
  href: string;
  avant: Date | null;
}

/** Les actions des achats groupés pour « À faire » (la source de référence ; l'e-mail ne fait que rappeler). */
export function actionsAFaireV1(besoins: readonly { id: string; nom: string; quantite: string; statut: EtatBesoinV1; achat: { statut: EtatAchatV1; reconfirmerAvant: Date | null; offreAvant: Date | null } }[], maintenant: Date): ActionAFaireV1[] {
  const out: ActionAFaireV1[] = [];
  for (const b of besoins) {
    const href = `/achats-groupes/besoins/${b.id}`;
    if (b.statut === "retire" || b.achat.statut === "annule") continue;
    if (b.achat.statut === "preparation" && (b.statut === "confirme" || b.statut === "indicatif") && (!b.achat.reconfirmerAvant || b.achat.reconfirmerAvant > maintenant))
      out.push({ cle: `ag-reconfirmer:${b.id}`, texte: `Reconfirme ta quantité : ${b.nom} · ${b.quantite}`, href, avant: b.achat.reconfirmerAvant });
    else if (b.achat.statut === "offre_a_examiner" && b.statut === "reconfirme") out.push({ cle: `ag-offre:${b.id}`, texte: `Offre à examiner : ${b.nom} · ${b.quantite}`, href, avant: b.achat.offreAvant });
    else if (b.achat.statut === "ouvert" && b.statut === "indicatif") out.push({ cle: `ag-confirmer:${b.id}`, texte: `Confirme ton besoin : ${b.nom} · ${b.quantite}`, href, avant: null });
  }
  return out.sort((x, y) => (x.avant?.getTime() ?? Infinity) - (y.avant?.getTime() ?? Infinity));
}
