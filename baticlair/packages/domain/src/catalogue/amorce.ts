import type { ArticleCatalogue, MetierCatalogue } from "./catalogue.js";
import { CHARPENTE } from "./donnees/charpente.js";
import { COUVERTURE } from "./donnees/couverture.js";
import { CARRELAGE, CHAUFFAGE, ELECTRICITE, MACONNERIE, MENUISERIE, PEINTURE, PLATRERIE_ISOLATION, PLOMBERIE } from "./donnees/autres-metiers.js";
import { ZINGUERIE } from "./donnees/zinguerie.js";

/** L'amorce du catalogue, métier par métier (la base la reprend ; l'admin la modifie ensuite). */
export const AMORCE_CATALOGUE: Readonly<Record<MetierCatalogue, readonly ArticleCatalogue[]>> = {
  couverture: COUVERTURE,
  zinguerie: ZINGUERIE,
  charpente: CHARPENTE,
  menuiserie: MENUISERIE,
  maconnerie: MACONNERIE,
  platrerie_isolation: PLATRERIE_ISOLATION,
  peinture: PEINTURE,
  carrelage: CARRELAGE,
  plomberie: PLOMBERIE,
  electricite: ELECTRICITE,
  chauffage: CHAUFFAGE,
};

export const TOUT_LE_CATALOGUE: readonly ArticleCatalogue[] = Object.values(AMORCE_CATALOGUE).flat();
