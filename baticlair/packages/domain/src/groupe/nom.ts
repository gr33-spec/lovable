/**
 * LE NOM DU GROUPE D'ACHAT : « Regroupement » (Greg, 25 octobre 2026, recentrage ; avant : « Regroupement », 22 octobre
 * 2026, et « Groupé »). UNE SEULE CONSTANTE, lue par l'API (e-mails, PDF, notifications) et par le site
 * (`apps/web/src/lib/nom.ts` la réexporte) : changer le nom = changer cette ligne. Le code interne garde ses noms
 * (`groupe`, `besoin`, `lot`, `NOM_COMMANDE_COMMUNE`).
 */
export const NOM_COMMANDE_COMMUNE = "Regroupement";
/** Le même nom au pluriel (« Mes regroupements »), à changer avec lui. */
export const NOM_COMMANDE_COMMUNE_PLURIEL = "Regroupements";

/** Le nom dans une phrase (« le regroupement »). Le nom choisi est MASCULIN : « le », « au », « du » ; s'il change de genre, revoir ces lignes. */
export const nomCommun = (): string => NOM_COMMANDE_COMMUNE.toLowerCase();
export const leNom = (): string => `le ${nomCommun()}`;
export const auNom = (): string => `au ${nomCommun()}`;
export const duNom = (): string => `du ${nomCommun()}`;
