import { makePdf, type FixtureRow } from "./pdf-fixtures.js";

// Le chantier ardoise et zinguerie de Greg (D-2026-020), anonymisé : désignations et quantités, prix d'exemple.
// Le repère « JEU-D2026-020 » du titre fait rendre au lecteur simulé la lecture RÉELLE du modèle (17 novembre 2026).
const ROWS: FixtureRow[] = [
  ["1", "Fourniture d'ardoises naturelles 32x22 et crochets de 11", "48,00", "10,00", "480,00"],
  ["2", "Pose de couverture en ardoises 32x22", "48,00", "10,00", "480,00"],
  ["3", "Fourniture de gouttière Havraise en zinc", "10,00", "10,00", "100,00"],
  ["4", "Fourniture de crochets de gouttière Havraise", "20,00", "1,00", "20,00"],
  ["5", "Pose de gouttière Havraise sur chevrons", "10,00", "10,00", "100,00"],
  ["6", "Fourniture de bandes de rive en zinc (verrière)", "4,00", "10,00", "40,00"],
  ["7", "Pose de bandes de rive en zinc (verrière)", "4,00", "10,00", "40,00"],
  ["8", "Fourniture de bande de faîtage zinc dev 25cm", "8,00", "10,00", "80,00"],
  ["9", "Pose de bande de faîtage en zinc", "8,00", "10,00", "80,00"],
  ["10", "Fourniture de bande porte-solin zinc et mortier ciment", "4,00", "10,00", "40,00"],
  ["11", "Pose de bande porte-solin et réalisation du solin ciment", "4,00", "10,00", "40,00"],
  ["12", "Fourniture de tuyau de descente zinc diam. 80mm", "6,00", "10,00", "60,00"],
  ["13", "Fourniture de coude zinc diam. 80mm", "4,00", "10,00", "40,00"],
  ["14", "Pose de tuyaux de descente et coudes zinc", "6,00", "10,00", "60,00"],
];
export const D2026_020_PDF = () => makePdf(["devis"], ROWS, "Total HT 1 660,00", "DEVIS JEU-D2026-020 (anonymisé)");
