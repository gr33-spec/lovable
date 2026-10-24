/**
 * LA MARQUE (décision de Greg, 24 octobre 2026 : « Mobiiz »). UNE SEULE CONSTANTE pour le nom de l'application, lue par
 * l'API (e-mails, PDF, notifications) et par le site (`apps/web/src/lib/nom.ts` la réexporte) : landing, app, espace
 * négoce, PWA, SEO, partages, démo. Changer le nom = changer cette ligne. Les dépôts, dossiers, projets Vercel et la base
 * gardent leur ancien nom (DETTE).
 */
export const NOM_APP = "Mobiiz";
/** L'accroche et le slogan. */
export const ACCROCHE_APP = "Par un artisan, pour les artisans.";
export const SLOGAN_APP = "L'union fait la force.";
/** La société qui édite le service (mentions, factures, e-mails). */
export const EDITEUR_APP = "BATI INVEST";
/** L'émetteur des factures d'abonnement (les mentions légales du site) ; les variables FACTURE_EMETTEUR_* le remplacent. */
export const EMETTEUR_FACTURES = { nom: "BATI INVEST", forme: "SARL", siret: "910 796 325 00017", adresse: "6 impasse du Ouipoure, 22620 Ploubazlanec", tvaIntracom: "FR61910796325" } as const;
/** Les couleurs de la marque. */
export const COULEURS_APP = { jaune: "#FFC800", noir: "#0E0E0E" } as const;
