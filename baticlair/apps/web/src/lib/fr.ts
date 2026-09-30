/**
 * Textes d'interface partagés (français). Les textes propres à un seul
 * écran restent dans cet écran ; tout ce qui se répète (navigation,
 * statuts, erreurs, boutons) vit ici. Voir docs/ux-audit-2026-09-28.md
 * pour le lexique.
 */
export const fr = {
  nav: { home: "Accueil", projects: "Chantiers", add: "Ajouter", suppliers: "Fournisseurs", account: "Compte" },
  status: { active: "En cours", archived: "Terminé" },
  actions: {
    retry: "Réessayer",
    save: "Enregistrer",
    cancel: "Annuler",
    back: "Retour",
    saving: "Enregistrement…",
    loadMore: "Afficher plus",
  },
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
  ai_unavailable: "La lecture par l'IA n'est pas encore activée sur ce compte.",
  analysis_failed: "L'IA n'a pas réussi à lire ce devis. Rien n'a été décompté de votre formule ; réessayez dans un instant.",
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
  read_failed: "La lecture automatique a échoué de notre côté, pas à cause de votre PDF. Le fichier est bien enregistré : l'IA peut le lire directement.",
};

/** Motifs précis renvoyés par l'API, quel que soit le code. */
const reasonMessages: Record<string, string> = {
  email_taken: "Ce fournisseur est déjà dans votre carnet (même adresse e-mail).",
  takeoff_not_validated: "Validez d'abord la liste de matériaux.",
  lines_to_check: "Des lignes sont encore à vérifier : pour chacune, « C'est bon » ou « Corriger ».",
  blocking_issues: "Des lignes n'ont pas de quantité : indiquez-la ou retirez la ligne.",
  no_material: "La liste ne contient aucun matériau à demander.",
  no_supplier: "Choisissez au moins un fournisseur.",
  supplier_archived: "Un des fournisseurs choisis est archivé.",
  quote_received: "Son devis est déjà reçu. Supprimez-le d'abord pour en mettre un autre.",
  supplier_in_use: "Ce fournisseur a déjà reçu une demande de prix : archivez-le plutôt, il restera visible dans vos chantiers.",
  no_quote: "Déposez d'abord le devis PDF de ce fournisseur.",
  unknown_request_line: "Cette ligne n'existe pas dans la liste demandée.",
  quote_already_attached: "Ce PDF est déjà rangé chez un autre fournisseur de ce chantier.",
};

/** « 2805.3 » → « 2 805,30 € ». */
export function euros(amount: string | null | undefined): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(Number(amount));
}

export function errorMessage(code: string, reason?: string): string {
  if (code === "unreadable_document" && reason && unreadableReasons[reason]) return unreadableReasons[reason];
  if (reason && reasonMessages[reason]) return reasonMessages[reason];
  return errorMessages[code] ?? errorMessages.internal_error!;
}

export function unreadableMessage(reason: string | null | undefined): string {
  return (reason && unreadableReasons[reason]) ?? unreadableReasons.corrupted!;
}
