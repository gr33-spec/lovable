/** Ce que l'API rend à l'espace négoce (`/v1/negoce/*`). Vouvoiement partout côté négoce. */
export interface Paliers {
  gratuiteJusquaKm: number;
  paliers: { jusquaKm: number; prixHt: number }[];
  maxKm: number;
}

export interface Invitation {
  email: string;
  siret: string | null;
  enseigne: string;
  inscrit: boolean;
  departements: string[];
  paliersDefaut: Paliers;
  conditionsVersion: string;
}

export interface CompteNegoce {
  email: string;
  siret: string | null;
  enseigne: string;
  telephone: string | null;
  depots: { id: string; adresse: string; geocode: boolean }[];
  livraison: Paliers;
  departements: string[];
  prochaine: { mois: string; de: string; clotureLe: string; clotureDans: string } | null;
  grilles: { mois: string; de: string; departement: string; reponseAvant: string; reponseDans: string; deposee: boolean; lien: string }[];
  commandes: { type: "cycle" | "garantie"; mois: string; de: string; artisan: string; totalHt: number; le: string }[];
  conditionsVersion: string | null;
}

export const euros = (n: number) => `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`.replace(/ /g, " ");
export const dateFr = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });

/** « 22 », « 2A », « 974 » : un département bien formé. */
export const departementValide = (d: string) => /^(\d{2}|2A|2B|97\d|98\d)$/.test(d.trim());
