/**
 * Chantier fictif « Réfection toiture maison Dupont » (données inventées).
 *
 * Pièges volontaires :
 * - A (Négoce Atlantique) : complet ; écran vendu par rouleaux de 47 m² (94 m² pour 91 demandés),
 *   remise ligne 10 % sur l'ardoise, livraison 95 €. Totaux cohérents.
 * - B (Comptoir du Toit) : total affiché le plus bas MAIS liteaux et bande de rive absents ;
 *   crochets en boîte de 500 ; variante ardoise ; franco de port ; faîtage nettement moins cher.
 * - C (Bois & Couverture de l'Ouest) : écran en substitution, faîtage en « m » (≠ « ml »)
 *   avec correspondance incertaine, liteaux 400 ml pour 420 demandés, option gouttière,
 *   livraison 145 €, consigne palettes, ligne non demandée, remise globale 3 %,
 *   et un total imprimé qui additionne l'option par erreur.
 *
 * Totaux attendus (calculés à la main, HT) :
 * - A : total calculé 4 897,40 ; comparable 4 891,10 (complet)
 * - B : total calculé 4 282,80 ; comparable 4 951,95 (dont 702,15 estimés)
 * - C : total calculé 5 093,50 ; imprimé 5 453,50 ; comparable 5 036,71 (provisoire)
 */
import {
  Decimal,
  Money,
  Quantity,
  type ComparisonInput,
  type ItemMatch,
  type RequestedItem,
  type SupplierOffer,
} from "../../src";

const eur = (v: string) => Money.of(v);
const d = (v: string) => new Decimal(v);

export const items: RequestedItem[] = [
  { id: "ecran", designation: "Écran de sous-toiture HPV", quantity: Quantity.of(91, "M2"), category: "Écran" },
  { id: "ardoise", designation: "Ardoise naturelle 32x22", quantity: Quantity.of(95, "M2"), category: "Couverture" },
  { id: "crochets", designation: "Crochets inox 32x22", quantity: Quantity.of(350, "U"), category: "Fixations" },
  { id: "faitage", designation: "Faîtage", quantity: Quantity.of(18, "ML"), category: "Faîtage" },
  { id: "liteaux", designation: "Liteaux sapin 27x40", quantity: Quantity.of(420, "ML"), category: "Bois" },
  { id: "rive", designation: "Bande de rive zinc", quantity: Quantity.of(24, "ML"), category: "Zinguerie" },
];

const vat = d("0.20");

export const offerA: SupplierOffer = {
  supplierId: "A",
  lines: [
    { id: "a1", kind: "main", designation: "Écran HPV rlx 1,5x31,33 (47 m²)", quantity: Quantity.of(2, "ROULEAU"), packaging: { packageUnit: "ROULEAU", content: Quantity.of(47, "M2") }, unitPrice: eur("98.70"), lineTotal: eur("197.40"), vatRate: vat },
    { id: "a2", kind: "main", designation: "Ardoise Espagne 32x22 1er choix", quantity: Quantity.of(95, "M2"), unitPrice: eur("40.00"), discountRate: d("0.10"), lineTotal: eur("3420.00"), vatRate: vat },
    { id: "a3", kind: "main", designation: "Crochet inox 32/22", quantity: Quantity.of(350, "U"), unitPrice: eur("0.18"), lineTotal: eur("63.00"), vatRate: vat },
    { id: "a4", kind: "main", designation: "Faîtière terre cuite", quantity: Quantity.of(18, "ML"), unitPrice: eur("21.50"), lineTotal: eur("387.00"), vatRate: vat },
    { id: "a5", kind: "main", designation: "Liteau sapin traité 27x40", quantity: Quantity.of(420, "ML"), unitPrice: eur("0.95"), lineTotal: eur("399.00"), vatRate: vat },
    { id: "a6", kind: "main", designation: "Bande de rive zinc", quantity: Quantity.of(24, "ML"), unitPrice: eur("14.00"), lineTotal: eur("336.00"), vatRate: vat },
    { id: "a7", kind: "fee", feeType: "delivery", designation: "Livraison chantier", lineTotal: eur("95.00"), vatRate: vat },
  ],
  printed: { totalHT: eur("4897.40"), totalVAT: eur("979.48"), totalTTC: eur("5876.88") },
};

export const offerB: SupplierOffer = {
  supplierId: "B",
  deliveryIncluded: true,
  lines: [
    { id: "b1", kind: "main", designation: "Ecran sous toiture respirant", quantity: Quantity.of(91, "M2"), unitPrice: eur("2.30"), lineTotal: eur("209.30") },
    { id: "b2", kind: "main", designation: "Ardoise nat. 32/22", quantity: Quantity.of(95, "M2"), unitPrice: eur("38.50"), lineTotal: eur("3657.50") },
    { id: "b3", kind: "main", designation: "Crochets 32x22 inox A2 bte 500", quantity: Quantity.of(1, "BOITE"), packaging: { packageUnit: "BOITE", content: Quantity.of(500, "U") }, unitPrice: eur("110.00"), lineTotal: eur("110.00") },
    { id: "b4", kind: "main", designation: "Closoir faîtage à sec", quantity: Quantity.of(18, "ML"), unitPrice: eur("17.00"), lineTotal: eur("306.00") },
    { id: "b5", kind: "variant", designation: "VARIANTE : ardoise Brésil 32x22", quantity: Quantity.of(95, "M2"), unitPrice: eur("29.00"), lineTotal: eur("2755.00"), relatesToLineIds: ["b2"] },
  ],
  printed: { totalHT: eur("4282.80") },
};

export const offerC: SupplierOffer = {
  supplierId: "C",
  globalDiscount: { rate: d("0.03") },
  lines: [
    { id: "c1", kind: "substitution", designation: "Écran HPV marque X (en remplacement)", quantity: Quantity.of(91, "M2"), unitPrice: eur("2.00"), lineTotal: eur("182.00") },
    { id: "c2", kind: "main", designation: "Ardoise 32x22 ép. 4", quantity: Quantity.of(95, "M2"), unitPrice: eur("39.00"), lineTotal: eur("3705.00") },
    { id: "c3", kind: "main", designation: "Crochet inox", quantity: Quantity.of(350, "U"), unitPrice: eur("0.20"), lineTotal: eur("70.00") },
    { id: "c4", kind: "main", designation: "Faîtière à emboîtement", quantity: Quantity.of(18, "M"), unitPrice: eur("22.00"), lineTotal: eur("396.00") },
    { id: "c5", kind: "main", designation: "Liteau 27x40", quantity: Quantity.of(400, "ML"), unitPrice: eur("0.90"), lineTotal: eur("360.00") },
    { id: "c6", kind: "main", designation: "Bande de rive zinc naturel", quantity: Quantity.of(24, "ML"), unitPrice: eur("13.00"), lineTotal: eur("312.00") },
    { id: "c7", kind: "option", designation: "OPTION : gouttière zinc 25", quantity: Quantity.of(20, "ML"), unitPrice: eur("18.00"), lineTotal: eur("360.00") },
    { id: "c8", kind: "fee", feeType: "delivery", designation: "Transport", lineTotal: eur("145.00") },
    { id: "c9", kind: "deposit", designation: "Consigne palette", quantity: Quantity.of(2, "U"), unitPrice: eur("25.00"), lineTotal: eur("50.00") },
    { id: "c10", kind: "main", designation: "Adhésif pare-pluie", quantity: Quantity.of(2, "U"), unitPrice: eur("12.50"), lineTotal: eur("25.00") },
  ],
  // 5 093,50 calculé + 360,00 d'option ajoutée par erreur
  printed: { totalHT: eur("5453.50") },
};

const m = (itemId: string, supplierId: string, lineIds: string[], score: number, status: ItemMatch["status"] = "proposed"): ItemMatch =>
  ({ itemId, supplierId, lineIds, score, status });

export const matches: ItemMatch[] = [
  m("ecran", "A", ["a1"], 0.92), m("ardoise", "A", ["a2"], 0.95), m("crochets", "A", ["a3"], 0.97),
  m("faitage", "A", ["a4"], 0.93), m("liteaux", "A", ["a5"], 0.96), m("rive", "A", ["a6"], 0.98),
  m("ecran", "B", ["b1"], 0.85), m("ardoise", "B", ["b2"], 0.95), m("crochets", "B", ["b3"], 0.5, "confirmed"),
  m("faitage", "B", ["b4"], 0.8),
  m("ecran", "C", ["c1"], 0.9), m("ardoise", "C", ["c2"], 0.95), m("crochets", "C", ["c3"], 0.95),
  m("faitage", "C", ["c4"], 0.65), m("liteaux", "C", ["c5"], 0.93), m("rive", "C", ["c6"], 0.96),
];

export const dupontInput: ComparisonInput = { items, offers: [offerA, offerB, offerC], matches };
