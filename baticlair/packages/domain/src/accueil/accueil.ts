/**
 * L'ACCUEIL (Greg, 1er novembre 2026, maquette « Bonjour Greg ») : trois sections, dans cet ordre, « À faire maintenant »
 * (UNE action, la plus pressante), « Commencer » (créer une liste, rejoindre un achat groupé), « Suivi en cours » (deux
 * dossiers au plus). Ce module ne fait que trier et nommer ce que l'API dit déjà : aucune donnée inventée.
 */

/** Les états d'une participation à un achat groupé (`etatCarte`). */
export type EtatParticipation = "seul" | "regroupe" | "regroupe_total" | "consultation" | "validation" | "offre" | "pas_assez" | "commande" | "desiste" | "sorti" | "non_commande" | "retire";

export interface StatutSuivi {
  libelle: string;
  /** jaune : à suivre de près ; vert : un état positif réel (offres reçues, terminée) ; neutre : rien à faire. */
  ton: "jaune" | "vert" | "neutre";
}

/**
 * Le statut d'un achat groupé en mots explicites (Greg : « Ne plus afficher « Seul jusqu'au… » ») ; null quand la
 * participation n'est plus active (retirée, désistée, sortie, commande pas passée).
 */
export function statutAchatGroupe(etat: EtatParticipation): StatutSuivi | null {
  switch (etat) {
    case "seul":
    case "regroupe":
    case "regroupe_total":
      return { libelle: "Inscriptions ouvertes", ton: "jaune" };
    case "consultation":
      return { libelle: "Consultation des négoces", ton: "neutre" };
    case "validation":
      return { libelle: "Offres reçues", ton: "vert" };
    case "offre":
      return { libelle: "Choix à confirmer", ton: "jaune" };
    case "pas_assez":
      return { libelle: "Pas assez de volume", ton: "neutre" };
    case "commande":
      return { libelle: "Terminée", ton: "vert" };
    default:
      return null;
  }
}

/** Une demande de prix individuelle, telle que la résume l'API (`resume.demande`). */
export interface ResumeDemande {
  negoces: number;
  reponses: number;
  choisi: boolean;
}

export function statutDemande(d: ResumeDemande): StatutSuivi {
  if (d.choisi) return { libelle: "Terminée", ton: "vert" };
  if (d.reponses > 0) return { libelle: d.reponses > 1 ? `${d.reponses} réponses reçues` : "1 réponse reçue", ton: "vert" };
  return { libelle: "Consultation des négoces", ton: "neutre" };
}

/** Ce que l'accueil peut proposer de reprendre. */
export interface ActionCandidate {
  cle: string;
  sorte: "brouillon-demande" | "brouillon-achat" | "brouillon-liste" | "achat-offre" | "achat-pas-assez" | "demande-reponses" | "liste-a-verifier" | "demande-a-envoyer" | "rapprochement";
  /** Une réponse est attendue de l'artisan (offre à choisir, réponses à lire). */
  immediate: boolean;
  /** L'échéance (ISO), quand il y en a une. */
  echeance: string | null;
  /** La dernière modification (ISO). */
  modifieLe: string | null;
}

const temps = (iso: string | null) => (iso ? Date.parse(iso) : Number.NaN);

/**
 * LA RÈGLE DE PRIORITÉ (stable, documentée dans `docs/accueil-et-mes-listes.md`) :
 * 1. ce qui attend une réponse de l'artisan (une offre à choisir, des réponses de négoces) ;
 * 2. puis l'échéance la plus proche (sans échéance : après) ;
 * 3. puis le parcours modifié le plus récemment ;
 * 4. à égalité, la clé (ordre fixe d'un affichage à l'autre).
 */
export function comparerActions(a: ActionCandidate, b: ActionCandidate): number {
  if (a.immediate !== b.immediate) return a.immediate ? -1 : 1;
  const ea = temps(a.echeance);
  const eb = temps(b.echeance);
  if (Number.isFinite(ea) || Number.isFinite(eb)) {
    if (!Number.isFinite(eb)) return -1;
    if (!Number.isFinite(ea)) return 1;
    if (ea !== eb) return ea - eb;
  }
  const ma = temps(a.modifieLe);
  const mb = temps(b.modifieLe);
  if (Number.isFinite(ma) || Number.isFinite(mb)) {
    if (!Number.isFinite(mb)) return -1;
    if (!Number.isFinite(ma)) return 1;
    if (ma !== mb) return mb - ma;
  }
  return a.cle < b.cle ? -1 : a.cle > b.cle ? 1 : 0;
}

export function actionPrioritaire<T extends ActionCandidate>(candidats: readonly T[]): { premiere: T | null; autres: T[] } {
  const tri = [...candidats].sort(comparerActions);
  return { premiere: tri[0] ?? null, autres: tri.slice(1) };
}

/** « Voir 1 autre brouillon », « Voir 3 autres brouillons » ; « … action(s) » quand ce ne sont pas tous des brouillons. */
export function lienAutres(autres: readonly ActionCandidate[]): string | null {
  const n = autres.length;
  if (n === 0) return null;
  const brouillons = autres.every((a) => a.sorte.startsWith("brouillon-"));
  const mot = brouillons ? (n > 1 ? "autres brouillons" : "autre brouillon") : n > 1 ? "autres actions" : "autre action";
  return `Voir ${n} ${mot}`;
}
