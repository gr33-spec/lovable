import { nom, NOM, NOM_APP } from "@/lib/nom";
/**
 * Textes d'interface partagés (français). Les textes propres à un seul
 * écran restent dans cet écran ; tout ce qui se répète (navigation,
 * statuts, erreurs, boutons) vit ici. Voir docs/ux-audit-2026-09-28.md
 * pour le lexique.
 */
export const fr = {
  nav: { home: "Accueil", projects: "Mes chantiers", groupe: NOM, suppliers: "Fournisseurs", account: "Compte" },
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
  no_referential: `${NOM_APP} ne calcule pas encore les matériaux de ce métier.`,
  analysis_quota_reached: "Tu as atteint la limite de ta formule ce mois-ci. Tes chantiers en cours restent consultables.",
  ai_unavailable: "Cette fonction n'est pas encore activée sur ton compte.",
  analysis_failed: "Ce devis n'a pas pu être lu. Réessaie dans un instant.",
  email_not_sent: "Le mail n'est pas parti chez le fournisseur. Rien n'est envoyé : réessaie dans un instant.",
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
  // BatiClair Groupé : les refus de l'API, dits avec les mots de l'artisan.
  quantite_plafonnee: `Cette quantité dépasse trois fois ce que les autres artisans proposent pour cette référence : la ${nom} la refuse. Vérifie-la, ou passe par ton négoce en direct.`,
  ligne_a_regler: "Règle d'abord cette ligne (quantité ou question en attente) : un engagement ferme porte sur une quantité ferme.",
  adresse_requise: "Renseigne l'adresse du chantier (avec le code postal) : le lot se forme par département.",
  ligne_vague: `Cette ligne est trop vague pour la ${nom} : précise-la (format, origine, choix, marque), ou envoie-la à ton négoce.`,
  deja_propose: `Cette ligne est déjà dans la ${nom}.`,
  engagement_requis: "Coche la phrase d'engagement pour proposer en « Chantier signé ».",
  fenetre_invalide: "La fenêtre de livraison n'est pas bonne : au plus tôt avant au plus tard, dans les 6 mois.",
  groupe_ferme: `La ${nom} n'est pas ouverte à ton entreprise pour l'instant : regarde l'onglet ${NOM}.`,
  sans_quantite: "Cette ligne n'a pas de quantité : indique-la d'abord.",
  sans_famille: `Ce métier n'a pas encore de famille dans la ${nom}.`,
  siret_invalide: "Ce SIRET n'a pas 14 chiffres valides : corrige-le dans Compte.",
  // La commande commune du mois (Greg, 22 octobre 2026).
  commande_close: "La commande est close : on ne peut plus rien retirer.",
  deja_commande: "Tu as déjà commandé pour cette commande.",
  grille_incomplete: "Ce négoce n'a pas chiffré toute ta liste : choisis-en un qui a tout chiffré.",
  pas_de_resultats: "Les prix ne sont pas encore là.",
  pas_de_liste: "Ce chantier n'a pas encore de liste.",
  rien_a_ajouter: "Aucune de ces lignes ne peut aller dans la commande : précise-les d'abord (format, choix, quantité).",
  pas_de_cycle: "Pas de commande ouverte pour l'instant.",
  delai_passe: "Le délai de réponse est passé : la commande est figée.",
  devis_requis: "Joignez votre devis en PDF.",
  deux_devis_au_plus: "Deux PDF au plus.",
  pdf_seulement: "Seulement des fichiers PDF.",
  livraison_requise: "Indiquez vos conditions de livraison (gratuite jusqu'à combien de km, et le prix au-delà).",
  // L'espace négoce (Greg, 23 octobre 2026) : prix fermes, compte inscrit, zone non livrée, grille garantie.
  prix_fermes_requis: "Cochez « Prix fermes, quel que soit le volume final » pour déposer votre devis.",
  inscription_requise: "Créez d'abord votre accès (dépôts et paliers de livraison) : le lien est sur cette page.",
  ne_livre_pas: "Ce négoce ne livre pas ta zone : choisis-en un autre.",
  pas_de_garantie: "Cette grille garantie n'est plus ouverte.",
  reglages_invalides: "Ces réglages ne vont pas : deux jours de clôture différents entre 1 et 28, heures entre 0 et 23, réponse en 1 à 40 jours ouvrés.",
  nothing_read: "Je n'ai rien lu dans ce devis. Réessaie, ou redépose le PDF.",
  empty_list: "La liste est vide : rien ne part au fournisseur.",
  faconnage_required: "Dis-moi d'abord, pour chaque pièce de zinc, si tu la façonnes ou si tu la commandes façonnée.",
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
