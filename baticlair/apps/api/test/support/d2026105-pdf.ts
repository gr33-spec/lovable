import { makePdf, type FixtureRow } from "./pdf-fixtures.js";

// Le devis de réparation D.2026.105 anonymisé (désignations, quantités et unités du devis réel ; prix fictifs) : la vraie
// lecture en CI le lit sans jamais toucher au PDF du client (retour du fondateur, 2026-10-12, tuile sans modèle ni teinte).
const ROWS: FixtureRow[] = [
  ["1", "Remplacement unitaire d'une tuile cassée ou défectueuse, comprenant accès toit, dépose de la tuile abîmée et pose d'une tuile neuve identique – Tuile terre cuite mécanique – Main d'œuvre couvreur (u)", "20,00", "10,00", "200,00"],
  ["2", "Repositionnement et alignement des tuiles déplacées sur le versant (h)", "1,50", "10,00", "15,00"],
  ["3", "Refixation mécanique et consolidation de l'élément de rive de toit arraché, y compris les petites fournitures de fixation (u)", "1,00", "10,00", "10,00"],
  ["4", "Descente et évacuation des tuiles cassées et déchets de chantier vers un centre de tri agréé (fft)", "1,00", "10,00", "10,00"],
];
export const D2026_105_PDF = () => makePdf(["devis"], ROWS, "Total HT 235,00", "DEVIS N° D.2026.105 (anonymisé)");
