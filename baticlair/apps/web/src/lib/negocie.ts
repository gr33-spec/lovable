/**
 * LE REGROUPEMENT NÉGOCIÉ PAR UN HUMAIN (business model final, Greg, 25 octobre 2026) : les contrats de l'API pour les
 * besoins de l'artisan, l'offre du chasseur, la veille, « Préviens ton négoce », les prix observés et l'écran du chasseur.
 */

export type ModeRegroupement = "humain" | "automatique";
export type StatutRegroupement = "en_collecte" | "en_negociation" | "offre_recue" | "commande" | "abandonne";

export interface OffreNegociee {
  negoce: string;
  prixHt: number;
  livraisonHt: number;
  totalHt: number;
  conditions: string | null;
  valideJusquau: string;
  valide: boolean;
  mentions: string[];
}

export interface BesoinNegocie {
  id: string;
  designation: string;
  quantite: number;
  unite: string;
  dateBesoin: string;
  statut: "declare" | "accepte" | "refuse";
  regroupement: { id: string; statut: StatutRegroupement; libelle: string; participants: { titre: string; detail: string | null }; departement: string } | null;
  offre: OffreNegociee | null;
  perso: { prixHt: number; negoce: string } | null;
  bonNumero: number | null;
}

export interface LigneEnVeille {
  id: string;
  designation: string;
  quantite: number;
  unite: string;
  chantier: string | null;
  dateBesoin: string;
  regroupementDisponible: boolean;
}

export interface MesBesoins {
  mode: ModeRegroupement;
  zone: string | null;
  zoneActive: boolean;
  message: string | null;
  besoins: BesoinNegocie[];
  veille: LigneEnVeille[];
}

export interface LignesNegociables {
  zone: string | null;
  zoneActive: boolean;
  message: string | null;
  lignes: { key: string; designation: string; quantite: number; unite: string; negociable: boolean; reference: string | null; raison: string | null }[];
}

export interface APrevenir {
  titre: string;
  sms: string;
  negoces: { supplierId: string; nom: string; telephone: string | null; tel: string | null; sms: string }[];
}

export interface PrixDuSecteur {
  departement: string | null;
  articles: { libelle: string; unite: string; environ: number }[];
}

export interface RegroupementChasseur {
  id: string;
  numero: number;
  libelle: string;
  famille: string;
  departement: string;
  statut: StatutRegroupement;
  chasseur: string | null;
  dateBesoinMin: string | null;
  /** Point 4 bis : la date butoir (besoin le plus proche moins le délai de livraison), les jours qui restent, la pastille. */
  dateLimite: string | null;
  joursRestants: number | null;
  pastille: "verte" | "rouge" | "neutre";
  volume: number;
  unite: string;
  entreprises: number;
  participants: { besoinId: string; entreprise: string; quantite: number; statut: string; commune: string; dateBesoin: string }[];
  acceptes: number;
  negoces: { nom: string; email: string; telephone: string | null; verification: string | null; aRepondu: boolean; utiliseEnPerso: boolean }[];
  offre: { negoceNom: string; prixNegocieHt: number; commissionPct: number; prixAfficheHt: number; livraisonHt: number; valideJusquau: string; envoyee: boolean; transmise: boolean } | null;
  appels: { negoce: string; note: string; le: string; par: string }[];
}

export const STATUTS_CHASSEUR: Record<RegroupementChasseur["statut"], string> = {
  en_collecte: "En collecte",
  en_negociation: "En négociation",
  offre_recue: "Offre envoyée",
  commande: "Commandé",
  abandonne: "Abandonné",
};

/** Le prix affiché à l'artisan, commission intégrée (même calcul que le domaine : 4 décimales sous 1 €, sinon 2). */
export function prixAvecCommission(prix: number, pct: number): number {
  const p = prix * (1 + pct / 100);
  const d = p < 1 ? 10_000 : 100;
  return Math.round(p * d) / d;
}

export const prixFr = (n: number) => `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: n < 1 ? 4 : 2 })} €`;

/** Un exemple cliquable de l'onglet Regroupements : la phrase montrée, et ce qu'elle préremplit dans « Déclarer un besoin ». */
export interface ExempleBesoin {
  phrase: string;
  designation: string;
  quantite: number;
  unite: string;
  /** Le jour voulu : [mois (1-12), jour]. */
  pour: readonly [number, number];
}

/**
 * LES EXEMPLES SELON LE MÉTIER (Greg, 26 octobre 2026, mot pour mot pour le couvreur : « 4 palettes d'ardoise 32×22 pour le
 * 15 novembre », « 300 ml de liteaux 27×38 pour fin novembre »). Chaque désignation est une référence stricte qui se
 * regroupe (format, épaisseur) ; un métier sans exemple à lui prend ceux du couvreur, le premier métier ouvert.
 */
const EXEMPLES_COUVREUR: readonly ExempleBesoin[] = [
  { phrase: "4 palettes d'ardoise 32×22 pour le 15 novembre", designation: "Ardoise naturelle 32×22", quantite: 4, unite: "palettes", pour: [11, 15] },
  { phrase: "300 ml de liteaux 27×38 pour fin novembre", designation: "Liteaux 27×38", quantite: 300, unite: "m", pour: [11, 30] },
];
const EXEMPLES: Record<string, readonly ExempleBesoin[]> = {
  roofing: EXEMPLES_COUVREUR,
  carpentry: [
    { phrase: "60 chevrons 63×75 pour le 20 novembre", designation: "Chevrons 63×75", quantite: 60, unite: "pièces", pour: [11, 20] },
    { phrase: "40 plaques d'OSB 18 mm 2500×675 pour fin novembre", designation: "OSB 18 mm 2500×675", quantite: 40, unite: "pièces", pour: [11, 30] },
  ],
  // Plan peintres, point 2 ter (Greg, 26 octobre 2026), mot pour mot.
  painting: [
    { phrase: "20 pots de blanc mat 15 L pour le 15 novembre", designation: "Peinture blanc mat 15 L", quantite: 20, unite: "pots", pour: [11, 15] },
    { phrase: "10 pots de sous-couche 15 L pour fin novembre", designation: "Sous-couche 15 L", quantite: 10, unite: "pots", pour: [11, 30] },
  ],
  drywall: [
    { phrase: "120 m² de laine de verre 200 mm pour le 20 novembre", designation: "Laine de verre 200 mm", quantite: 120, unite: "m²", pour: [11, 20] },
    { phrase: "80 m² de laine de roche 100 mm pour fin novembre", designation: "Laine de roche 100 mm", quantite: 80, unite: "m²", pour: [11, 30] },
  ],
};

export function exemplesDuMetier(metiers: readonly string[] | undefined): readonly ExempleBesoin[] {
  for (const m of metiers ?? []) if (EXEMPLES[m]) return EXEMPLES[m];
  return EXEMPLES_COUVREUR;
}

/** Le prochain [mois, jour] à venir, en AAAA-MM-JJ (l'an prochain s'il est passé). */
export function prochainJour([mois, jour]: readonly [number, number], maintenant = new Date()): string {
  const an = maintenant.getFullYear();
  const cible = new Date(an, mois - 1, jour);
  const aujourdhui = new Date(an, maintenant.getMonth(), maintenant.getDate());
  const annee = cible < aujourdhui ? an + 1 : an;
  return `${annee}-${String(mois).padStart(2, "0")}-${String(jour).padStart(2, "0")}`;
}
