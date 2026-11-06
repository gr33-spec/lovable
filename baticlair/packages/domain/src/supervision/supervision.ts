/**
 * LA SUPERVISION (Greg, 6 novembre 2026, prompt maître points 6, 13 et 14 ; lot 6). Code pur, sans import interne.
 *
 * 1. LA FILE D'EXCEPTIONS (point 14) : « le parcours normal fonctionne automatiquement et seuls les cas exceptionnels
 *    remontent dans une file de supervision ». Onze types, fermés ; chaque exception a une clé de déduplication (le même
 *    cas ne remonte qu'une fois tant qu'il est ouvert).
 * 2. LE SCORE INTERNE DE FIABILITÉ D'UN NÉGOCE (point 13) : calculé à partir de faits objectifs seulement (taux de
 *    réponse, délai moyen, complétude des offres, familles réellement chiffrées). Jamais montré aux artisans ni publié :
 *    pas de classement accusateur ; il sert à l'admin, et dit toujours sur combien de demandes il repose.
 */

export const TYPES_EXCEPTION = [
  "document_illisible",
  "resultat_ia_incoherent",
  "adresse_incertaine",
  "entreprise_non_verifiee",
  "produit_ambigu",
  "offre_incomplete",
  "prix_incoherent",
  "doublon_incertain",
  "echec_envoi",
  "acces_croise",
  "autre",
] as const;
export type TypeException = (typeof TYPES_EXCEPTION)[number];

export const LIBELLES_EXCEPTION: Readonly<Record<TypeException, string>> = {
  document_illisible: "Document illisible",
  resultat_ia_incoherent: "Résultat IA incohérent",
  adresse_incertaine: "Adresse incertaine",
  entreprise_non_verifiee: "Entreprise non vérifiée",
  produit_ambigu: "Produit techniquement ambigu",
  offre_incomplete: "Offre incomplète",
  prix_incoherent: "Prix incohérent",
  doublon_incertain: "Doublon incertain",
  echec_envoi: "Échec d'envoi",
  acces_croise: "Suspicion d'accès croisé",
  autre: "Autre anomalie",
};

/** La gravité : ce qui touche la sécurité ou bloque un envoi passe d'abord. */
export const GRAVITE_EXCEPTION: Readonly<Record<TypeException, 1 | 2 | 3>> = {
  acces_croise: 3,
  echec_envoi: 3,
  prix_incoherent: 2,
  offre_incomplete: 2,
  entreprise_non_verifiee: 2,
  document_illisible: 2,
  resultat_ia_incoherent: 2,
  adresse_incertaine: 1,
  produit_ambigu: 1,
  doublon_incertain: 1,
  autre: 1,
};

export const estTypeException = (t: string): t is TypeException => (TYPES_EXCEPTION as readonly string[]).includes(t);

/* ------------------------------------------------------------------------------------- les prix incohérents */

/**
 * Un prix unitaire est INCOHÉRENT quand il s'écarte d'un facteur `facteur` (3 par défaut) de la médiane des autres prix
 * de la même ligne ; il faut au moins deux autres prix pour juger (sinon on ne dit rien : le doute ne fait pas une
 * exception). Un prix nul ou négatif est toujours incohérent.
 */
export function prixIncoherent(prix: number, autres: readonly number[], facteur = 3): boolean {
  if (!(prix > 0)) return true;
  const valides = autres.filter((x) => x > 0).sort((a, b) => a - b);
  if (valides.length < 2) return false;
  const m = valides.length % 2 ? valides[(valides.length - 1) / 2]! : (valides[valides.length / 2 - 1]! + valides[valides.length / 2]!) / 2;
  return prix > m * facteur || prix < m / facteur;
}

/* ---------------------------------------------------------------------------------- le score de fiabilité */

export interface FaitsNegoce {
  /** Demandes reçues (envoyées à ce négoce). */
  sollicitations: number;
  /** Réponses exploitables (une offre, des prix ou un devis). */
  reponses: number;
  /** « Je ne peux pas chiffrer » : une réponse honnête, comptée à part (elle n'est pas un silence). */
  refus: number;
  /** Délai de chaque réponse, en heures. */
  delaisHeures: readonly number[];
  /** Lignes demandées dans les demandes auxquelles il a répondu, et lignes qu'il a chiffrées. */
  lignesDemandees: number;
  lignesChiffrees: number;
  /** Familles des lignes qu'il a réellement chiffrées. */
  familles: readonly string[];
}

export interface ScoreFiabilite {
  /** 0 à 100 ; null tant que le négoce a moins de `MIN_SOLLICITATIONS` demandes (pas de jugement sur trop peu). */
  score: number | null;
  tauxReponse: number;
  delaiMoyenHeures: number | null;
  completude: number | null;
  familles: string[];
  base: string;
}

export const MIN_SOLLICITATIONS = 3;

/**
 * Le score : 50 % taux de réponse (un refus motivé compte moitié : il vaut mieux qu'un silence), 30 % complétude des
 * offres, 20 % délai (plein sous 24 h, nul à 7 jours et au-delà). Des faits, pas une opinion ; et dit avec sa base.
 */
export function scoreFiabilite(f: FaitsNegoce): ScoreFiabilite {
  const n = Math.max(0, f.sollicitations);
  const tauxReponse = n ? Math.min(1, (f.reponses + 0.5 * f.refus) / n) : 0;
  const delaiMoyenHeures = f.delaisHeures.length ? Math.round((f.delaisHeures.reduce((s, x) => s + x, 0) / f.delaisHeures.length) * 10) / 10 : null;
  const completude = f.lignesDemandees > 0 ? Math.min(1, f.lignesChiffrees / f.lignesDemandees) : null;
  const noteDelai = delaiMoyenHeures === null ? 0 : delaiMoyenHeures <= 24 ? 1 : delaiMoyenHeures >= 168 ? 0 : 1 - (delaiMoyenHeures - 24) / 144;
  const score = n < MIN_SOLLICITATIONS ? null : Math.round(100 * (0.5 * tauxReponse + 0.3 * (completude ?? 0) + 0.2 * noteDelai));
  const familles = [...new Set(f.familles)].sort();
  const base = `${n} demande${n > 1 ? "s" : ""}, ${f.reponses} réponse${f.reponses > 1 ? "s" : ""}${f.refus ? `, ${f.refus} « ne peut pas chiffrer »` : ""}`;
  return { score, tauxReponse: Math.round(tauxReponse * 100) / 100, delaiMoyenHeures, completude: completude === null ? null : Math.round(completude * 100) / 100, familles, base };
}

/* ---------------------------------------------------------------------------------- les familles configurables */

export interface FamilleConfiguree {
  code: string;
  libelle: string;
  ordre: number;
  /** Proposée dans les achats groupés et les filtres. */
  active: boolean;
}

/** Un code de famille : minuscules, chiffres et « _ », 2 à 40 caractères (« couverture », « second_oeuvre »). */
export const codeFamilleValide = (code: string) => /^[a-z][a-z0-9_]{1,39}$/.test(code);

/** Les familles actives, dans l'ordre choisi ; leurs libellés par code (un code inconnu garde son code lisible). */
export function famillesActives(familles: readonly FamilleConfiguree[]): { codes: string[]; libelles: Record<string, string> } {
  const triees = [...familles].sort((a, b) => a.ordre - b.ordre || a.code.localeCompare(b.code));
  return { codes: triees.filter((f) => f.active).map((f) => f.code), libelles: Object.fromEntries(triees.map((f) => [f.code, f.libelle])) };
}
