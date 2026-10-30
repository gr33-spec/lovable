import { anonymiserLigne } from "../rgpd/anonymisation.js";
import { aPlat, scoreArticle } from "./catalogue.js";

/**
 * LES LIGNES ÉCRITES PAR LES ARTISANS ENRICHISSENT LES SUGGESTIONS (Greg, 30 octobre 2026, « Écris ta liste » : « quand un
 * élément est noté par un artisan et que d'autres artisans prennent également cet élément, il faudrait que ça vienne
 * s'ajouter à la liste pour la suite lorsque je commence à taper des mots-clés »).
 *
 * Chaque intitulé écrit est gardé, ANONYMISÉ (un intitulé où l'anonymisation retire quelque chose n'est jamais gardé), une
 * fois par entreprise. Il est proposé à tous dès que `SEUIL_PARTAGE` entreprises différentes l'ont écrit ; l'artisan
 * retrouve aussi les siens dès la première fois. Jamais une quantité, jamais le nom d'une entreprise.
 */
export const SEUIL_PARTAGE = 2;

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

/** Les intitulés proposés pour ce qui est tapé : les siens et ceux d'au moins `SEUIL_PARTAGE` entreprises, les plus écrits d'abord. */
export function rechercherLibelles(connus: readonly LibelleConnu[], q: string, max = 4): LibelleConnu[] {
  return connus
    .filter((l) => l.mien || l.entreprises >= SEUIL_PARTAGE)
    .map((l, i) => ({ l, i, s: scoreArticle({ designation: l.libelle, famille: "", produit: l.libelle, synonymes: [] }, q) }))
    .filter((x): x is { l: LibelleConnu; i: number; s: number } => x.s !== null)
    .sort((x, y) => y.s - x.s || y.l.entreprises - x.l.entreprises || x.l.libelle.length - y.l.libelle.length || x.i - y.i)
    .slice(0, max)
    .map((x) => x.l);
}
