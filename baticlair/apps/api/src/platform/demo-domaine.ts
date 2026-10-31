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
