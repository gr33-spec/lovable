import type { QuoteLineReading } from "../../src/index.js";
import type { QuoteLineInput } from "../support/read-quote.js";

/**
 * Devis client réel D.2026.105 (réparation de couverture, 4 lignes), testé par le fondateur le 2026-10-09 (§49.9).
 * ANONYMISÉ : seules les désignations (titre et sous-lignes réunis, comme la lecture les rend), quantités et unités sont
 * gardées ; ni client, ni adresse, ni entreprise, ni prix. Le PDF n'est jamais commité.
 */
export const D2026_105_LINES: QuoteLineInput[] = [
  {
    ref: "1",
    designation:
      "Remplacement unitaire d'une tuile cassée ou défectueuse, comprenant accès toit, dépose de la tuile abîmée et pose d'une tuile neuve identique – Tuile terre cuite mécanique – Main d'œuvre couvreur",
    quantity: "20",
    unit: "u",
  },
  { ref: "2", designation: "Repositionnement et alignement des tuiles déplacées sur le versant", quantity: "1.5", unit: "h" },
  { ref: "3", designation: "Refixation mécanique et consolidation de l'élément de rive de toit arraché, y compris les petites fournitures de fixation", quantity: "1", unit: "u" },
  { ref: "4", designation: "Descente et évacuation des tuiles cassées et déchets de chantier vers un centre de tri agréé", quantity: "1", unit: "fft" },
];

/** La lecture du prompt A (§41.1, §49.9) : la fourniture extraite de chaque prestation, rien d'autre. */
export const D2026_105_READINGS = new Map<string, QuoteLineReading>([
  ["1", { role: "fourniture_et_pose", articles: [{ nom: "Tuile terre cuite mécanique", materiau: null, quantite: "20", unite: "u", elements: null }], faconnage: null, manque: ["modèle et teinte de tuile"] }],
  ["2", { role: "pose", articles: [], faconnage: null, manque: [] }],
  ["3", { role: "fourniture_et_pose", articles: [{ nom: "Fixations pour l'élément de rive", materiau: null, quantite: "1", unite: "jeu", elements: null }], faconnage: null, manque: ["type d'élément de rive (tuile de rive, bande de rive zinc)"] }],
  ["4", { role: "hors_quantitatif", articles: [], faconnage: null, manque: [] }],
]);
