import type { PhotoPublique } from "./page.js";

/**
 * PHOTOS PAR DÉFAUT (Greg, 17 novembre 2026) : chaque métier a une photo de couverture, vraie, libre de droits (licence
 * qui autorise l'usage commercial ; auteur et licence gardés dans `docs/photos-par-defaut.md`). Une entreprise de
 * plusieurs métiers prend une photo neutre du bâtiment. La photo par défaut sert tant que l'artisan n'a pas mis la
 * sienne ; elle suit son métier principal, sauf s'il en a choisi une dans la galerie. Les fichiers sont servis par le
 * site (`apps/web/public/site/photos/<id>.webp`, `-800.webp`, `.avif`, `-800.avif`), jamais par le stockage des photos.
 */
export interface PhotoDefaut {
  id: string;
  /** Le métier montré, ou null pour une photo neutre (bâtiment). */
  metier: string | null;
  /** Ce que montre la photo, pour la galerie (« Toiture en ardoise »). */
  nom: string;
  largeur: number;
  hauteur: number;
  /** Le crédit à afficher en pied de page quand la licence l'exige (CC BY, CC BY-SA), sinon null. */
  credit: string | null;
}

export const PHOTOS_DEFAUT: readonly PhotoDefaut[] = [];

/** Les photos neutres (bâtiment), choix de secours pour tous. */
export const photosNeutres = (): PhotoDefaut[] => PHOTOS_DEFAUT.filter((p) => p.metier === null);

/** La photo d'une entreprise : celle choisie dans la galerie, sinon celle de son métier (une neutre s'il en a plusieurs). */
export function photoDefautDe(choisie: string | null | undefined, metiers: readonly string[]): PhotoDefaut | null {
  const choix = choisie ? PHOTOS_DEFAUT.find((p) => p.id === choisie) : undefined;
  if (choix) return choix;
  const distincts = [...new Set(metiers.filter((m) => m && m !== "other" && m !== "general"))];
  const duMetier = distincts.length === 1 ? PHOTOS_DEFAUT.find((p) => p.metier === distincts[0]) : undefined;
  return duMetier ?? photosNeutres()[0] ?? null;
}

const DOSSIER = "/site/photos";

/** La photo par défaut sous la forme d'une photo de la page (AVIF puis WebP, 800 et 1920 px). */
export function photoPubliqueDefaut(p: PhotoDefaut): PhotoPublique {
  return {
    id: `defaut:${p.id}`,
    legende: null,
    largeur: p.largeur,
    hauteur: p.hauteur,
    variantes: [
      { largeur: 800, avif: `${DOSSIER}/${p.id}-800.avif`, webp: `${DOSSIER}/${p.id}-800.webp` },
      { largeur: Math.min(1920, p.largeur), avif: `${DOSSIER}/${p.id}.avif`, webp: `${DOSSIER}/${p.id}.webp` },
    ],
    partage: null,
  };
}

/** La vignette de la galerie de l'éditeur. */
export const vignetteDefaut = (p: PhotoDefaut): string => `${DOSSIER}/${p.id}-800.webp`;
