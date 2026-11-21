import { makePdf, type FixtureRow } from "./pdf-fixtures.js";

// Le devis DE00000071 anonymisé (désignations et quantités) ; son numéro dans le titre fait choisir la lecture enregistrée.
const ROWS: FixtureRow[] = [
  ["1", "Fourniture et pose de gouttière demi-ronde en zinc naturel sur bac acier avec crochets galva Négrafix", "17,40", "63,20", "1 099,68"],
  ["2", "Dépose et repose des tôles pour accès chéneau", "1,00", "385,00", "385,00"],
  ["3", "Réfection de chéneau en membrane EPDM ou PVC", "11,70", "158,00", "1 848,60"],
  ["4", "Réalisation des trémies de charpente pour velux SK06", "4,00", "280,00", "1 120,00"],
  ["5", "Fourniture velux SK06 114x118 GGL à rotation, vitrage confort, finition white finish avec raccord ZWC", "4,00", "556,80", "2 227,20"],
  ["6", "Pose de velux sk06 114x118 sur bac acier isolé avec raccord pratikal", "4,00", "965,30", "3 861,20"],
  ["7", "Réalisation des trémies de charpente pour velux MK04", "1,00", "240,00", "240,00"],
  ["8", "Fourniture velux MK04 78,98 GGU à rotation, vitrage confort, finition ever finish avec raccord ZWC", "1,00", "637,20", "637,20"],
  ["9", "Pose de velx MK04 7898 sur bac acier isolé avec raccord pratikal", "1,00", "784,60", "784,60"],
  ["10", "Fourniture et pose de tôles bacs acier pour étanchéité du dessus de velux", "10,00", "255,00", "2 550,00"],
];
export const DE00000071_PDF = () => makePdf(["devis"], ROWS, "Total HT 14 753,48", "DEVIS N° DE00000071 (anonymisé)");
