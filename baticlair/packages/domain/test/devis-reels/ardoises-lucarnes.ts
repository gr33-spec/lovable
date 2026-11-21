import type { BenchLine } from "./truth.js";

/**
 * Devis client réel d'un couvreur (ardoises, 200 m²), transmis par le fondateur
 * le 2026-10-02 (capture d'écran de l'application). ANONYMISÉ : seules les
 * désignations, quantités et unités sont gardées. C'est le devis qui a révélé
 * les ouvrages comptés (« 6 jouées », « 2 entourages ») et les liteaux 18×40.
 */
export const ARDOISES_LUCARNES_LINES: BenchLine[] = [
  { ref: "ligne 1", designation: "Liteaux bois pour ardoises", quantity: "200", unit: "m²", truth: "C", note: "200 m² de toiture, pas 200 m² de liteaux : liteaux en ml, section 18×40 par défaut." },
  { ref: "ligne 2", designation: "Ardoises naturelles 30x22", quantity: "200", unit: "m²", truth: "C", note: "Ardoises à la pièce (format × pureau), crochets à la pièce." },
  { ref: "ligne 3", designation: "Gouttière de 25, bandeau en zinc", quantity: "17", unit: "m", truth: "P", note: "Profil + crochets + naissances (nombre de descentes à demander)." },
  { ref: "ligne 4", designation: "Faîtage zinc", quantity: "17", unit: "m", truth: "C", note: "Bande zinc en longueurs de 3 m + pattes, jamais des faîtières en terre cuite." },
  { ref: "ligne 5", designation: "Ardoises pour jouées de lucarnes", quantity: "6", unit: "unités", truth: "C", note: "6 jouées (ouvrages), pas 6 ardoises : à faire chiffrer." },
  { ref: "ligne 6", designation: "Entourage de cheminée zinc et solin", quantity: "2", unit: "unités", truth: "C", note: "2 ouvrages à faire chiffrer." },
  { ref: "ligne 7", designation: "Chatières de ventilation", quantity: "12", unit: "unités", truth: "D" },
];
