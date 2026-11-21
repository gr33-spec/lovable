/**
 * LES PHOTOS DE L'ACCUEIL (Greg, 21 novembre 2026 : « je les remplace par les miennes »). Ce sont les photos de Greg :
 * aucun crédit à afficher. Fichiers dans `apps/web/public/accueil/` (AVIF puis WebP, 640 et 1280 px de large) ; les
 * anciennes (Wikimedia Commons) sont gardées dans `baticlair/docs/photos-accueil-anciennes/`. Pour en changer : déposer
 * les nouvelles aux mêmes noms, ou changer les chemins ci-dessous (`docs/photos-accueil.md`).
 * - « Nouveau quantitatif » : un artisan prépare sa liste sur ses plans, au calme, tablette à côté. Elle vaut pour tous
 *   les métiers (rien n'y est propre à la couverture).
 * - « Achats groupés » : des artisans réunis devant un dépôt.
 */
export interface PhotoAccueil {
  /** Les fichiers, du plus petit au plus grand. */
  tailles: { largeur: number; avif: string; webp: string }[];
  largeur: number;
  hauteur: number;
  alt: string;
  /** Le point de la photo qui reste visible quand elle est recadrée (petit iPhone, ordinateur, vignette). */
  cadrage: string;
}

const accueil = (nom: string) => [640, 1280].map((l) => ({ largeur: l, avif: `/accueil/${nom}-${l}.avif`, webp: `/accueil/${nom}-${l}.webp` }));

export const PHOTO_QUANTITATIF: PhotoAccueil = {
  tailles: accueil("quantitatif-greg"),
  largeur: 1280,
  hauteur: 640,
  alt: "Un artisan prépare sa liste de matériaux sur ses plans, carnet, calculette et tablette à côté",
  // L'artisan, son carnet et le plan restent dans le cadre, même recadré pour l'ordinateur.
  cadrage: "30% 45%",
};

export const PHOTO_GROUPES: PhotoAccueil = {
  tailles: accueil("groupes-greg"),
  largeur: 1280,
  hauteur: 640,
  alt: "Une vingtaine d'artisans en tenue de travail réunis devant un dépôt",
  // Les visages (haut de la photo) restent visibles quand la carte est plus large que haute.
  cadrage: "50% 28%",
};

/** La photo de la zone « Nouveau quantitatif » : la même pour tous les métiers. */
export function photoDuQuantitatif(): PhotoAccueil {
  return PHOTO_QUANTITATIF;
}
