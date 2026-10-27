/**
 * L'ACHAT GROUPÉ AUTOMATIQUE (Greg, 27 octobre 2026 : « l'achat groupé devient le cœur de l'app, en automatique ») : les
 * contrats de l'API pour les cartes, le détail, l'offre, « Préviens ton négoce », la page du négoce et l'admin.
 */

export type NegoceChoisi = { supplierId: string; nom: string } | { negoceId: string; nom: string } | { nom: string; email: string; telephone?: string | null };

export interface Jauge {
  pourcent: 0 | 25 | 50 | 75 | 100;
  atteint: boolean;
  phrase: string | null;
}

export type EtatAchat = "seul" | "regroupe" | "regroupe_total" | "consultation" | "offre" | "pas_assez" | "commande" | "desiste" | "retire";

export interface CarteAchat {
  id: string;
  achatId: string;
  libelle: string;
  quantite: number;
  unite: string;
  etat: EtatAchat;
  titre: string;
  dateCle: string | null;
  sousTitre: string | null;
  jauge: Jauge | null;
  commune: string;
  dateBesoin: string;
  clotureLe: string | null;
  reponseAvantLe: string | null;
  actions: { modifier: boolean; retirer: boolean; desister: boolean; planB: boolean; commander: boolean };
  negoces: { id: string; nom: string; telephone: string | null; prevenu: boolean; parti: boolean }[];
  bonNumero: number | null;
}

export interface OffresAchat {
  mien: { nom: string; totalHt: number; consultationId: string | null; prixUnitaireHt: number | null } | null;
  meilleure: { nom: string; nomVisible: boolean; totalHt: number; prixUnitaireHt: number; consultationId: string | null } | null;
  economieHt: number | null;
  enAttente: { nom: string; raison: string }[];
}

export interface DetailAchat extends CarteAchat {
  frise: { etapes: string[]; courante: number };
  dernierPrix: string | null;
  invite: string;
  offres: OffresAchat | null;
}

export interface MesAchats {
  mode: "automatique" | "humain" | "mois";
  achats: CarteAchat[];
  alertes: "toutes" | "resume" | "aucune";
}

export interface AchatOuvert {
  id: string;
  libelle: string;
  unite: string | null;
  zone: string;
  dateBesoin: string | null;
  clotureLe: string;
  phrase: string;
  entreprises: number | null;
  jauge: Jauge | null;
}

export interface Prevenir {
  titre: string;
  texte: string;
  sms: string;
  negoces: { id: string; nom: string; telephone: string | null; tel: string | null; smsLien: string; prevenu: boolean }[];
}

export interface Lance {
  besoinId: string;
  achatId: string;
  ajoute: boolean;
  rejoint: boolean;
  prevenir: Prevenir;
}

export interface NegocesProposes {
  habituels: { supplierId: string; nom: string; telephone: string | null }[];
  inscrits: { negoceId: string; nom: string; departement: string }[];
}

export interface PageNegoceAchat {
  deLaPartDe: string;
  negoce: string;
  libelle: string;
  quantiteTotale: number;
  unite: string | null;
  livraisons: { commune: string; dateBesoin: string; quantite: number }[];
  reponseAvantLe: string;
  commandeAvantLe: string;
  close: boolean;
  commissionPct: number;
  conditions: string[];
  reponse: { le: string; prixUnitaireHt: number | null; pdf: string | null } | null;
}

export interface LignesListe {
  adresse: string | null;
  lignes: { key: string; designation: string; quantite: number; unite: string; reference: string | null; question: string | null }[];
}

export interface AdminAchats {
  achats: { id: string; numero: number; libelle: string; departement: string; statut: string; clotureLe: string | null; reponseAvantLe: string | null; entreprises: number; quantite: number; unite: string | null; estimeHt: number | null; consultations: { id: string; nom: string; email: string; telephone: string | null; statut: string; raisons: string[]; prixUnitaireHt: number | null; reponduLe: string | null; envoyeLe: string | null; pdfNom: string | null }[] }[];
  sansReponse: { id: string; numero: number; libelle: string; departement: string; negoces: { nom: string; email: string; telephone: string | null }[] }[];
  douteuses: { achatId: string; numero: number; libelle: string; consultationId: string; nom: string; prixUnitaireHt: number | null; raisons: string[]; pdf: string | null }[];
  desistements: { id: string; le: string; entreprise: string; achat: string; quantite: number; apresCloture: boolean; raison: string | null }[];
  suspects: { companyId: string; entreprise: string; siret: string | null; naf: string | null; participations: number; commandes: number }[];
  factures: { id: string; mois: string; negoceEmail: string; negoceNom: string; totalHt: number; commissionHt: number; envoyeeLe: string | null }[];
  volumesMin: Record<string, number>;
  envoiFacturesActif: boolean;
}

const jourFr = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" });
export const dateFr = (iso: string | null | undefined) => (iso ? jourFr.format(new Date(iso)) : "");
export const eurosHt = (n: number) => `${new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n).replace(/ /g, " ")} € HT`;
export const quantite = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 }).format(n).replace(/ /g, " ");

/** Le corps d'un négoce pour l'API (sans le nom affiché quand il est déjà connu). */
export function negocePourApi(n: NegoceChoisi): Record<string, string | null> {
  if ("supplierId" in n) return { supplierId: n.supplierId };
  if ("negoceId" in n) return { negoceId: n.negoceId };
  return { nom: n.nom, email: n.email, telephone: n.telephone ?? null };
}
