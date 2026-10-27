/**
 * L'ACHAT GROUPÉ PAR MÉTIER (Greg, 27 octobre 2026, 2e message : « ce message fait foi ») : les contrats de l'API pour les
 * cartes, le détail et les résultats, l'engagement, « Préviens ton négoce », la page du négoce et l'admin.
 */

export type NegoceChoisi = { supplierId: string; nom: string } | { negoceId: string; nom: string } | { nom: string; email: string; telephone?: string | null };

export interface Jauge {
  pourcent: 0 | 25 | 50 | 75 | 100;
  atteint: boolean;
  phrase: string | null;
}

export type EtatAchat = "seul" | "regroupe" | "regroupe_total" | "consultation" | "validation" | "offre" | "pas_assez" | "commande" | "desiste" | "sorti" | "non_commande" | "retire";

export interface LigneAchat {
  id: string;
  cle: string;
  libelle: string;
  quantite: number;
  unite: string;
}

export interface CarteAchat {
  id: string;
  achatId: string;
  titreAchat: string;
  metier: string;
  lignes: LigneAchat[];
  etat: EtatAchat;
  titre: string;
  dateCle: string | null;
  sousTitre: string | null;
  jauge: Jauge | null;
  commune: string;
  dateBesoin: string;
  clotureLe: string | null;
  reponseAvantLe: string | null;
  commandeAvantLe: string | null;
  offert: boolean;
  actions: { modifier: boolean; retirer: boolean; sortir: boolean; planB: boolean; commander: boolean; livre: boolean };
  motifsSortie: { valeur: string; libelle: string }[];
  negoces: { id: string; nom: string; telephone: string | null; prevenu: boolean; parti: boolean }[];
  bonNumero: number | null;
  commandeRecue: boolean;
  livre: boolean;
  probleme: string | null;
}

export interface OffrePourMoi {
  consultationId: string;
  nom: string;
  totalHt: number;
  complete: boolean;
  manquantes: string | null;
  habituel: boolean;
  lignes: { libelle: string; quantite: number; unite: string; prixHt: number | null }[];
  ouvertureCompte: string | null;
  telephone: string | null;
}

export interface ResultatAchat {
  phrase: string | null;
  meilleure: OffrePourMoi | null;
  monNegoce: OffrePourMoi | null;
  offres: OffrePourMoi[];
  commandeChez: string | null;
  coordonneesTransmises: string | null;
}

export interface DetailAchat extends CarteAchat {
  frise: { etapes: string[]; courante: number };
  invite: string;
  resultat: ResultatAchat | null;
}

export interface Droit {
  ok: boolean;
  offert: boolean;
  phrase: string | null;
}

export interface EngagementTexte {
  phrase: string;
  regles: string[];
}

export interface MesAchats {
  mode: "automatique" | "humain" | "mois";
  achats: CarteAchat[];
  alertes: "toutes" | "resume" | "aucune";
  exclusion: string | null;
  droit: Droit;
  engagement: EngagementTexte;
}

export interface AchatOuvert {
  id: string;
  titre: string;
  metier: string;
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
  titre: string;
  ajoute: boolean;
  rejoint: boolean;
  offert: boolean;
  phrase: string | null;
  prevenir: Prevenir;
}

export interface NegocesProposes {
  habituels: { supplierId: string; nom: string; telephone: string | null }[];
  inscrits: { negoceId: string; nom: string; departement: string }[];
}

export interface PageNegoceAchat {
  deLaPartDe: string;
  negoce: string;
  titre: string;
  lignes: { cle: string; libelle: string; quantite: number; unite: string }[];
  livraisons: { commune: string; dateBesoin: string }[];
  reponseAvantLe: string;
  close: boolean;
  conditions: string[];
  choixOuverture: { pieces: { valeur: string; libelle: string }[]; paiements: { valeur: string; libelle: string }[] };
  conditionsOuverture: { pieces: string[]; paiement: string | null; autre: string | null } | null;
  reponse: { le: string; prix: Record<string, number | null>; pdf: string | null } | null;
}

/** Un bouton de l'arbre de choix du catalogue ; au bout, la référence. */
export interface NoeudCatalogue {
  libelle: string;
  enfants: NoeudCatalogue[];
  reference: { designation: string; unite: string } | null;
}

/** Le catalogue : la recherche par mots, et l'arbre de choix par métier (les métiers de l'artisan d'abord). */
export interface Catalogue {
  references: { designation: string; unite: string }[];
  familles: { famille: string; libelle: string; mienne: boolean }[];
  arbre: Record<string, NoeudCatalogue[]>;
}

export interface LignesListe {
  adresse: string | null;
  lignes: { key: string; designation: string; quantite: number; unite: string; reference: string | null; famille: string | null; question: string | null; suggeree: boolean }[];
  suggestion: { phrase: string; keys: string[] } | null;
  droit: Droit;
  engagement: EngagementTexte;
  achatsOuverts: { id: string; titre: string; clotureLe: string; dateBesoin: string | null }[];
}

export interface AdminAchats {
  correctionsParSource: { source: "devis" | "photo"; lignes: number; corrigees: number; taux: number | null }[];
  achats: {
    id: string;
    numero: number;
    titre: string;
    departement: string;
    statut: string;
    clotureLe: string | null;
    reponseAvantLe: string | null;
    commandeAvantLe: string | null;
    entreprises: number;
    references: number;
    estimeHt: number | null;
    reponses: string;
    suivi: { vus: number; abonnes: number; commandes: number; sortis: number; participants: number } | null;
  }[];
  aValider: { id: string; numero: number; titre: string; reponses: string }[];
  sansReponse: { id: string; numero: number; titre: string; departement: string; negoces: { nom: string; email: string; telephone: string | null }[] }[];
  desistements: { id: string; le: string; entreprise: string; achat: string; apresCloture: boolean; motif: string | null }[];
  exclus: { companyId: string; entreprise: string; jusquau: string }[];
  suspects: { companyId: string; entreprise: string; siret: string | null; naf: string | null; participations: number; commandes: number }[];
  iaSuivie: { publies: number; sansCorrection: number; part: number | null };
  factures: { id: string; mois: string; negoceEmail: string; negoceNom: string; totalHt: number; commissionHt: number; envoyeeLe: string | null }[];
  volumesMin: Record<string, number>;
  envoiFacturesActif: boolean;
  commissionPct: number;
}

export interface AdminAchat {
  id: string;
  numero: number;
  titre: string;
  statut: string;
  consultes: number;
  reponses: string;
  panier: { cle: string; libelle: string; quantite: number; unite: string }[];
  proposeeId: string | null;
  iaId: string | null;
  corrections: number;
  offres: {
    consultationId: string;
    nom: string;
    email: string;
    telephone: string | null;
    repondu: boolean;
    statut: string;
    ecartee: boolean;
    alertes: string[];
    pdf: string | null;
    totalHt: number | null;
    manquantes: string[];
    lignes: { cle: string; libelle: string; quantite: number; unite: string; prixHt: number | null; corrige: boolean }[];
    ouvertureCompte: string | null;
    commentaire: string | null;
  }[];
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
