import type { QuoteLineReading } from "../../src/index.js";
import type { QuoteLineInput } from "../support/read-quote.js";

/**
 * Devis client D.2026.105 (réparation, 4 lignes), testé par le fondateur le 2026-10-09 (§49.9). RECONSTITUÉ d'après la
 * description du référentiel (§49.9, « Test permanent ») en attendant le PDF : à remplacer par ses lignes anonymisées dès
 * réception (désignations, quantités, unités ; ni nom, ni adresse, ni prix). La lecture est celle que rend le prompt A.
 */
export const D2026_105_LINES: QuoteLineInput[] = [
  { ref: "1", designation: "Remplacement unitaire d'une tuile cassée, comprenant accès toit, dépose et pose d'une tuile neuve identique – Tuile terre cuite mécanique", quantity: "20", unit: "u" },
  { ref: "2", designation: "Repositionnement de tuiles", quantity: "1,5", unit: "h" },
  { ref: "3", designation: "Refixation d'un élément de rive, y compris les petites fournitures de fixation", quantity: "1", unit: "fft" },
  { ref: "4", designation: "Évacuation des déchets", quantity: "1", unit: "forfait" },
];

export const D2026_105_READINGS = new Map<string, QuoteLineReading>([
  ["1", { role: "fourniture_et_pose", articles: [{ nom: "Tuile terre cuite mécanique", materiau: null, quantite: "20", unite: "u", elements: null }], faconnage: null, manque: ["modèle et teinte de tuile"] }],
  ["2", { role: "pose", articles: [], faconnage: null, manque: [] }],
  ["3", { role: "fourniture_et_pose", articles: [{ nom: "Fixations pour l'élément de rive", materiau: null, quantite: "1", unite: "jeu", elements: null }], faconnage: null, manque: ["type d'élément de rive (tuile de rive, bande de rive zinc)"] }],
  ["4", { role: "hors_quantitatif", articles: [], faconnage: null, manque: [] }],
]);
