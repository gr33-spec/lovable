/**
 * MA PAGE MOBIIZ : où vivent les photos. Toujours un stockage OBJET avec son adresse publique (CDN), jamais la base ; les
 * adaptateurs sont dans `infrastructure/stockage-photos.ts` (Vercel Blob, dossier local, coupé).
 */
export interface StockagePhotos {
  readonly actif: boolean;
  /** Enregistre un fichier et rend son adresse publique. */
  deposer(cle: string, octets: Buffer, type: string): Promise<string>;
  /** Supprime des fichiers (un fichier déjà absent n'est pas une erreur). */
  supprimer(cles: string[]): Promise<void>;
  /** Les fichiers rangés sous un préfixe (« pages/ ») : leur nom et l'adresse à passer à `supprimer`. */
  lister(prefixe: string): Promise<{ cle: string; url: string }[]>;
}
