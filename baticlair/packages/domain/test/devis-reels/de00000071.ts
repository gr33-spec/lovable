import type { QuoteLineInput } from "../support/read-quote.js";

/**
 * Devis client réel DE00000071 (couvreur, 13/03/2022 : gouttière zinc sur bac acier existant, chéneau, 4 + 1 fenêtres de
 * toit), fourni par le fondateur le 2026-10-11 et lu par lui avec Claude : le résultat attendu est écrit mot pour mot
 * au §51.5 du référentiel. ANONYMISÉ : seules les désignations et les quantités sont gardées (ni noms, ni adresses, ni
 * prix). Le devis n'a PAS de colonne d'unité : chaque quantité est un nombre nu, c'est la lecture qui comprend que
 * 17,40 est une longueur de gouttière et que 10 peut compter des tôles ou des m². Coquilles de l'OCR gardées
 * (« velx », « 78,98 », « 7898 ») : c'est ce que la lecture reçoit.
 */
export const DE00000071_LINES: QuoteLineInput[] = [
  { ref: "1", designation: "Fourniture et pose de gouttière demi-ronde en zinc naturel sur bac acier avec crochets galva Négrafix", quantity: "17,40", unit: null },
  { ref: "2", designation: "Dépose et repose des tôles pour accès chéneau", quantity: "1,00", unit: null },
  { ref: "3", designation: "Réfection de chéneau en membrane EPDM ou PVC", quantity: "11,70", unit: null },
  { ref: "4", designation: "Réalisation des trémies de charpente pour velux SK06", quantity: "4,00", unit: null },
  { ref: "5", designation: "Fourniture velux SK06 114x118 GGL à rotation, vitrage confort, finition white finish avec raccord ZWC", quantity: "4,00", unit: null },
  { ref: "6", designation: "Pose de velux sk06 114x118 sur bac acier isolé avec raccord pratikal", quantity: "4,00", unit: null },
  { ref: "7", designation: "Réalisation des trémies de charpente pour velux MK04", quantity: "1,00", unit: null },
  { ref: "8", designation: "Fourniture velux MK04 78,98 GGU à rotation, vitrage confort, finition ever finish avec raccord ZWC", quantity: "1,00", unit: null },
  { ref: "9", designation: "Pose de velx MK04 7898 sur bac acier isolé avec raccord pratikal", quantity: "1,00", unit: null },
  { ref: "10", designation: "Fourniture et pose de tôles bacs acier pour étanchéité du dessus de velux", quantity: "10,00", unit: null },
];
