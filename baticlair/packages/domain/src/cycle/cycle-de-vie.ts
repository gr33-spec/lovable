/**
 * LE CYCLE DE VIE COMPLET (Greg, 6 novembre 2026, prompt maître §7, §9, §19) : une machine d'états pour chaque objet du
 * parcours, et l'état de chaque LIGNE de liste, calculé à partir des faits (demande partie, recherche, achat groupé,
 * commande). Le serveur refuse toute transition absente des tables ; une ligne n'est jamais engagée deux fois.
 *
 * Code pur, sans import interne (lisible par l'app telle quelle).
 */

/* ------------------------------------------------------------------------------------------- la demande individuelle */

export const ETATS_DEMANDE = ["brouillon", "envoyee", "reponses_recues", "commandee", "livree", "close"] as const;
export type EtatDemande = (typeof ETATS_DEMANDE)[number];

const TRANSITIONS_DEMANDE: Record<EtatDemande, readonly EtatDemande[]> = {
  brouillon: ["envoyee", "close"],
  envoyee: ["reponses_recues", "commandee", "close"],
  reponses_recues: ["commandee", "close"],
  commandee: ["livree"],
  livree: [],
  close: ["envoyee"],
};

/** L'état d'une demande individuelle, d'après ses faits. */
export function etatDemande(d: { envoyee: boolean; reponses: number; commandee: boolean; livree: boolean; close: boolean }): EtatDemande {
  if (d.livree) return "livree";
  if (d.commandee) return "commandee";
  if (d.close) return "close";
  if (d.reponses > 0) return "reponses_recues";
  return d.envoyee ? "envoyee" : "brouillon";
}

/* -------------------------------------------------------------------------- la participation à un achat groupé */

export const ETATS_PARTICIPATION = ["engagee", "en_consultation", "offre_publiee", "commandee", "livree", "retiree", "sortie", "non_commandee"] as const;
export type EtatParticipationCycle = (typeof ETATS_PARTICIPATION)[number];

const TRANSITIONS_PARTICIPATION: Record<EtatParticipationCycle, readonly EtatParticipationCycle[]> = {
  // Avant la clôture : retirer sa liste ne compte pas comme une sortie.
  engagee: ["en_consultation", "retiree"],
  // Après la clôture : sortir (motif) ; pas assez de volume : retour en demande individuelle (« sortie »).
  en_consultation: ["offre_publiee", "sortie"],
  offre_publiee: ["commandee", "sortie", "non_commandee"],
  commandee: ["livree"],
  livree: [],
  retiree: [],
  sortie: [],
  non_commandee: [],
};

/** La participation d'après le statut enregistré (`besoin_negocie.statut`) et l'état de l'achat groupé. */
export function etatParticipation(b: { statut: string; livre: boolean; achat: "ouvert" | "consultation" | "publie" | "autre" }): EtatParticipationCycle {
  if (b.statut === "accepte") return b.livre ? "livree" : "commandee";
  if (b.statut === "retire" || b.statut === "perso") return "retiree";
  if (b.statut === "sorti" || b.statut === "refuse" || b.statut === "non_merci") return "sortie";
  if (b.statut === "non_commande") return "non_commandee";
  if (b.achat === "publie") return "offre_publiee";
  if (b.achat === "consultation") return "en_consultation";
  return "engagee";
}

/** Une participation qui tient encore des lignes (elles ne peuvent pas partir ailleurs). */
export const PARTICIPATION_ACTIVE: readonly string[] = ["declare", "accepte"];

/* ------------------------------------------------------------------------------------------ la ligne d'une liste */

export const ETATS_LIGNE = ["libre", "demande_envoyee", "en_recherche", "dans_un_groupe", "commandee_seule", "commandee_en_groupe"] as const;
export type EtatLigne = (typeof ETATS_LIGNE)[number];

export const ACTIONS_LIGNE = ["envoyer_demande", "chercher", "rejoindre_groupe", "commander_seul"] as const;
export type ActionLigne = (typeof ACTIONS_LIGNE)[number];

export interface FaitsLigne {
  /** Partie dans au moins une demande individuelle. */
  demandeEnvoyee: boolean;
  /** Couverte par une offre individuelle acceptée (négoce retenu ou commande passée). */
  commandeeSeule: boolean;
  /** Une recherche de rapprochement en cours (disponible ou proposée). */
  enRecherche: boolean;
  /** La participation active qui la tient, s'il y en a une. */
  groupe: { titre: string; statut: string; avantCloture: boolean } | null;
  /**
   * ACHATS GROUPÉS V1 (V5.2, « Une ligne, un seul circuit ») : la ligne est tenue par un besoin d'achat groupé V1 actif ;
   * elle ne part alors jamais en même temps en demande individuelle (l'ancien achat groupé, lui, garde sa règle).
   */
  achatGroupeV1?: boolean;
}

/** L'état d'une ligne : une commande l'emporte sur tout, puis l'achat groupé, la recherche, la demande. */
export function etatLigne(f: FaitsLigne): EtatLigne {
  if (f.groupe?.statut === "accepte") return "commandee_en_groupe";
  if (f.commandeeSeule) return "commandee_seule";
  if (f.groupe) return "dans_un_groupe";
  if (f.enRecherche) return "en_recherche";
  return f.demandeEnvoyee ? "demande_envoyee" : "libre";
}

export const LIBELLES_ETAT_LIGNE: Readonly<Record<EtatLigne, string>> = {
  libre: "À envoyer",
  demande_envoyee: "Demande envoyée",
  en_recherche: "En recherche",
  dans_un_groupe: "Dans un achat groupé",
  commandee_seule: "Commandée seule",
  commandee_en_groupe: "Commandée en groupe",
};

export type Verdict =
  | { permis: true }
  | { permis: false; raison: string; message: string; /** Le geste explicite qui débloque, s'il existe. */ deblocage?: "retirer_du_groupe" };

/**
 * Ce que l'artisan peut faire d'une ligne. Une demande de prix reste toujours possible (comparer n'engage à rien), sauf
 * une fois commandée ; une ligne ne rejoint jamais deux achats groupés ; une commande seule d'une ligne tenue par un
 * achat groupé attend que l'artisan l'en retire lui-même (avant la clôture), jamais en silence.
 */
export function peut(f: FaitsLigne, action: ActionLigne, designation = "Cette ligne"): Verdict {
  const etat = etatLigne(f);
  const nom = `« ${designation} »`;
  if (etat === "commandee_en_groupe")
    return { permis: false, raison: "deja_commande_en_groupe", message: `${nom} est déjà commandée dans l'achat groupé « ${f.groupe!.titre} » : pas de seconde commande.` };
  if (etat === "commandee_seule") {
    if (action === "envoyer_demande") return { permis: false, raison: "deja_commande", message: `${nom} est déjà commandée : une nouvelle demande n'est pas utile.` };
    return { permis: false, raison: "deja_commande", message: `${nom} est déjà couverte par une offre que tu as acceptée : pas de double commande.` };
  }
  if (action === "envoyer_demande" && f.achatGroupeV1)
    return { permis: false, raison: "dans_un_achat_groupe", message: `${nom} est dans un achat groupé : elle ne part pas en même temps en demande individuelle. Retire d'abord ton besoin de l'achat groupé.` };
  if (action === "envoyer_demande") return { permis: true };
  if (etat === "dans_un_groupe") {
    if (action === "chercher") return { permis: false, raison: "deja_dans_un_groupe", message: `${nom} est déjà dans l'achat groupé « ${f.groupe!.titre} » : elle ne cherche pas d'autre rapprochement.` };
    if (action === "rejoindre_groupe") return { permis: false, raison: "deja_dans_un_groupe", message: `${nom} est déjà dans l'achat groupé « ${f.groupe!.titre} » : une ligne ne rejoint qu'un seul achat groupé.` };
    if (!f.groupe!.avantCloture)
      return { permis: false, raison: "groupe_clos", message: `${nom} est dans l'achat groupé « ${f.groupe!.titre} », déjà clôturé : sors d'abord de l'achat groupé (avec ton motif) avant de la commander seule.` };
    return { permis: false, raison: "dans_un_groupe", message: `${nom} est dans l'achat groupé « ${f.groupe!.titre} ». Pour la commander seule, retire-la d'abord de l'achat groupé.`, deblocage: "retirer_du_groupe" };
  }
  return { permis: true };
}

/* ------------------------------------------------------------------------------------------------ transitions */

const TABLES = { demande: TRANSITIONS_DEMANDE, participation: TRANSITIONS_PARTICIPATION } as const;

/** Une transition est permise seulement si elle est dans la table de l'objet. */
export function transitionCycle<K extends keyof typeof TABLES>(objet: K, de: string, vers: string): boolean {
  const table = TABLES[objet] as Record<string, readonly string[]>;
  return de === vers || (table[de] ?? []).includes(vers);
}

/** Les états d'où l'on ne sort plus (utile pour les écrans : plus aucun bouton). */
export function estFinal<K extends keyof typeof TABLES>(objet: K, etat: string): boolean {
  return ((TABLES[objet] as Record<string, readonly string[]>)[etat] ?? []).length === 0;
}
