import { photoDefautDe } from "../../../../packages/domain/src/page-entreprise/photos-defaut";

/**
 * LES PHOTOS DE L'ACCUEIL (Greg, 20 novembre 2026). Libres de droits pour un usage commercial, sans faux logo ; sources et
 * licences dans `docs/photos-accueil.md`. POUR METTRE TES PHOTOS : dépose-les dans `apps/web/public/accueil/` (AVIF et
 * WebP, 640 et 1280 px de large) et change seulement les chemins ci-dessous.
 * - « Nouveau quantitatif » : la photo du métier ; couvreur : un couvreur sur un toit d'ardoise ; les autres métiers
 *   ouverts : la photo de leur site d'artisan (`photos-defaut.ts`) ; plusieurs métiers : une photo neutre du bâtiment.
 * - « Achats groupés » : des couvreurs qui travaillent ensemble sur un toit.
 */
export interface PhotoAccueil {
  /** Les fichiers, du plus petit au plus grand. */
  tailles: { largeur: number; avif: string; webp: string }[];
  largeur: number;
  hauteur: number;
  alt: string;
  /** Le crédit à afficher quand la licence l'exige (CC BY, CC BY-SA), sinon null. */
  credit: string | null;
  /** Le point de la photo qui reste visible quand elle est recadrée. */
  cadrage: string;
}

const accueil = (nom: string, largeurs: number[]) => largeurs.map((l) => ({ largeur: l, avif: `/accueil/${nom}-${l}.avif`, webp: `/accueil/${nom}-${l}.webp` }));

export const PHOTO_COUVREUR: PhotoAccueil = {
  tailles: accueil("quantitatif-couvreur", [640, 1280]),
  largeur: 1280,
  hauteur: 557,
  alt: "Un couvreur au travail sur un toit d'ardoise, assis sur une planche de toit, ardoises en piles à côté de lui",
  // Domaine public (Wikimedia Commons) : aucun crédit exigé.
  credit: null,
  cadrage: "50% 40%",
};

export const PHOTO_GROUPES: PhotoAccueil = {
  tailles: accueil("groupes-artisans", [640, 950]),
  largeur: 950,
  hauteur: 430,
  alt: "Trois couvreurs casqués travaillent ensemble sur un toit en tuiles",
  credit: "David Shankbone, CC BY 3.0, Wikimedia Commons",
  cadrage: "40% 50%",
};

/** La photo de la zone « Nouveau quantitatif » d'après les métiers de l'entreprise. */
export function photoDuQuantitatif(metiers: readonly string[]): PhotoAccueil {
  const distincts = [...new Set(metiers.filter((m) => m && m !== "other" && m !== "general"))];
  if (distincts.length === 1 && distincts[0] === "roofing") return PHOTO_COUVREUR;
  const p = photoDefautDe(null, metiers);
  if (!p) return PHOTO_COUVREUR;
  return {
    tailles: [
      { largeur: 800, avif: `/site/photos/${p.id}-800.avif`, webp: `/site/photos/${p.id}-800.webp` },
      { largeur: p.largeur, avif: `/site/photos/${p.id}.avif`, webp: `/site/photos/${p.id}.webp` },
    ],
    largeur: p.largeur,
    hauteur: p.hauteur,
    alt: p.nom,
    credit: p.credit,
    cadrage: "50% 50%",
  };
}

export const creditsDesPhotos = (photos: readonly PhotoAccueil[]): string[] => [...new Set(photos.map((p) => p.credit).filter((c): c is string => !!c))];
