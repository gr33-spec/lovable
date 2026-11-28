/**
 * LE MODÈLE DES PAGES LOCALES (Greg, 19 novembre 2026, « Couvreurs de Bretagne ») : une page = une FICHE DE CONTENU.
 * Créer une nouvelle région (ou, plus tard, un nouveau métier) = écrire une fiche et l'ajouter à `PAGES_LOCALES`
 * (`pages.ts`), sans toucher au code de la page. La structure est universelle :
 *   1. une accroche locale (le métier, la région) ;
 *   2. la carte de la région et ses départements, touchables ; les regroupements en cours du département touché ;
 *   3. le fonctionnement (trois étapes) et le collectif ;
 *   4. LE VISUEL EMBLÉMATIQUE du métier dans la région (pour un couvreur breton : la toiture en ardoise naturelle) ;
 *   5. LA PETITE HISTOIRE (pour la couverture : les matériaux ; pour un autre métier : normes, évolution, habitudes) ;
 *   6. l'ambiance du coin (photos), le mot local, les questions, l'inscription.
 * RÈGLES : rien d'inventé (chaque fait de l'histoire cite au moins deux sources, `sources`), aucun chiffre ni témoignage
 * inventé, aucun montant ; une photo est libre de droits pour un usage commercial et porte son auteur et sa licence.
 */

export interface Departement {
  /** Code INSEE (« 22 »). */
  code: string;
  nom: string;
  /** « dans les Côtes-d'Armor », « dans le Finistère » : la préposition et l'article justes. */
  dans: string;
}

export interface Photo {
  /** Chemin public (`/regions/bretagne/toit-ardoise.webp`) : pour remplacer une photo, on garde le nom et on change le fichier. */
  src: string;
  /** Largeur et hauteur du fichier (évite le saut de mise en page). */
  largeur: number;
  hauteur: number;
  alt: string;
  /** Ce que dit la légende (lieu, sujet). */
  legende: string;
  /** Le crédit affiché : auteur, licence. */
  credit: string;
  /** La page d'origine (licence vérifiable). */
  source: string;
}

export interface Source {
  id: string;
  titre: string;
  editeur: string;
  url: string;
}

/** Un paragraphe de l'histoire, avec les sources qui l'appuient (au moins deux). */
export interface Paragraphe {
  texte: string;
  sources: readonly string[];
}

export interface FichePageLocale {
  /** L'adresse de la page (`/couvreurs-bretagne`). */
  slug: string;
  metier: {
    /** Identifiant de `TRADES` (rempli à l'inscription). */
    id: string;
    /** « couvreur », « couvreurs ». */
    nom: string;
    nomPluriel: string;
    /** Les lots d'achats groupés montrés sur la carte (`LOTS_V1`). */
    lots: readonly string[];
  };
  region: {
    nom: string;
    /** « en Bretagne ». */
    en: string;
    departements: readonly Departement[];
    /** Le drapeau discret de l'accroche (aucun s'il n'y en a pas). */
    drapeau: "gwenn-ha-du" | null;
  };
  seo: { titre: string; description: string };
  accroche: { kicker: string; titre: readonly [string, string]; lead: string };
  etapes: readonly { titre: string; texte: string }[];
  collectif: { titre: string; texte: string; note: string };
  /** Le visuel emblématique du métier dans la région, et ce qu'il dit. */
  emblematique: {
    surtitre: string;
    titre: string;
    paragraphes: readonly string[];
    points: readonly { titre: string; texte: string }[];
    photo: Photo;
  };
  histoire: {
    surtitre: string;
    titre: string;
    chapitres: readonly { titre: string; paragraphes: readonly Paragraphe[] }[];
  };
  ambiance: { titre: string; photos: readonly Photo[] };
  local: { surtitre: string; titre: string; texte: string };
  questions: readonly { q: string; r: string }[];
  final: { titre: readonly [string, string]; texte: string };
  sources: readonly Source[];
}
