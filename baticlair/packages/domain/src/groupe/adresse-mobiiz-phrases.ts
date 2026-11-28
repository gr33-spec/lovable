import { expediteurViaApp, phrasesAdresse } from "./adresse-mobiiz.js";
import { NOM_APP } from "./marque.js";

/** R7 : les phrases et l'expéditeur avec le nom de l'application (`adresse-mobiiz.ts` reste sans dépendance pour le site). */
export const PHRASES_ADRESSE = phrasesAdresse(NOM_APP);
export const expediteurVia = (nomEntreprise: string, adresse: string, domaine: string): string => expediteurViaApp(nomEntreprise, adresse, domaine, NOM_APP);
