/**
 * CHANTIER 05, LISTE D'ATTENTE PAR MÉTIER ET DÉPARTEMENT, ET INVITATIONS (Greg, 28 novembre 2026 ; cahier
 * `docs/cahiers-chatgpt/05_Admin_Stripe_parrainage.pdf`, partie 2, le message de Greg l'emporte).
 *
 * - Lancement avec les couvreurs des Côtes-d'Armor, puis la Bretagne, puis la France. Les autres métiers entrent déjà
 *   (« en rodage ») : la liste d'attente ne bloque rien, elle dit seulement à l'artisan qu'on lui écrira à l'ouverture.
 * - Un couple métier et département est OUVERT s'il est dans `OUVERTURES_DE_DEPART` ou si l'admin a prévenu ses inscrits
 *   (« Prévenir les inscrits » vaut annonce d'ouverture, après confirmation). Ouvrir ne change AUCUNE règle d'achat groupé.
 * - Rien ne part sans un choix explicite (`CONSENTEMENT_LISTE_ATTENTE`) ; un seul e-mail par inscrit et par métier ; un
 *   lien de désinscription dans chaque e-mail ; jamais une adresse d'un artisan chez un autre.
 * - Les invitations : un lien personnel que l'artisan partage lui-même (SMS, WhatsApp, e-mail). Aucune récompense, aucun
 *   point, aucun envoi à ses contacts : on note seulement qui a invité qui, pour un futur branchement (Flouzeo).
 *
 * Code pur, sans import (le site l'importe directement).
 */

/** Les métiers au pluriel, comme l'artisan se nomme (« les plaquistes du 22 »). Identifiants de `TRADES`. */
export const METIERS_AU_PLURIEL: Readonly<Record<string, string>> = {
  roofing: "couvreurs",
  masonry: "maçons",
  drywall: "plaquistes",
  painting: "peintres",
  tiling: "carreleurs",
  flooring: "soliers et parqueteurs",
  electrical: "électriciens",
  plumbing: "plombiers",
  joinery: "menuisiers",
  hvac: "chauffagistes",
  carpentry: "charpentiers",
  waterproofing: "étancheurs",
  cladding: "bardeurs",
  facade: "façadiers",
  ceiling: "poseurs de plafonds suspendus",
  interior_joinery: "agenceurs",
  kitchen: "cuisinistes",
  solar: "installateurs photovoltaïques",
  decking: "poseurs de terrasses",
  paving: "paveurs",
  earthworks: "terrassiers",
  irrigation: "installateurs d'arrosage",
  metalwork: "serruriers et métalliers",
  general: "entreprises générales",
  other: "artisans de ton métier",
};

export const metierAuPluriel = (metier: string): string => METIERS_AU_PLURIEL[metier] ?? "artisans de ton métier";

export interface Ouverture {
  metier: string;
  /** Code du département (« 22 », « 2A »). */
  departement: string;
}

/** Ouvert dès le lancement : les couvreurs des Côtes-d'Armor. Le reste s'ouvre par une annonce de l'admin. */
export const OUVERTURES_DE_DEPART: readonly Ouverture[] = [{ metier: "roofing", departement: "22" }];

export const estOuvert = (metier: string, departement: string | null, annoncees: readonly Ouverture[] = []): boolean =>
  !!departement && [...OUVERTURES_DE_DEPART, ...annoncees].some((o) => o.metier === metier && o.departement === departement);

/** La disponibilité réelle, sans date ni promesse (cahier 05, §4). */
export const PHRASE_DISPONIBILITE =
  "Mobiiz démarre avec les couvreurs des Côtes-d'Armor (22). Il s'ouvre ensuite à toute la Bretagne, puis aux autres métiers et aux autres régions.";

/** « les plaquistes du 22 ». Sans département connu : « les plaquistes de ton département ». */
export const publicDe = (metier: string, departement: string | null): string => `les ${metierAuPluriel(metier)} ${departement ? `du ${departement}` : "de ton département"}`;

/** Ce que l'artisan inscrit lit (Greg : « On t'écrit dès que Mobiiz ouvre pour les plaquistes du 22 »). */
export const phraseSurLaListe = (metier: string, departement: string | null): string => `On t'écrit dès que Mobiiz ouvre pour ${publicDe(metier, departement)}.`;

/** La question posée à celui qui n'est pas encore inscrit. */
export const questionListeAttente = (metier: string, departement: string | null): string => `Tu veux qu'on t'écrive quand Mobiiz ouvre pour ${publicDe(metier, departement)} ?`;

/**
 * LE CONSENTEMENT (RGPD, choix explicite, case jamais cochée d'office). La version est gardée avec l'inscription : un
 * texte changé change de version.
 */
export const CONSENTEMENT_LISTE_ATTENTE = {
  version: "2026-11-28",
  texte: "Je veux recevoir un e-mail de Mobiiz quand il ouvre pour mon métier dans mon département. Un seul e-mail pour cette ouverture, désinscription en un clic.",
} as const;

/** Combien d'e-mails part chaque lot d'une annonce (petits lots : le prestataire et son plafond du jour sont ménagés). */
export const LOT_ANNONCE = 20;

export interface AnnonceAEcrire {
  metier: string;
  departement: { code: string; nom: string };
  /** L'inscrit a déjà un compte Mobiiz : « connecte-toi », sinon « crée ton compte ». */
  aUnCompte: boolean;
  lienAction: string;
  lienDesinscription: string;
}

export const sujetAnnonce = (metier: string, departement: { code: string; nom: string }): string => `Mobiiz ouvre pour ${publicDe(metier, departement.code)}`;

/** L'e-mail d'ouverture : court, tutoyé, un seul lien d'action, le lien de désinscription en dernière ligne. */
export function texteAnnonce(a: AnnonceAEcrire): string {
  return [
    "Bonjour,",
    `Tu nous avais demandé de te prévenir : Mobiiz ouvre maintenant pour ${publicDe(a.metier, a.departement.code)} (${a.departement.nom}).`,
    a.aUnCompte ? `Ton compte est déjà prêt. Connecte-toi : ${a.lienAction}` : `Pour commencer, c'est ici : ${a.lienAction}`,
    "Tu reçois cet e-mail une seule fois, parce que tu t'es inscrit sur la liste d'attente de Mobiiz.",
    `Ne plus recevoir ces e-mails : ${a.lienDesinscription}`,
  ].join("\n\n");
}

/** L'encart d'invitation de l'accueil (cahier 05, §4, mot pour mot). */
export const PHRASE_INVITATION = "Tu connais d'autres artisans ? Invite-les à découvrir Mobiiz. Plus on est, moins on paie.";

/** Le message que l'artisan partage lui-même. Ni prix, ni promesse, ni date. */
export const messageInvitation = (lien: string): string =>
  `Je t'invite à découvrir Mobiiz, l'appli faite par des artisans pour les artisans : comparer ses négoces et acheter en groupe. Plus on est, moins on paie. ${lien}`;

/** Un code d'invitation : 10 caractères, minuscules et chiffres (sans 0, o, 1, l, pour se lire sans erreur). */
export const ALPHABET_INVITATION = "23456789abcdefghijkmnpqrstuvwxyz";
export const codeInvitationValide = (code: string): boolean => /^[23456789abcdefghijkmnpqrstuvwxyz]{10}$/.test(code);

/** Une invitation n'est comptée que pour une entreprise créée depuis moins d'un jour (jamais un compte ancien rattaché après coup). */
export const DELAI_SUIVI_INVITATION_MS = 24 * 60 * 60 * 1000;
