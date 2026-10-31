import { anonymiserLigne } from "../rgpd/anonymisation.js";
import { REFERENTIALS } from "../referential/registry.js";
import { aPlat, scoreArticle } from "./catalogue.js";

/**
 * LES LIGNES ÉCRITES PAR LES ARTISANS ENRICHISSENT L'AUTOCOMPLÉTION, SANS RIEN DIFFUSER (Greg, 30 octobre 2026, puis la
 * nuit même : « je ne souhaite pas que des intitulés saisis par des entreprises soient automatiquement diffusés à tous
 * [...] je préfère une bibliothèque intelligente de matériaux génériques, enrichie progressivement »).
 *
 * Chaque intitulé écrit est gardé, ANONYMISÉ (un intitulé où l'anonymisation retire quelque chose n'est jamais gardé), une
 * fois par entreprise, et proposé à SON AUTEUR seulement. Un intitulé GÉNÉRIQUE (chaque mot est un mot du catalogue, un
 * nombre, une dimension ou une unité : jamais un nom, une référence de chantier ou un mot inconnu) écrit par au moins
 * `SEUIL_PROPOSITION` entreprises devient une PROPOSITION pour l'admin, qui l'ajoute au catalogue ou non : seul le
 * catalogue est proposé à tous. Jamais une quantité, jamais le nom d'une entreprise.
 */
export const SEUIL_PROPOSITION = 3;

/** Les petits mots admis dans un intitulé générique. */
const LIAISONS = new Set(["de", "du", "des", "la", "le", "les", "l", "d", "en", "a", "au", "aux", "et", "ou", "pour", "sur", "avec", "sans", "x", "par"]);
/** Les unités et abréviations admises. */
const UNITES = new Set(["mm", "cm", "m", "ml", "m2", "m3", "kg", "g", "l", "u", "pc", "pcs", "piece", "pieces", "ep", "dev", "diam", "o", "lg", "rouleau", "rouleaux", "sac", "sacs", "boite", "boites", "paquet", "paquets", "palette", "palettes"]);

/** Des mots qui disent un chantier, une personne ou une référence : un intitulé qui en porte un n'est jamais générique. */
const EXCLUS = new Set(["chantier", "chantiers", "client", "clients", "ref", "reference", "references", "nom", "adresse", "rue", "avenue", "impasse", "chez", "mr", "mme", "monsieur", "madame", "sci", "sarl", "devis", "facture", "commande"]);

let motsDesMetiers: Set<string> | null = null;
/** Les mots des référentiels métier (ouvrages, emplacements, articles, questions) : aucun nom de personne. */
function vocabulaireDesMetiers(): Set<string> {
  motsDesMetiers ??= new Set(aPlat(JSON.stringify(REFERENTIALS).replace(/[{}[\]":,]/g, " ")).split(" ").filter(Boolean));
  return motsDesMetiers;
}

/** Le vocabulaire des matériaux : les mots des référentiels métier, plus ceux du catalogue (désignations, familles, produits, variantes, synonymes). */
export function vocabulaireDuCatalogue(articles: readonly { designation: string; famille: string; produit: string; variante?: string | null; synonymes: readonly string[] }[]): Set<string> {
  const v = new Set<string>(vocabulaireDesMetiers());
  for (const a of articles) for (const m of aPlat(`${a.designation} ${a.famille} ${a.produit} ${a.variante ?? ""} ${a.synonymes.join(" ")}`).split(" ")) if (m) v.add(m);
  return v;
}

/** Un intitulé générique : chaque mot est connu du catalogue (singulier ou pluriel), un nombre, une dimension ou une unité. */
export function libelleGenerique(libelle: string, vocabulaire: ReadonlySet<string>): boolean {
  const mots = aPlat(libelle).split(" ").filter(Boolean);
  if (mots.some((m) => EXCLUS.has(m))) return false;
  if (!mots.some((m) => /^[a-z]{3,}$/.test(m) && (vocabulaire.has(m) || vocabulaire.has(m.replace(/[sx]$/, ""))))) return false;
  return mots.every((m) => LIAISONS.has(m) || UNITES.has(m) || /^\d+([.,x]\d+)*(mm|cm|m|ml|kg|l)?$/.test(m) || vocabulaire.has(m) || vocabulaire.has(m.replace(/[sx]$/, "")) || vocabulaire.has(`${m}s`));
}

/** La clé d'un intitulé : sans accents, sans casse, ponctuation réduite (« Crochet gouttière bandeau 25 » = « crochet gouttiere bandeau 25 »). */
export const cleDeLibelle = (libelle: string) => aPlat(libelle);

/** L'intitulé tel qu'il peut être gardé et proposé, ou null (trop court, trop long, ou une donnée personnelle retirée). */
export function libelleAPartager(libelle: string): string | null {
  const t = libelle.trim().replace(/\s+/g, " ");
  if (t.length < 3 || t.length > 120) return null;
  if (!/\p{L}{3,}/u.test(t)) return null;
  if (anonymiserLigne(t).retraits.length > 0) return null;
  return t;
}

export interface LibelleConnu {
  libelle: string;
  unite: string;
  /** Combien d'entreprises l'ont écrit. */
  entreprises: number;
  /** Écrit par l'entreprise qui cherche. */
  mien: boolean;
}

/** Les intitulés proposés pour ce qui est tapé : seulement ceux de l'entreprise qui cherche. */
export function rechercherLibelles(connus: readonly LibelleConnu[], q: string, max = 4): LibelleConnu[] {
  return connus
    .filter((l) => l.mien)
    .map((l, i) => ({ l, i, s: scoreArticle({ designation: l.libelle, famille: "", produit: l.libelle, synonymes: [] }, q) }))
    .filter((x): x is { l: LibelleConnu; i: number; s: number } => x.s !== null)
    .sort((x, y) => y.s - x.s || y.l.entreprises - x.l.entreprises || x.l.libelle.length - y.l.libelle.length || x.i - y.i)
    .slice(0, max)
    .map((x) => x.l);
}

/** Les propositions pour l'admin : génériques, écrites par au moins `SEUIL_PROPOSITION` entreprises, les plus écrites d'abord. */
export function propositionsDeLibelles(connus: readonly Omit<LibelleConnu, "mien">[], vocabulaire: ReadonlySet<string>): Omit<LibelleConnu, "mien">[] {
  return connus.filter((l) => l.entreprises >= SEUIL_PROPOSITION && libelleGenerique(l.libelle, vocabulaire)).sort((a, b) => b.entreprises - a.entreprises || a.libelle.localeCompare(b.libelle));
}

/** Les mots qui ne distinguent pas un produit (« modèle », « réf. ») : ignorés pour rapprocher deux intitulés. */
const NEUTRES = new Set(["modele", "model", "type", "gamme", "serie", "coloris", "teinte", "couleur", "env", "environ", "neuf", "neuve"]);

export interface IntituleEcrit {
  cle: string;
  libelle: string;
  unite: string;
  companyId: string;
}

export interface Candidate {
  /** La clé de l'intitulé qui la représente (le plus écrit). */
  cle: string;
  libelle: string;
  unite: string;
  /** Combien d'entreprises indépendantes, jamais lesquelles. */
  entreprises: number;
  /** Les autres façons de l'écrire (« XYZ terre cuite rouge »). */
  variantes: string[];
}

/**
 * LES RÉFÉRENCES CANDIDATES (Greg, 31 octobre 2026 : « Tuile XYZ rouge », « XYZ terre cuite rouge » et « Tuile modèle
 * XYZ » écrits par trois entreprises sont sans doute le même produit). Deux intitulés se rapprochent quand ils partagent un
 * mot qui identifie (un mot inconnu du catalogue, ou une référence avec chiffres) et que leurs dimensions ne se
 * contredisent pas, ou quand leurs mots se recouvrent à moitié au moins. Un groupe devient candidat quand `seuil`
 * entreprises différentes l'ont écrit ; un mot inconnu n'y est admis que s'il est écrit par `seuil` entreprises (un nom de
 * client ou une référence de chantier ne se répète pas d'une entreprise à l'autre) ; jamais de mots comme chantier,
 * client, réf., rue. Le candidat attend la validation de l'admin : rien n'est publié seul.
 */
export function candidatesDeLibelles(ecrits: readonly IntituleEcrit[], vocabulaire: ReadonlySet<string>, seuil = SEUIL_PROPOSITION): Candidate[] {
  const connu = (m: string) => vocabulaire.has(m) || vocabulaire.has(m.replace(/[sx]$/, ""));
  const motsDe = (l: string) => aPlat(l).split(" ").filter((m) => m && !LIAISONS.has(m) && !NEUTRES.has(m) && !UNITES.has(m));
  const parCle = new Map<string, { libelle: string; unite: string; entreprises: Set<string>; mots: string[] }>();
  for (const e of ecrits) {
    const c = parCle.get(e.cle) ?? { libelle: e.libelle, unite: e.unite, entreprises: new Set<string>(), mots: motsDe(e.libelle) };
    c.entreprises.add(e.companyId);
    parCle.set(e.cle, c);
  }
  const fiches = [...parCle].map(([cle, c]) => ({ cle, ...c, identifiants: c.mots.filter((m) => /\d/.test(m) || (/^[a-z]{2,}$/.test(m) && !connu(m))), dimensions: c.mots.filter((m) => /\d/.test(m)) }));
  // Rapprocher : union des intitulés voisins.
  const parent = fiches.map((_, i) => i);
  const racine = (i: number): number => (parent[i] === i ? i : (parent[i] = racine(parent[i]!)));
  const voisins = (a: (typeof fiches)[number], b: (typeof fiches)[number]) => {
    const dimsA = new Set(a.dimensions);
    if (a.dimensions.length && b.dimensions.length && !b.dimensions.some((d) => dimsA.has(d))) return false;
    if (a.identifiants.some((m) => b.identifiants.includes(m))) return true;
    const A = new Set(a.mots);
    const commun = b.mots.filter((m) => A.has(m)).length;
    return commun / new Set([...a.mots, ...b.mots]).size >= 0.5;
  };
  for (let i = 0; i < fiches.length; i++) for (let j = i + 1; j < fiches.length; j++) if (voisins(fiches[i]!, fiches[j]!)) parent[racine(j)] = racine(i);
  const groupes = new Map<number, (typeof fiches)[number][]>();
  fiches.forEach((f, i) => groupes.set(racine(i), [...(groupes.get(racine(i)) ?? []), f]));
  const candidates: Candidate[] = [];
  for (const g of groupes.values()) {
    if (g.some((f) => f.mots.some((m) => EXCLUS.has(m)))) continue;
    const entreprises = new Set(g.flatMap((f) => [...f.entreprises]));
    if (entreprises.size < seuil) continue;
    // Chaque mot inconnu du représentant doit être écrit par `seuil` entreprises du groupe.
    const tete = [...g].sort((a, b) => b.entreprises.size - a.entreprises.size || a.libelle.length - b.libelle.length)[0]!;
    const inconnus = tete.mots.filter((m) => /^[a-z]{2,}$/.test(m) && !connu(m) && !PRECISIONS_MOTS.has(m));
    const sur = inconnus.every((m) => new Set(g.filter((f) => f.mots.includes(m)).flatMap((f) => [...f.entreprises])).size >= seuil);
    if (!sur || !tete.mots.some((m) => /^[a-z]{3,}$/.test(m) && connu(m))) continue;
    candidates.push({ cle: tete.cle, libelle: tete.libelle, unite: tete.unite, entreprises: entreprises.size, variantes: g.filter((f) => f !== tete).map((f) => f.libelle) });
  }
  return candidates.sort((a, b) => b.entreprises - a.entreprises || a.libelle.localeCompare(b.libelle));
}

/** Les couleurs et finitions courantes : ni inconnues, ni identifiantes. */
const PRECISIONS_MOTS = new Set(["rouge", "brun", "noir", "gris", "blanc", "beige", "vert", "bleu", "anthracite", "vieilli", "sable", "flamme", "nuance", "naturel", "mat", "satin", "velours", "brillant"]);
