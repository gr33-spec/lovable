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
  regroupement: { id: string; statut: StatutRegroupement; libelle: string; participants: string; departement: string } | null;
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
  volume: number;
  unite: string;
  entreprises: number;
  participants: { besoinId: string; entreprise: string; quantite: number; statut: string; livraison: string }[];
  acceptes: number;
  negoces: { nom: string; email: string; telephone: string | null; verification: string | null }[];
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
