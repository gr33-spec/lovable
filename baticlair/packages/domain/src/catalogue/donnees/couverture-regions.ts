import { croiser, produit, type ArticleCatalogue } from "../catalogue.js";

/**
 * COUVERTURE, RÉGION PAR RÉGION, ET TOUT LE SUPPORT BOIS (Greg, 31 octobre 2026, soir : « continue à ajouter des
 * matériaux liés à la couverture région par région car il y a des différences ; il faut aussi les voliges, tous les
 * liteaux, etc. »). Rien n'est inventé : chaque article cite la section du référentiel du fondateur qui le nomme.
 *
 * - §26.2 et §26.3 : les couvertures et accessoires propres à une région (tuile plate écaille en Alsace, tuile vernissée en
 *   Bourgogne, lauze en montagne et dans le Sud, ancelles en Savoie, ardoises de rive biaises en Ardenne et en Bretagne…).
 * - §27 : le support (contre-liteaux 27×40 et 40×40, voligeage sapin 15 ou 18 mm, OSB 3 et CTBX 2,50 × 1,25, sarking,
 *   planche de rive) ; §760 : les sections de liteau selon l'entraxe des chevrons (déjà au catalogue).
 * - §36 (VMZINC, ligne 1558) : volige 12, 15, 18 mm, frise 18 mm, planche 22 à 32 mm ; bois admis sous le zinc : sapin,
 *   épicéa, pin sylvestre, peuplier (chêne, châtaignier, mélèze, red cedar, douglas interdits) ; pointes annelées 2,5×40 à
 *   2,8×60, vis 4×40 et 4×50 ; §25 (ligne 808) : pointes crantées 28-35 mm pour les pattes du joint debout.
 *
 * Désignations génériques (aucune marque), statut « générique » avec la section en source.
 */
const M = "couverture" as const;
const REF = (section: string) => ({ statut: "generique" as const, source: { libelle: `Référentiel couverture du fondateur, ${section}`, verifieLe: "2026-10-31" } });
const ESSENCES_ZINC = ["sapin", "épicéa", "pin sylvestre", "peuplier"];

export const COUVERTURE_REGIONS: readonly ArticleCatalogue[] = [
  // Support bois (§27, §36)
  ...produit(M, "Bois de couverture", "Volige", "m²", croiser(["12×100", "15×100", "18×100", "22×100", "25×100", "27×100"], ESSENCES_ZINC), {
    synonymes: ["voliges", "voligeage", "volige jointive", "planche de couverture", "support zinc"],
    fiche: REF("§27 et §36 (VMZINC)"),
  }),
  ...produit(M, "Bois de couverture", "Frise", "m²", croiser(["18 mm"], ESSENCES_ZINC), { synonymes: ["frise", "lame", "support zinc"], fiche: REF("§36 (VMZINC)") }),
  ...produit(M, "Bois de couverture", "Contre-latte", "m", ["27×40 · traité classe 2"], { synonymes: ["contre liteau", "contre lattage", "contre-liteau", "contrelatte"], fiche: REF("§27") }),
  ...produit(M, "Bois de couverture", "Panneau OSB 3 support de couverture", "panneaux", ["2500×1250"], { synonymes: ["osb", "osb3", "support étanchéité", "support zinc"], fiche: REF("§27") }),
  ...produit(M, "Bois de couverture", "Contreplaqué CTBX", "panneaux", ["2500×1250"], { synonymes: ["ctbx", "contreplaque", "contre-plaqué"], fiche: REF("§27") }),
  ...produit(M, "Bois de couverture", "Planche de rive", "barres", ["barre 4 m", "barre 5 m"], { synonymes: ["rive", "bandeau", "bandeau d'égout", "planche d'égout"], fiche: REF("§27") }),
  ...produit(M, "Isolation de toiture", "Panneau sarking", "panneaux", ["PIR", "fibre de bois"], { synonymes: ["sarking", "isolant toiture", "isolation par l'extérieur"], fiche: REF("§27") }),
  ...produit(M, "Fixations", "Pointe annelée", "boîtes", ["2,5 × 40", "2,5 × 50", "2,8 × 50", "2,8 × 60"], { synonymes: ["pointe", "clou annelé", "pointe volige"], fiche: REF("§36 (VMZINC)") }),
  ...produit(M, "Fixations", "Vis pour volige", "boîtes", ["4 × 40", "4 × 50"], { synonymes: ["vis", "vis volige", "vis support"], fiche: REF("§36 (VMZINC)") }),
  ...produit(M, "Fixations", "Pointe crantée pour pattes de zinc", "boîtes", ["28 mm", "35 mm"], { synonymes: ["pointe crantée", "pattes joint debout", "pointe pattes"], fiche: REF("§25") }),
  ...produit(M, "Fixations", "Pointe torsadée galvanisée pour liteaux", "kg", [null], { synonymes: ["pointe liteau", "clou liteau", "pointe torsadée"], fiche: REF("§25 et §27") }),
  // Couvertures régionales (§26.2, §26.3)
  ...produit(M, "Tuiles terre cuite", "Tuile plate écaille (queue de castor)", "pièces", [null], { synonymes: ["biberschwanz", "queue de castor", "écaille", "tuile alsacienne", "alsace"], fiche: REF("§26.2 (Alsace)") }),
  ...produit(M, "Tuiles terre cuite", "Tuile plate vernissée", "pièces", [null], { synonymes: ["vernissée", "tuile vernissée", "tuile de bourgogne", "bourgogne"], fiche: REF("§26.2 (Bourgogne)") }),
  ...produit(M, "Tuiles terre cuite", "Tuile double romane", "pièces", [null], { synonymes: ["double romane", "lorraine", "champagne"], fiche: REF("§26.2 (Champagne-Ardenne, Lorraine)") }),
  ...produit(M, "Tuiles terre cuite", "Tuile mécanique Marseillaise", "pièces", [null], { synonymes: ["marseillaise", "tuile de marseille", "provence"], fiche: REF("§26.2 (PACA)") }),
  ...produit(M, "Tuiles terre cuite", "Tuile canal de courant", "pièces", ["40 cm", "50 cm"], { synonymes: ["courant", "tuile de dessous", "canal courant", "occitanie"], fiche: REF("§26.2 (Occitanie)") }),
  ...produit(M, "Tuiles terre cuite", "Tuile canal de couvert", "pièces", ["40 cm", "50 cm"], { synonymes: ["couvert", "couvrant", "tuile de dessus", "canal couvert"], fiche: REF("§26.2 (Occitanie)") }),
  ...produit(M, "Couvertures de pierre et de bois", "Lauze", "m²", ["schiste", "calcaire"], { synonymes: ["lauzes", "lause", "toiture en pierre", "montagne", "aveyron", "lozère", "corse"], fiche: REF("§26.2 (montagne, Aveyron, Lozère, Pyrénées, Corse)") }),
  ...produit(M, "Couvertures de pierre et de bois", "Ancelle (tavaillon)", "m²", [null], { synonymes: ["ancelle", "tavaillon", "bardeau bois", "tuile bois", "savoie"], fiche: REF("§26.2 (Savoie, stations)") }),
  ...produit(M, "Ardoises", "Ardoise de rive biaise", "pièces", [null], { synonymes: ["rive biaise", "ardoise biaise", "ardenne", "bretagne"], fiche: REF("§26.3 (Ardenne, Bretagne)") }),
];

/** Les régions du §26.2 (découpage du fondateur, anciennes régions comprises) et leurs départements. */
export interface RegionCouverture {
  code: string;
  nom: string;
  departements: readonly string[];
  /** Les produits du catalogue qui y dominent (§26.2) : proposés en premier, à score égal. */
  dominants: readonly string[];
}

export const REGIONS_COUVERTURE: readonly RegionCouverture[] = [
  { code: "ouest", nom: "Bretagne, Normandie, Pays de la Loire", departements: ["22", "29", "35", "56", "14", "27", "50", "61", "76", "44", "49", "53", "72", "85"], dominants: ["Ardoise naturelle", "Crochet d'ardoise inox", "Ardoise de faîtage (lignolet)", "Ardoise de rive biaise", "Gouttière nantaise zinc", "Gouttière demi-ronde zinc", "Closoir ventilé souple"] },
  { code: "nord", nom: "Nord, Pas-de-Calais, Picardie", departements: ["59", "62", "02", "60", "80"], dominants: ["Tuile plate", "Tuile Panne S Huguenot", "Tuile Double Panne S Huguenot", "Tuile Panne H2 Huguenot", "Ardoise naturelle"] },
  { code: "nord-est", nom: "Champagne-Ardenne, Lorraine", departements: ["08", "10", "51", "52", "54", "55", "57", "88"], dominants: ["Tuile double romane", "Tuile mécanique à emboîtement grand moule", "Ardoise naturelle", "Ardoise de rive biaise", "Tuile plate"] },
  { code: "alsace", nom: "Alsace", departements: ["67", "68"], dominants: ["Tuile plate écaille (queue de castor)"] },
  { code: "idf", nom: "Île-de-France", departements: ["75", "77", "78", "91", "92", "93", "94", "95"], dominants: ["Tuile plate", "Ardoise naturelle"] },
  { code: "bourgogne-fc", nom: "Bourgogne, Franche-Comté", departements: ["21", "58", "71", "89", "25", "39", "70", "90"], dominants: ["Tuile plate", "Tuile plate vernissée", "Tuile mécanique à emboîtement grand moule"] },
  { code: "centre", nom: "Centre-Val de Loire", departements: ["18", "28", "36", "37", "41", "45"], dominants: ["Ardoise naturelle", "Tuile plate"] },
  { code: "nouvelle-aquitaine", nom: "Nouvelle-Aquitaine", departements: ["16", "17", "19", "23", "24", "33", "40", "47", "64", "79", "86", "87"], dominants: ["Tuile canal", "Tuile canal de courant", "Tuile canal de couvert", "Tuile romane", "Tuile mécanique à emboîtement grand moule", "Ardoise naturelle"] },
  { code: "occitanie", nom: "Occitanie", departements: ["09", "11", "12", "30", "31", "32", "34", "46", "48", "65", "66", "81", "82"], dominants: ["Tuile canal", "Tuile canal de courant", "Tuile canal de couvert", "Tuile romane", "Lauze", "Ardoise naturelle"] },
  { code: "paca-corse", nom: "Provence-Alpes-Côte d'Azur, Corse", departements: ["04", "05", "06", "13", "83", "84", "2A", "2B"], dominants: ["Tuile canal", "Tuile romane", "Tuile mécanique Marseillaise", "Lauze"] },
  { code: "aura", nom: "Auvergne-Rhône-Alpes", departements: ["01", "03", "07", "15", "26", "38", "42", "43", "63", "69"], dominants: ["Tuile mécanique à emboîtement grand moule", "Tuile romane", "Tuile canal", "Lauze", "Bac acier nervuré", "Ardoise naturelle"] },
  { code: "savoie", nom: "Savoie, Haute-Savoie (stations)", departements: ["73", "74"], dominants: ["Bac acier nervuré", "Ancelle (tavaillon)", "Lauze", "Arrêt de neige"] },
];

/** Le département d'une adresse, par son code postal (Corse : 2A et 2B), ou null. */
export function departementDeLAdresse(adresse: string | null | undefined): string | null {
  const cp = /\b(\d{5})\b/.exec(adresse ?? "")?.[1];
  if (!cp) return null;
  if (cp.startsWith("20")) return Number(cp) < 20200 ? "2A" : "2B";
  return cp.startsWith("97") ? cp.slice(0, 3) : cp.slice(0, 2);
}

/** La région du §26.2 d'un département, ou null (outre-mer, inconnu). */
export const regionDuDepartement = (dep: string | null): RegionCouverture | null => (dep ? (REGIONS_COUVERTURE.find((r) => r.departements.includes(dep)) ?? null) : null);
