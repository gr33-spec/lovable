/**
 * Le nom de la commande commune : la constante unique vit dans le domaine (`packages/domain/src/groupe/nom.ts`), le site
 * la lit telle quelle (fichier sans dépendance, compilé avec le site). `NOM` pour un titre, `nom` dans une phrase.
 */
export { NOM_COMMANDE_COMMUNE, NOM_COMMANDE_COMMUNE_PLURIEL, nomCommun } from "../../../../packages/domain/src/groupe/nom";
import { NOM_COMMANDE_COMMUNE, NOM_COMMANDE_COMMUNE_PLURIEL } from "../../../../packages/domain/src/groupe/nom";

export const NOM = NOM_COMMANDE_COMMUNE;
export const nom = NOM_COMMANDE_COMMUNE.toLowerCase();
/** Au pluriel, dans une phrase (« Mes commandes communes »). */
export const noms = NOM_COMMANDE_COMMUNE_PLURIEL.toLowerCase();

/** La marque (24 octobre 2026) : le nom de l'application, l'accroche, le slogan, l'éditeur. Une seule source, le domaine. */
export { NOM_APP, ACCROCHE_APP, SLOGAN_APP, EDITEUR_APP, COULEURS_APP } from "../../../../packages/domain/src/groupe/marque";
