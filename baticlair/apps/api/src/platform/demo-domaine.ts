/**
 * LE DOMAINE DES COMPTES ET FOURNISSEURS FICTIFS (mode démo, jeu de démonstration) : un sous-domaine de Mobiiz sans boîte
 * aux lettres, jamais une vraie adresse. Recette en ligne du 25 octobre 2026 : l'ancien `demo.baticlair.fr` s'affichait
 * dans « Mes fournisseurs ». Les données déjà créées avec l'ancien domaine restent reconnues (exclues des chiffres,
 * effacées d'un bouton).
 */
export const DOMAINE_DEMO = "demo.mobiiz.fr";
export const DOMAINES_DEMO = [DOMAINE_DEMO, "demo.baticlair.fr"] as const;

export const estAdresseDemo = (email: string): boolean => DOMAINES_DEMO.some((d) => email.toLowerCase().endsWith(`@${d}`));

/** Le filtre Prisma d'un e-mail fictif (`where: { OR: emailsDemo() }`, ou dans `user: { OR: … }`). */
export const emailsDemo = () => DOMAINES_DEMO.map((d) => ({ email: { endsWith: `@${d}` } }));

/**
 * LE VISITEUR DE L'ACCÈS DÉMO (Greg, 7 novembre 2026) : un compte éphémère `visiteur-<hasard>@demo.mobiiz.fr`, créé par
 * « Découvrir l'application », effacé après 24 h. Reconnu à son adresse : en démo, rien ne part (e-mail, IA, paiement).
 */
export const PREFIXE_VISITEUR = "visiteur-";
export const estVisiteurDemo = (email: string | null | undefined): boolean => !!email && email.toLowerCase().startsWith(PREFIXE_VISITEUR) && email.toLowerCase().endsWith(`@${DOMAINE_DEMO}`);
/** Le filtre Prisma des comptes visiteurs. */
export const filtreVisiteurs = () => ({ email: { startsWith: PREFIXE_VISITEUR, endsWith: `@${DOMAINE_DEMO}` } });
/** Ce que voit le visiteur quand une action ne peut pas se faire en démonstration. */
export const PHRASE_ACTION_DEMO = "En démonstration, cette action est simulée : rien ne part et rien n'est partagé avec de vraies entreprises.";
/** Vrai pendant une requête d'un visiteur de l'accès démo. */
export { estRequeteDemo } from "./logging/request-context.js";

/**
 * Ce qu'un visiteur ne peut pas faire, même simulé (Greg, 7 novembre 2026 : « aucun paiement ni commande réelle »,
 * « conserver l'isolation stricte avec les comptes normaux ») : payer ou s'abonner, créer une clé partenaire, vérifier un
 * SIRET auprès de l'INSEE, et tout ce qui touche d'autres entreprises (achats groupés, rapprochements, commande du mois,
 * espaces négoce et admin). Les lectures (GET) restent ouvertes ; le reste de l'app se parcourt en entier.
 */
const ROUTES_INTERDITES_EN_DEMO: readonly RegExp[] = [
  /^\/v1\/(abonnement|billing|partner-keys|achats-groupes|rapprochements|groupe|missions|dossier-pro|profil-public|fichiers-pro|commande-du-mois|negoce|chasseur|admin|internal)(\/|$)/,
  /^\/v1\/company\/identite(\/|$)/,
  /^\/v1\/me\/alertes-achats-groupes(\/|$)/,
  /^\/v1\/projects\/[^/]+\/(achat-groupe|rapprochement|groupe|commande-du-mois)(\/|$)/,
];
export function routeInterditeEnDemo(methode: string, chemin: string): boolean {
  if (["GET", "HEAD", "OPTIONS"].includes(methode.toUpperCase())) return false;
  const p = chemin.split("?")[0]!;
  return ROUTES_INTERDITES_EN_DEMO.some((r) => r.test(p));
}
