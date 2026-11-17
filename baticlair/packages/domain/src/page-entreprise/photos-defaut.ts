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
  /** D'autres métiers que la photo montre aussi bien (la menuiserie pour l'agenceur). */
  aussi?: readonly string[];
  /** Ce que montre la photo, pour la galerie (« Toiture en ardoise »). */
  nom: string;
  largeur: number;
  hauteur: number;
  /** Le crédit à afficher en pied de page quand la licence l'exige (CC BY, CC BY-SA), sinon null. */
  credit: string | null;
}

/**
 * Toutes de Wikimedia Commons (17 novembre 2026), sources et licences dans `docs/photos-par-defaut.md`. Les neutres
 * d'abord : la première sert aux entreprises de plusieurs métiers. Sans photo assez belle (chauffage-ventilation : chaque
 * pompe à chaleur montrait sa marque), le métier prend la photo neutre.
 */
export const PHOTOS_DEFAUT: readonly PhotoDefaut[] = [
  { id: "neutre-1", metier: null, nom: "Maisons en construction", largeur: 1920, hauteur: 1440, credit: "Sebastiandoe5, CC BY-SA 4.0, Wikimedia Commons" },
  { id: "neutre-2", metier: null, nom: "Façade rénovée", largeur: 1920, hauteur: 1440, credit: "Wikibenchris, CC BY-SA 4.0, Wikimedia Commons" },
  { id: "neutre-3", metier: null, nom: "Chantier de maisons neuves", largeur: 1920, hauteur: 1173, credit: "Geolina163, CC BY-SA 4.0, Wikimedia Commons" },
  { id: "neutre-4", metier: null, nom: "Maisons neuves terminées", largeur: 1920, hauteur: 1219, credit: null },
  { id: "roofing", metier: "roofing", nom: "Toiture en tuiles en cours", largeur: 1613, hauteur: 890, credit: "Hauserphoton, CC BY-SA 3.0, Wikimedia Commons" },
  { id: "masonry", metier: "masonry", nom: "Murs en parpaings", largeur: 1920, hauteur: 1440, credit: "Kolforn, CC BY-SA 4.0, Wikimedia Commons" },
  { id: "drywall", metier: "drywall", nom: "Cloisons en plaques de plâtre", largeur: 1920, hauteur: 1077, credit: "Asurnipal, CC BY-SA 4.0, Wikimedia Commons" },
  { id: "painting", metier: "painting", nom: "Peinture au rouleau", largeur: 1920, hauteur: 1288, credit: "James Lee from Chester, NH, USA, CC BY 2.0, Wikimedia Commons" },
  { id: "tiling", metier: "tiling", nom: "Pose de carrelage", largeur: 1920, hauteur: 1375, credit: null },
  { id: "flooring", metier: "flooring", nom: "Pose de parquet", largeur: 1920, hauteur: 1280, credit: "Raphael Mecke, CC BY 4.0, Wikimedia Commons" },
  { id: "electrical", metier: "electrical", nom: "Raccordement d'une prise", largeur: 1920, hauteur: 1440, credit: "Santeri Viinamäki, CC BY-SA 4.0, Wikimedia Commons" },
  { id: "plumbing", metier: "plumbing", nom: "Brasure d'un tube cuivre", largeur: 1920, hauteur: 1440, credit: "Le plombier du désert, CC BY-SA 4.0, Wikimedia Commons" },
  { id: "joinery", metier: "joinery", aussi: ["interior_joinery"], nom: "Menuiserie bois", largeur: 1920, hauteur: 1280, credit: "Minette Lontsie, CC BY-SA 4.0, Wikimedia Commons" },
  { id: "carpentry", metier: "carpentry", nom: "Charpente neuve", largeur: 1920, hauteur: 1280, credit: "Leo Miregalitheo, CC BY-SA 4.0, Wikimedia Commons" },
  { id: "waterproofing", metier: "waterproofing", nom: "Étanchéité de toit-terrasse", largeur: 1920, hauteur: 1440, credit: "Luanr36, CC BY-SA 4.0, Wikimedia Commons" },
  { id: "cladding", metier: "cladding", nom: "Bardage bois", largeur: 1920, hauteur: 1252, credit: "Des Blenkinsopp, CC BY-SA 2.0, Wikimedia Commons" },
  { id: "facade", metier: "facade", nom: "Ravalement de façade", largeur: 1920, hauteur: 1306, credit: "Mafo, CC BY 4.0, Wikimedia Commons" },
  { id: "ceiling", metier: "ceiling", nom: "Faux plafond", largeur: 1920, hauteur: 1440, credit: "MTA Capital Construction Mega Projects, CC BY 2.0, Wikimedia Commons" },
  { id: "kitchen", metier: "kitchen", nom: "Cuisine équipée", largeur: 1920, hauteur: 1282, credit: "Shixart1985, CC BY 2.0, Wikimedia Commons" },
  { id: "solar", metier: "solar", nom: "Panneaux solaires", largeur: 1920, hauteur: 1440, credit: "Stefan Thiesen, CC BY-SA 3.0, Wikimedia Commons" },
  { id: "decking", metier: "decking", nom: "Terrasse bois", largeur: 1920, hauteur: 1280, credit: "Øyvind Holmstad, CC BY-SA 4.0, Wikimedia Commons" },
  { id: "paving", metier: "paving", nom: "Pavage", largeur: 1920, hauteur: 1280, credit: "BrankaVV, CC BY-SA 4.0, Wikimedia Commons" },
  { id: "earthworks", metier: "earthworks", nom: "Terrassement", largeur: 1920, hauteur: 1440, credit: "Triplec85, CC BY-SA 4.0, Wikimedia Commons" },
  { id: "irrigation", metier: "irrigation", nom: "Arrosage automatique", largeur: 1920, hauteur: 1243, credit: "Angelo DeSantis from Berkeley, US, CC BY 2.0, Wikimedia Commons" },
  { id: "metalwork", metier: "metalwork", nom: "Soudure acier", largeur: 1920, hauteur: 1440, credit: "Kgequipment, CC BY-SA 3.0, Wikimedia Commons" },
];

/** Les photos neutres (bâtiment), choix de secours pour tous. */
export const photosNeutres = (): PhotoDefaut[] => PHOTOS_DEFAUT.filter((p) => p.metier === null);

/** La photo d'une entreprise : celle choisie dans la galerie, sinon celle de son métier (une neutre s'il en a plusieurs). */
export function photoDefautDe(choisie: string | null | undefined, metiers: readonly string[]): PhotoDefaut | null {
  const choix = choisie ? PHOTOS_DEFAUT.find((p) => p.id === choisie) : undefined;
  if (choix) return choix;
  const distincts = [...new Set(metiers.filter((m) => m && m !== "other" && m !== "general"))];
  const duMetier = distincts.length === 1 ? PHOTOS_DEFAUT.find((p) => p.metier === distincts[0] || p.aussi?.includes(distincts[0]!)) : undefined;
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
