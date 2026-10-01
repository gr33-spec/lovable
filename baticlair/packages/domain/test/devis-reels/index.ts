import type { Answer, CompanyPreferences, QuoteLine } from "../../src/index.js";
import { D2026_015_LINES } from "./d2026-015.js";

/**
 * BANC D'ESSAI « VRAIS DEVIS » : chaque devis client réel reçu devient un
 * cas permanent. Ajouter un devis = un fichier anonymisé + une entrée ici
 * (voir docs/banc-devis-reels.md). Aucun réglage du moteur pour un cas.
 */
export interface RealQuoteCase {
  id: string;
  trade: "roofing";
  /** D'où vient le devis (sans nom ni coordonnées). */
  origin: string;
  lines: QuoteLine[];
  /**
   * Réponses de l'artisan, SEULEMENT quand le devis les justifie (sinon la
   * question reste ouverte et compte). `null` : aucune proposition ne convient.
   */
  answers: Record<string, Answer>;
  /** Pourquoi chaque réponse. */
  answersWhy: Record<string, string>;
  preferences?: CompanyPreferences;
}

export const REAL_QUOTES: RealQuoteCase[] = [
  {
    id: "D-2026-015",
    trade: "roofing",
    origin: "Devis client d'une entreprise de couverture, transmis par le fondateur le 2026-10-01.",
    lines: D2026_015_LINES,
    answers: { "product:tuile": "edilians-hp10-huguenot", "product:faitiere": null },
    answersWhy: {
      "product:tuile": "Le devis écrit « tuiles … type HP10 » : l'artisan confirme le modèle.",
      "product:faitiere": "Le devis écrit « faîtières ventilées » : la faîtière 710 du référentiel n'est pas documentée comme ventilée.",
    },
  },
];
