import { DEPARTEMENTS } from "../../../../packages/domain/src/groupe/geographie";
import { BADGE_BIENTOT_DISPONIBLE, metierInscriptionOuvert } from "../../../../packages/domain/src/inscription/metiers-ouverts";
import { TRADES } from "./trades";

/**
 * L'INSCRIPTION PAR MÉTIER (Greg, 19 novembre 2026) : les métiers dits comme l'artisan se nomme (« Électricien », pas
 * « Électricité »), dans l'ordre de `TRADES`. Seul « Couvreur » est ouvert (`metierInscriptionOuvert`) ; les autres sont
 * « Bientôt disponible » et mènent à la liste d'attente.
 */
const NOMS: Record<string, { nom: string; pluriel: string }> = {
  roofing: { nom: "Couvreur", pluriel: "couvreurs" },
  masonry: { nom: "Maçon", pluriel: "maçons" },
  drywall: { nom: "Plaquiste", pluriel: "plaquistes" },
  painting: { nom: "Peintre", pluriel: "peintres" },
  tiling: { nom: "Carreleur", pluriel: "carreleurs" },
  flooring: { nom: "Solier, parqueteur", pluriel: "soliers et parqueteurs" },
  electrical: { nom: "Électricien", pluriel: "électriciens" },
  plumbing: { nom: "Plombier", pluriel: "plombiers" },
  joinery: { nom: "Menuisier", pluriel: "menuisiers" },
  hvac: { nom: "Chauffagiste", pluriel: "chauffagistes" },
  carpentry: { nom: "Charpentier", pluriel: "charpentiers" },
  waterproofing: { nom: "Étancheur", pluriel: "étancheurs" },
  cladding: { nom: "Bardeur", pluriel: "bardeurs" },
  facade: { nom: "Façadier", pluriel: "façadiers" },
  ceiling: {
    nom: "Plafonds suspendus",
    pluriel: "poseurs de plafonds suspendus",
  },
  interior_joinery: { nom: "Agenceur", pluriel: "agenceurs" },
  kitchen: { nom: "Cuisiniste", pluriel: "cuisinistes" },
  solar: { nom: "Photovoltaïque", pluriel: "installateurs photovoltaïques" },
  decking: { nom: "Terrasse bois", pluriel: "poseurs de terrasses" },
  paving: { nom: "Paveur", pluriel: "paveurs" },
  earthworks: { nom: "Terrassier", pluriel: "terrassiers" },
  irrigation: {
    nom: "Arrosage automatique",
    pluriel: "installateurs d’arrosage",
  },
  metalwork: {
    nom: "Serrurier, métallier",
    pluriel: "serruriers et métalliers",
  },
  general: { nom: "Entreprise générale", pluriel: "entreprises générales" },
  other: { nom: "Autre métier", pluriel: "autres métiers" },
};

export interface MetierInscription {
  id: string;
  nom: string;
  pluriel: string;
  /** Ce que couvre le métier (le libellé de `TRADES`). */
  detail: string;
  ouvert: boolean;
}

export const METIERS_INSCRIPTION: readonly MetierInscription[] = TRADES.map((t) => ({
  id: t.id,
  nom: NOMS[t.id]?.nom ?? t.label,
  pluriel: NOMS[t.id]?.pluriel ?? t.label.toLowerCase(),
  detail: t.label,
  ouvert: metierInscriptionOuvert(t.id),
}));

export const metierInscription = (id: string | null | undefined) => METIERS_INSCRIPTION.find((m) => m.id === id) ?? null;
export { BADGE_BIENTOT_DISPONIBLE };

/** Les départements de métropole et d'outre-mer, pour la liste de l'inscription (code et nom). */
export const DEPARTEMENTS_INSCRIPTION = DEPARTEMENTS.map((d) => ({
  code: d.code,
  nom: d.nom,
}));
export const departementConnu = (code: string | null | undefined) => DEPARTEMENTS.find((d) => d.code === code) ?? null;
