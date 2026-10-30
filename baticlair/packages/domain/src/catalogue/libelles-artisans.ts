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
