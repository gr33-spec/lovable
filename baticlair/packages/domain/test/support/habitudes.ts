import type { CompanyPreferences } from "../../src/index.js";

/**
 * Habitudes d'entreprise établies sur les bancs d'essai : la qualité d'ardoise est une question du comptoir (§47.8),
 * apprise une fois par entreprise (« Espagne 1er choix »). Les bancs mesurent le calcul, pas cette première question ;
 * `comptoir.test.ts` vérifie qu'elle est posée quand l'habitude manque.
 */
export const HABITUDES_BANC: CompanyPreferences = { params: { qualite_ardoise: "1" } };
