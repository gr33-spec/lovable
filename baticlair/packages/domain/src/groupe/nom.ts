/**
 * LE NOM DE LA COMMANDE COMMUNE (décision de Greg, 22 octobre 2026 : « Groupé » devient « Commande commune » partout :
 * onglet, landing, e-mails, PDF, aide). UNE SEULE CONSTANTE, lue par l'API (e-mails, PDF, notifications) et par le site
 * (`apps/web/src/lib/nom.ts` la réexporte) : changer le nom = changer cette ligne. Le code interne garde ses noms
 * (`groupe`, `besoin`, `lot`).
 */
export const NOM_COMMANDE_COMMUNE = "Commande commune";
/** Le même nom au pluriel (« Mes commandes communes »), à changer avec lui. */
export const NOM_COMMANDE_COMMUNE_PLURIEL = "Commandes communes";

/** Le nom dans une phrase (« la commande commune »). Le nom choisi est féminin ; s'il change de genre, revoir « la ». */
export const nomCommun = (): string => NOM_COMMANDE_COMMUNE.toLowerCase();
