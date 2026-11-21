import type { Referential } from "./model.js";
import { composeReferentials } from "./compose.js";
import { FICHES, ficheDeCalcul, ficheDuMetier, referentielDeFiche } from "./fiches/index.js";
import { ARROSAGE_REFERENTIAL } from "./data/arrosage.js";
import { BARDAGE_REFERENTIAL } from "./data/bardage.js";
import { CARRELAGE_REFERENTIAL } from "./data/carrelage.js";
import { CHARPENTE_REFERENTIAL } from "./data/charpente.js";
import { CUISINE_REFERENTIAL } from "./data/cuisine.js";
import { CHAUFFAGE_VENTILATION_REFERENTIAL } from "./data/chauffage-ventilation.js";
import { ELECTRICITE_REFERENTIAL } from "./data/electricite.js";
import { ETANCHEITE_REFERENTIAL } from "./data/etancheite.js";
import { FACADE_REFERENTIAL } from "./data/facade.js";
import { MACONNERIE_REFERENTIAL } from "./data/maconnerie.js";
import { MENUISERIE_REFERENTIAL } from "./data/menuiserie.js";
import { MENUISERIE_INTERIEURE_REFERENTIAL } from "./data/menuiserie-interieure.js";
import { PHOTOVOLTAIQUE_REFERENTIAL } from "./data/photovoltaique.js";
import { PLAFONDS_SUSPENDUS_REFERENTIAL } from "./data/plafonds-suspendus.js";
import { PAVAGE_REFERENTIAL } from "./data/pavage.js";
import { PEINTURE_REFERENTIAL } from "./data/peinture.js";
import { PLATRERIE_REFERENTIAL } from "./data/platrerie.js";
import { PLOMBERIE_REFERENTIAL } from "./data/plomberie.js";
import { ROOFING_REFERENTIAL } from "./data/roofing.js";
import { TERRASSE_BOIS_REFERENTIAL } from "./data/terrasse-bois.js";
import { TERRASSEMENT_REFERENTIAL } from "./data/terrassement.js";

/**
 * LES TIROIRS OUVERTS (§22 : un métier = un dossier de référentiel, moteur générique) : le référentiel de chaque
 * métier que BatiClair sait calculer. Un métier absent d'ici n'a pas de tiroir : on le dit, on ne calcule jamais
 * un devis d'électricien avec les règles du couvreur.
 */
const LOTS: readonly Referential[] = [
  MACONNERIE_REFERENTIAL,
  TERRASSEMENT_REFERENTIAL,
  CHARPENTE_REFERENTIAL,
  ROOFING_REFERENTIAL,
  ETANCHEITE_REFERENTIAL,
  MENUISERIE_REFERENTIAL,
  PLATRERIE_REFERENTIAL,
  PLAFONDS_SUSPENDUS_REFERENTIAL,
  ELECTRICITE_REFERENTIAL,
  PLOMBERIE_REFERENTIAL,
  CHAUFFAGE_VENTILATION_REFERENTIAL,
  CARRELAGE_REFERENTIAL,
  PEINTURE_REFERENTIAL,
  MENUISERIE_INTERIEURE_REFERENTIAL,
  CUISINE_REFERENTIAL,
  FACADE_REFERENTIAL,
  BARDAGE_REFERENTIAL,
  PHOTOVOLTAIQUE_REFERENTIAL,
  TERRASSE_BOIS_REFERENTIAL,
  PAVAGE_REFERENTIAL,
  ARROSAGE_REFERENTIAL,
];

/**
 * Constructeur de maisons, entreprise générale (lot B) : un devis qui passe par tous les lots. Chaque ligne est calculée
 * par le tiroir de son lot (gros œuvre d'abord, finitions ensuite), sans règle propre ; sa version suit celles des lots.
 */
export const CONSTRUCTEUR_REFERENTIAL: Referential = composeReferentials(
  "constructeur",
  "constructeur-2026.10.06-2",
  "general",
  LOTS,
);

export const REFERENTIALS: readonly Referential[] = [
  ROOFING_REFERENTIAL,
  PLATRERIE_REFERENTIAL,
  CARRELAGE_REFERENTIAL,
  PEINTURE_REFERENTIAL,
  MACONNERIE_REFERENTIAL,
  ELECTRICITE_REFERENTIAL,
  PLOMBERIE_REFERENTIAL,
  MENUISERIE_REFERENTIAL,
  CHAUFFAGE_VENTILATION_REFERENTIAL,
  CHARPENTE_REFERENTIAL,
  ETANCHEITE_REFERENTIAL,
  BARDAGE_REFERENTIAL,
  FACADE_REFERENTIAL,
  PLAFONDS_SUSPENDUS_REFERENTIAL,
  MENUISERIE_INTERIEURE_REFERENTIAL,
  CUISINE_REFERENTIAL,
  PHOTOVOLTAIQUE_REFERENTIAL,
  TERRASSE_BOIS_REFERENTIAL,
  PAVAGE_REFERENTIAL,
  TERRASSEMENT_REFERENTIAL,
  ARROSAGE_REFERENTIAL,
  CONSTRUCTEUR_REFERENTIAL,
];

/** Nom du métier tel que l'API le montre (« couverture », « platrerie ») ; les deux formes sont acceptées en entrée. */
const METIERS_DE_BASE: Readonly<Record<string, string>> = {
  roofing: "couverture",
  drywall: "platrerie",
  tiling: "carrelage",
  painting: "peinture",
  masonry: "maconnerie",
  electrical: "electricite",
  plumbing: "plomberie",
  joinery: "menuiserie",
  hvac: "chauffage-ventilation",
  carpentry: "charpente",
  waterproofing: "etancheite",
  cladding: "bardage",
  facade: "facade",
  ceiling: "plafonds-suspendus",
  interior_joinery: "menuiserie-interieure",
  kitchen: "cuisine",
  solar: "photovoltaique",
  decking: "terrasse-bois",
  paving: "pavage",
  earthworks: "terrassement",
  irrigation: "arrosage",
  general: "constructeur",
};

/**
 * Les métiers de BatiClair : ceux des tiroirs, plus chaque métier qu'une fiche de `referentiels/metiers/` déclare (son
 * identifiant, son nom de fichier) : ajouter un métier = ajouter un fichier (mission du fondateur, 2026-10-19).
 */
export const METIER_NAMES: Readonly<Record<string, string>> = {
  ...METIERS_DE_BASE,
  ...Object.fromEntries(FICHES.filter((f) => !(f.metier in METIERS_DE_BASE)).map((f) => [f.metier, f.code])),
};

/** « couverture », « roofing », « Plâtrerie », « drywall » → l'identifiant du métier (« roofing », « drywall »). */
export function tradeIdOf(metier: string): string {
  const n = metier.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  return Object.entries(METIER_NAMES).find(([id, name]) => id === n || name === n)?.[0] ?? n;
}

/**
 * Le référentiel d'un métier, ou null s'il n'a pas de tiroir. Un artisan multi-métiers (« roofing,drywall ») prend
 * le premier de ses métiers qui en a un.
 */
export function referentialFor(trade: string | null | undefined): Referential | null {
  for (const id of (trade ?? "").split(",").map((t) => tradeIdOf(t)).filter(Boolean)) {
    // Un métier calculé par sa fiche (§52, format commun) passe avant son ancien tiroir.
    const fiche = ficheDeCalcul(id);
    if (fiche) return referentielDeFiche(fiche);
    const ref = REFERENTIALS.find((r) => r.trade === id);
    if (ref) return ref;
  }
  return null;
}

/**
 * §52 (décision du 11 octobre) : « Tant que le référentiel d'un métier n'a pas été relu par un artisan de ce métier, le
 * métier porte dans l'app la mention « ratios en cours de validation » sur l'écran 3 et dans le PDF fournisseur. »
 * Retour du fondateur (2026-10-12) : électricité, maçonnerie, carrelage et tout métier pas encore relu ; pas la
 * couverture. Le référentiel couverture-étanchéité est le sien : couverture et étanchéité sont relues.
 */
export const METIERS_RELUS: readonly string[] = ["roofing", "waterproofing"];
export const MENTION_RATIOS = "Ratios en cours de validation";

/** Le métier du devis (celui de son tiroir) n'a pas encore été relu par un artisan : la mention §52 s'affiche. */
export function ratiosEnValidation(trade: string | null | undefined): boolean {
  const id = referentialFor(trade)?.trade ?? tradeIdOf((trade ?? "").split(",")[0] ?? "");
  // Une fiche dit elle-même son état : la mention tombe quand un artisan du métier l'a relue (« relu »).
  const fiche = ficheDuMetier(id);
  if (fiche) return fiche.etat !== "relu";
  return !METIERS_RELUS.includes(id);
}

/** §52 : un devis porte la mention dès que son métier ou l'un de ses lots n'a pas encore été relu par un artisan. */
export function ratiosEnValidationDuDevis(lecture: { metier: string | null; lots: readonly { metier: string }[] } | null | undefined, trade: string | null | undefined): boolean {
  const metiers = [lecture?.metier ?? trade, ...(lecture && lecture.lots.length > 1 ? lecture.lots.map((l) => l.metier) : [])];
  return metiers.some((m) => ratiosEnValidation(m));
}
