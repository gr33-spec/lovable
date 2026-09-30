/**
 * Textes d'interface partagés (français). Les textes propres à un seul
 * écran restent dans cet écran ; tout ce qui se répète (navigation,
 * statuts, erreurs, boutons) vit ici. Voir docs/ux-audit-2026-09-28.md
 * pour le lexique.
 */
export const fr = {
  nav: { home: "Accueil", projects: "Chantiers", add: "Ajouter", suppliers: "Fournisseurs", invoices: "Factures" },
  status: { active: "En cours", archived: "Terminé" },
  actions: {
    retry: "Réessayer",
    save: "Enregistrer",
    cancel: "Annuler",
    back: "Retour",
    saving: "Enregistrement…",
    loadMore: "Afficher plus",
  },
  soon: "Bientôt",
} as const;

/** Messages d'erreur par code (API métier et authentification). */
const errorMessages: Record<string, string> = {
  network: "Pas de connexion internet. Rien n'est perdu : réessayez dès que le réseau revient.",
  unauthenticated: "Votre session a expiré. Reconnectez-vous.",
  forbidden: "Vous n'avez pas le droit de faire cette modification.",
  not_found: "Introuvable. Il a peut-être été supprimé, ou le lien est incomplet.",
  validation_failed: "Un champ n'est pas correctement rempli.",
  conflict: "Cette action a déjà été faite.",
  request_in_progress: "C'est en cours d'enregistrement, patientez une seconde.",
  payload_too_large: "C'est trop volumineux pour être envoyé.",
  unreadable_document: "Ce fichier ne peut pas être lu.",
  analysis_quota_reached: "Vous avez utilisé toutes les analyses de votre formule ce mois-ci. Les documents déjà analysés restent consultables.",
  onboarding_required: "Indiquez d'abord le nom de votre entreprise.",
  company_selection_required: "Choisissez l'entreprise avec laquelle travailler.",
  internal_error: "Un problème est survenu de notre côté. Vos données sont conservées ; réessayez dans un instant.",
  INVALID_EMAIL_OR_PASSWORD: "E-mail ou mot de passe incorrect.",
  INVALID_EMAIL: "Cette adresse e-mail n'est pas valide.",
  PASSWORD_TOO_SHORT: "Le mot de passe doit faire au moins 10 caractères.",
  PASSWORD_TOO_LONG: "Le mot de passe est trop long.",
  USER_ALREADY_EXISTS: "Un compte existe déjà avec cette adresse. Connectez-vous.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Un compte existe déjà avec cette adresse. Connectez-vous.",
  INVALID_TOKEN: "Ce lien n'est plus valable. Demandez-en un nouveau.",
  TOKEN_EXPIRED: "Ce lien a expiré. Demandez-en un nouveau.",
  EMAIL_ALREADY_VERIFIED: "Votre adresse e-mail est déjà confirmée.",
};

/** Motifs précis d'un document refusé. */
const unreadableReasons: Record<string, string> = {
  not_pdf: "Ce fichier n'est pas un PDF. Enregistrez le devis en PDF depuis votre logiciel, puis réessayez.",
  empty: "Ce fichier est vide.",
  encrypted: "Ce PDF est protégé par un mot de passe. Enregistrez-le sans protection, puis réessayez.",
  corrupted: "Ce PDF est abîmé et ne peut pas être lu.",
  too_many_pages: "Ce document a trop de pages. Envoyez seulement le devis.",
  read_failed: "Lecture impossible pour l'instant : c'est un problème de notre côté, pas de votre PDF. Le fichier est bien enregistré.",
};

export function errorMessage(code: string, reason?: string): string {
  if (code === "unreadable_document" && reason && unreadableReasons[reason]) return unreadableReasons[reason];
  return errorMessages[code] ?? errorMessages.internal_error!;
}

export function unreadableMessage(reason: string | null | undefined): string {
  return (reason && unreadableReasons[reason]) ?? unreadableReasons.corrupted!;
}
