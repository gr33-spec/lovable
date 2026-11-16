/**
 * MA PAGE MOBIIZ : où vivent les photos. Toujours un stockage OBJET avec son adresse publique (CDN), jamais la base ; les
 * adaptateurs sont dans `infrastructure/stockage-photos.ts` (Vercel Blob, dossier local, coupé).
 */
export interface StockagePhotos {
  readonly actif: boolean;
  /**
   * Enregistre un fichier. `adresse` : l'adresse publique, TOUJOURS sur le domaine du site (aucune ressource d'ailleurs,
   * règle de sécurité du 26 octobre 2026) ; `cle` : ce qu'il faut passer à `supprimer`.
   */
  deposer(cle: string, octets: Buffer, type: string): Promise<{ adresse: string; cle: string }>;
  /** Supprime des fichiers (un fichier déjà absent n'est pas une erreur). */
  supprimer(cles: string[]): Promise<void>;
  /** Les fichiers rangés sous un préfixe (« pages/ ») : leur nom et l'adresse à passer à `supprimer`. */
  lister(prefixe: string): Promise<{ cle: string; url: string }[]>;
}
