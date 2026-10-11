import type { QuoteLineInput } from "../support/read-quote.js";

/**
 * Devis client réel D-2022-071 (couvreur : gouttière zinc sur bac acier, chéneau, 4 + 1 fenêtres de toit), fourni par le
 * fondateur le 2026-10-11. ANONYMISÉ : seules les désignations, quantités et unités sont gardées (ni noms, ni adresses,
 * ni prix). Le texte est celui de la couche OCR du PDF, coquilles comprises (« velx », « 78,98 », « 7898 ») : c'est ce
 * que la lecture reçoit. La dernière ligne n'a pas de colonne d'unité.
 */
export const D2022_071_LINES: QuoteLineInput[] = [
  { ref: "1", designation: "Fourniture et pose de gouttière demi-ronde en zinc naturel sur bac acier avec crochets galva", quantity: "63.20", unit: "ml" },
  { ref: "2", designation: "Dépose et repose des tôles pour accès chéneau", quantity: "1", unit: "u" },
  { ref: "3", designation: "Réfection de chéneau en membrane EPDM ou PVC", quantity: "11.70", unit: "ml" },
  { ref: "4", designation: "Réalisation des trémies de charpente pour velux SK06", quantity: "4", unit: "u" },
  { ref: "5", designation: "Fourniture velux SK06 114x118 GGL à rotation, vitrage confort, finition white finish avec raccord ZWC", quantity: "4", unit: "u" },
  { ref: "6", designation: "Pose de velux sk06 114x118 sur bac acier isolé avec raccord pratikal", quantity: "4", unit: "u" },
  { ref: "7", designation: "Réalisation des trémies de charpente pour velux MK04", quantity: "1", unit: "u" },
  { ref: "8", designation: "Fourniture velux MK04 78,98 GGU à rotation, vitrage confort, finition everfinish avec raccord ZWC", quantity: "1", unit: "u" },
  { ref: "9", designation: "Pose de velx MK04 7898 sur bac acier isolé avec raccord pratikal", quantity: "1", unit: "u" },
  { ref: "10", designation: "Fourniture et pose de tôles bacs acier pour étanchéité du dessus de velux", quantity: "10", unit: null },
];
