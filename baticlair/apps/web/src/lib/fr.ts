/**
 * Textes d'interface partagés (français). Les textes propres à un seul
 * écran restent dans cet écran ; tout ce qui se répète (navigation,
 * statuts, erreurs, boutons) vit ici. Voir docs/ux-audit-2026-09-28.md
 * pour le lexique.
 */
export const fr = {
  nav: { home: "Accueil", projects: "Chantiers", suppliers: "Fournisseurs", account: "Compte" },
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
  network: "Pas de connexion internet. Rien n'est perdu : réessaie dès que le réseau revient.",
  unauthenticated: "Ta session a expiré. Reconnecte-toi.",
  forbidden: "Tu n'as pas le droit de faire cette modification.",
  not_found: "Introuvable. Il a peut-être été supprimé, ou le lien est incomplet.",
  validation_failed: "Un champ n'est pas correctement rempli.",
  conflict: "Cette action a déjà été faite.",
  request_in_progress: "C'est en cours d'enregistrement, patiente une seconde.",
  payload_too_large: "C'est trop volumineux pour être envoyé.",
  unreadable_document: "Ce fichier ne peut pas être lu.",
  no_referential: "BatiClair ne calcule pas encore les matériaux de ce métier. Aujourd'hui : couverture et plâtrerie (cloisons).",
  analysis_quota_reached: "Tu as atteint la limite de ta formule ce mois-ci. Tes chantiers en cours restent consultables.",
  ai_unavailable: "Cette fonction n'est pas encore activée sur ton compte.",
  analysis_failed: "Ce devis n'a pas pu être lu. Réessaie dans un instant.",
  plan_limit_reached: "Tu as atteint le nombre de chantiers de ta formule.",
  onboarding_required: "Indique d'abord le nom de ton entreprise.",
  company_selection_required: "Choisis l'entreprise avec laquelle travailler.",
  too_many_requests: "Trop d'essais en peu de temps. Attends quelques minutes, puis réessaie.",
  internal_error: "Un problème est survenu de notre côté. Tes données sont conservées ; réessaie dans un instant.",
  INVALID_EMAIL_OR_PASSWORD: "E-mail ou mot de passe incorrect.",
  INVALID_EMAIL: "Cette adresse e-mail n'est pas valide.",
  PASSWORD_TOO_SHORT: "Le mot de passe doit faire au moins 10 caractères.",
  PASSWORD_TOO_LONG: "Le mot de passe est trop long.",
  USER_ALREADY_EXISTS: "Un compte existe déjà avec cette adresse. Connecte-toi.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Un compte existe déjà avec cette adresse. Connecte-toi.",
  INVALID_TOKEN: "Ce lien n'est plus valable. Demandes-en un nouveau.",
  TOKEN_EXPIRED: "Ce lien a expiré. Demandes-en un nouveau.",
  EMAIL_ALREADY_VERIFIED: "Ton adresse e-mail est déjà confirmée.",
};

/** Motifs précis d'un document refusé. */
const unreadableReasons: Record<string, string> = {
  not_pdf: "Ce fichier n'est pas un PDF. Enregistre le devis en PDF depuis ton logiciel, puis réessaie.",
  empty: "Ce fichier est vide.",
  encrypted: "Ce PDF est protégé par un mot de passe. Enregistre-le sans protection, puis réessaie.",
  corrupted: "Ce PDF est abîmé et ne peut pas être lu.",
  too_many_pages: "Ce document a trop de pages. Envoie seulement le devis.",
  abnormal_size:
    "Ce document est bien plus long qu'un devis habituel. Vérifie qu'il ne contient que le devis (sans catalogue ni annexes), puis réessaie.",
  read_failed: "Le devis est bien enregistré.",
  photo_unreadable: "Cette photo ne peut pas être lue. Réessaie avec une photo en JPEG ou en PNG.",
};

/** Motifs précis renvoyés par l'API, quel que soit le code. */
const reasonMessages: Record<string, string> = {
  // Lecture IA d'un devis échouée (analysis_failed) : le motif, en clair, pour savoir quoi faire.
  provider_error: "Le service de lecture a refusé la demande. Réessaie dans un instant ; si ça recommence, envoie-nous le code support.",
  invalid_output: "La lecture a rendu une réponse incomplète. Réessaie ; si ça recommence, envoie-nous le code support.",
  timeout: "La lecture a pris trop de temps. Réessaie dans un instant.",
  refused: "Le service de lecture a refusé ce document. Envoie-nous le code support.",
  email_taken: "Ce fournisseur est déjà dans ton carnet (même adresse e-mail).",
  takeoff_not_validated: "Valide d'abord la liste de matériaux.",
  lines_to_check: "Des lignes sont encore à vérifier : pour chacune, « C'est bon » ou « Corriger ».",
  blocking_issues: "Des lignes n'ont pas de quantité : indique-la ou retire la ligne.",
  no_material: "La liste ne contient aucun matériau à demander.",
  no_supplier: "Choisis au moins un fournisseur.",
  supplier_archived: "Un des fournisseurs choisis est archivé.",
  quote_received: "Son devis est déjà reçu. Supprime-le d'abord pour en mettre un autre.",
  supplier_in_use: "Ce fournisseur a déjà reçu une demande de prix : archive-le plutôt, il restera visible dans tes chantiers.",
  no_quote: "Dépose d'abord le devis de ce fournisseur.",
  one_pdf_or_photos: "Envoie soit un PDF, soit des photos du devis (une par page), pas les deux.",
  too_many_photos: "10 photos au maximum pour un devis.",
  unknown_request_line: "Cette ligne n'existe pas dans la liste demandée.",
  quote_already_attached: "Ce PDF est déjà rangé chez un autre fournisseur de ce chantier.",
  invalid_activation_code: "Ce code n'est pas valable.",
  unknown_plan: "Cette formule n'existe pas.",
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
