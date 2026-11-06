/**
 * LE RAPPROCHEMENT CONTINU, côté écran (Greg, 6 novembre 2026) : les types des routes `/v1/projects/:id/rapprochement` et
 * `/v1/rapprochements`. Jamais le nom ni la quantité d'un autre artisan : le serveur ne les envoie pas.
 */
export type NiveauRapprochement = "exacte" | "alternative" | "incompatible";

export interface LigneAnalysee {
  key: string;
  designation: string;
  quantite: number;
  unite: string;
  reference: string | null;
  rapprochable: boolean;
  raison: string | null;
  collecte: { id: string; titre: string; clotureLe: string; dateBesoin: string | null } | null;
  recherche: { id: string; statut: string; jusquau: string; modeLivraison: "livraison" | "retrait"; rayonKm?: number; dateMax: string | null } | null;
}

export interface AnalyseRapprochement {
  phrase: string;
  resteIndividuelle: string;
  collectif: string;
  departement: string | null;
  rechercheMaxJours: number;
  /** La phrase de la case d'engagement (rejoindre une collecte depuis la carte). */
  engagement: string;
  lignes: LigneAnalysee[];
}

export interface PropositionVue {
  id: string;
  niveau: NiveauRapprochement;
  libelleNiveau: string;
  differences: string[];
  collecte: { titre: string; clotureLe: string } | null;
  zone: string;
  entreprises: string;
  total: string | null;
  reponse: "examinee" | "refusee" | null;
}

export interface LigneEnRecherche {
  id: string;
  projectId: string;
  designation: string;
  libelle: string;
  statut: "disponible" | "proposee" | "rejointe" | "retiree" | "expiree";
  jusquau: string;
  retraitMotif: string | null;
  propositions: PropositionVue[];
}

/** Les états courts, les mêmes partout (point 19). */
export const ETAT_LIGNE: Record<LigneEnRecherche["statut"], string> = {
  disponible: "En recherche",
  proposee: "Rapprochement à examiner",
  rejointe: "Dans un achat groupé",
  retiree: "Retirée",
  expiree: "Recherche terminée",
};

export const MOTIF_RETRAIT: Record<string, string> = { artisan: "retirée par toi", offre_acceptee: "une offre est acceptée pour cette ligne" };

export const jourCourt = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

/**
 * La phrase du collectif (section 17), recopiée de `PHRASE_COLLECTIF` du domaine : Turbopack ne résout pas les imports
 * internes du domaine depuis l'app. L'e2e « Découvrir » vérifie qu'elle est identique à celle que rend le serveur.
 */
export const PHRASE_COLLECTIF = "Un achat groupé fonctionne si chacun joue sa part : un besoin réel, des informations fiables et une réponse dans les délais. MOBIIZ organise le reste.";
