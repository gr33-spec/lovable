/**
 * RECENTRAGE (Greg, 25 octobre 2026) : les contrats de l'API pour les droits (gratuit ou payant), la demande perso
 * (envoi, chiffrage en ligne, comparaison, commande), « Mes prix » et les regroupements.
 */

export interface Droits {
  formule: "payant" | "gratuit";
  raison: "abonne" | "essai" | "zone_offerte" | null;
  lecturesParMois: number | null;
  negocesParDemande: number;
  regroupements: boolean;
  historiqueMois: number | null;
  zone: string | null;
  zoneActive: boolean;
  preavis: string | null;
  lecturesCeMois: number;
}

export interface NegocesProposes {
  zone: string | null;
  max: number;
  formule: "payant" | "gratuit";
  accord: string;
  habituels: { supplierId: string; nom: string; email: string }[];
  zoneNegoces: { negoceId: string; nom: string; generaliste: boolean; familles: string[] }[];
}

export interface OffrePerso {
  recipientId: string;
  nom: string;
  totalLignesHt: number;
  livraisonHt: number;
  totalLivreHt: number;
  lignesChiffrees: number;
  lignesManquantes: string[];
  complete: boolean;
  delaiJours: number | null;
  valideJusquau: string;
  valide: boolean;
  ecartHt: number | null;
}

export interface DemandePerso {
  id: string;
  chantier: string;
  but: "chiffrer" | "commander" | null;
  dateBesoin: string | null;
  closLe: string | null;
  close: boolean;
  lignes: { cle: string; designation: string; quantite: number; unite: string; repere: string | null }[];
  destinataires: { id: string; nom: string; statut: "a_envoyer" | "envoye" | "relance" | "repondu" | "refuse"; suivi: string | null }[];
  offres: OffrePerso[];
  commande: { recipientId: string; nom: string; suivi: "recue" | "confirmee" | "livree" | null; commandeLe: string } | null;
}

export interface PageChiffrage {
  artisan: string;
  negoce: string;
  but: "chiffrer" | "commander";
  dateBesoin: string | null;
  ville: string | null;
  close: boolean;
  lignes: { cle: string; designation: string; quantite: number; unite: string }[];
  validiteMin: number;
  etat: "a_chiffrer" | "repondu" | "refuse" | "commande";
  reponse: { prix: Record<string, number>; livraisonHt: number; delaiJours: number | null; validiteJours: number | null; valideJusquau: string } | null;
  commande: { le: string; suivi: string | null } | null;
}

export interface MesPrix {
  formule: "payant" | "gratuit";
  depuis: string | null;
  articles: { cle: string; designation: string; unite: string; dernier: { prixHt: number; negoce: string; date: string; source: "recu" | "paye" }; meilleur: { prixHt: number; negoce: string; date: string }; nombre: number; repere: string }[];
}

export interface Regroupement {
  id: string;
  famille: string;
  titre: string;
  departement: string;
  cycle: string;
  phase: "inscriptions" | "negoces" | "resultats";
  nonConsulte: boolean;
  clotureLe: string;
  clotureDans: string | null;
  participants: string;
  participantsDetail: string | null;
  materiaux: { cle: string; libelle: string; unite: string }[];
  jeSuisDedans: boolean;
  maParticipation: "intention" | "quantite_confirmee" | "commande" | "bascule" | "retire" | null;
}

export interface DetailRegroupement extends Regroupement {
  mesLignes: { id: string; designation: string; quantite: number; unite: string; chantier: string; statut: string; libelle: string }[];
}

export interface ListeRegroupements {
  zone: string | null;
  zoneActive: boolean;
  message: string | null;
  regroupements: Regroupement[];
}

export interface LignesGroupables {
  zone: string | null;
  zoneActive: boolean;
  message: string | null;
  cycles: { cle: string; de: string; clotureLe: string }[];
  lignes: { key: string; designation: string; quantite: number; unite: string; groupable: boolean; reference: string | null; famille: string; estimeHt: number | null; raison: string | null }[];
}

export const euros = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n).replace(/ | /g, " ");
export const jourFr = (iso: string) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" }).format(new Date(iso));
