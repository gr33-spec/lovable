import type { Referential } from "../model.js";
import { assumed, byPiece, DEFINITION_SOURCE, generic, inPacks, lineQuantity, ok, packaging, rule, spec, todo } from "./kit.js";

/**
 * TIROIR MENUISERIE (lot B, paquet 2) : `docs/referentiels/menuiserie.md` et `referentiels/menuiserie/tiroir.json`
 * (valeurs relevées le 2026-10-04). Fenêtres : la menuiserie part telle que le devis la décrit (matière, dimensions,
 * ouverture), et ses fournitures de pose se calculent sur le périmètre (mousse, mastic, cales). Parquet : paquets
 * entiers après les chutes, sous-couche, colle. Plinthes : barres entières. Les mètres de mousse ou de mastic et les
 * cales ne se demandent jamais : hypothèses dites, orange tant qu'un menuisier ne les a pas confirmées.
 */
const USAGE = "usage-menuisier";
const TIROIR = "tiroir-menuiserie-2026-10-04";
const SOUDAL = "soudal-soudafoam-gun";
const MS = "mastic-ms-polymere";
const CALES = "cales-fourchette";
const SOUS_COUCHE = "sous-couche-volden";
const COLLE_MS = "colle-parquet-ms20";
const QUICKSTEP = "quick-step-compact";
const PLINTHE = "plinthe-mdf-240";


export const MENUISERIE_REFERENTIAL: Referential = {
  id: "menuiserie",
  version: "menuiserie-2026.10.06-2",
  trade: "joinery",
  sources: [
    DEFINITION_SOURCE,
    {
      id: USAGE,
      kind: "trade_practice",
      title: "Référentiel quantitatif menuiserie (docs/referentiels/menuiserie.md), usages à valider par un menuisier",
      documentRef: "docs/referentiels/menuiserie.md",
      retrievedAt: "2026-10-04",
    },
    { id: TIROIR, kind: "retailer", title: "Tiroir menuiserie : valeurs relevées sur les fiches négoce", documentRef: "referentiels/menuiserie/tiroir.json", retrievedAt: "2026-10-04" },
    {
      id: SOUDAL,
      kind: "manufacturer",
      title: "Soudal Soudafoam Gun : ≈ 25 m de joint par aérosol de 750 ml (méthode FEICA)",
      url: "https://content.ostermann.eu/webcontent/content/mamdata/PDF_Daten/Technische_Merkblaetter/Soudal/710-Soudafoam-Gun_B2/710-Soudafoam-Gun_B2-TM-fr.pdf",
      retrievedAt: "2026-10-04",
    },
    { id: MS, kind: "manufacturer", title: "Mastic MS polymère 290 ml : ≈ 6 m en joint 10 × 5 mm", url: "https://www.mariusaurenti.com/wp-content/uploads/PDF/Joint-colle-MS-Polymer-FT120324.pdf", retrievedAt: "2026-10-04" },
    { id: CALES, kind: "retailer", title: "Cales de pose de menuiserie : assortiments de 50 ou de 500", url: "https://www.leroymerlin.fr/produits/lot-de-240-cales-fourchette-repliables-pose-fenetres-82354376.html", retrievedAt: "2026-10-04" },
    { id: SOUS_COUCHE, kind: "retailer", title: "Sous-couche parquet 2,2 mm : rouleau de 15 m²", url: "https://www.castorama.fr/sous-couche-pour-sol-stratifie-volden-ep-2-2mm-15m-/5063022038890_CAFR.prd", retrievedAt: "2026-10-04" },
    { id: COLLE_MS, kind: "manufacturer", title: "Colle parquet MS 20 : 1 000 à 1 400 g/m², seau de 15 kg", url: "https://media.trenois.com/static/colle-parquet-ms20_soa064_fiche-technique.pdf", retrievedAt: "2026-10-04" },
    { id: QUICKSTEP, kind: "manufacturer", title: "Quick-Step Compact 2 200 × 145 mm : 1,914 m² par paquet", url: "https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_1545127.pdf", retrievedAt: "2026-10-04" },
    { id: PLINTHE, kind: "retailer", title: "Plinthe MDF 10 × 70 mm : barre de 2,40 m", url: "https://www.bricomarche.com/p/plinthe-arrondie-mdf-revetu-blanc-10x70-l.2.40m/3428350061996", retrievedAt: "2026-10-04" },
  ],
  families: [
    {
      code: "window_work",
      label: "Fenêtres",
      needUnit: "u",
      attributes: [],
      keyAttributes: [],
      keywords: ["fenetre", "fenetres", "porte-fenetre", "porte fenetre", "portes-fenetres", "baie vitree", "chassis"],
    },
    {
      code: "floating_floor_work",
      label: "Parquet flottant",
      needUnit: "m2",
      attributes: [],
      keyAttributes: [],
      keywords: ["parquet flottant", "stratifie", "sol stratifie", "parquet contrecolle flottant"],
    },
    { code: "glued_floor_work", label: "Parquet collé", needUnit: "m2", attributes: [], keyAttributes: [], keywords: ["parquet colle", "parquet contrecolle colle", "parquet massif colle"] },
    { code: "skirting_work", label: "Plinthes bois", needUnit: "ml", attributes: [], keyAttributes: [], keywords: ["plinthes", "plinthe"] },
    { code: "pu_foam", label: "Mousse PU", needUnit: "m", attributes: [], keyAttributes: [], consumable: true },
    { code: "sealant", label: "Mastic", needUnit: "m", attributes: [], keyAttributes: [], consumable: true },
    { code: "shims", label: "Cales de pose", needUnit: "u", attributes: [], keyAttributes: [], consumable: true },
    { code: "floor_boards", label: "Lames de parquet", needUnit: "m2", attributes: [], keyAttributes: [] },
    { code: "underlay", label: "Sous-couche", needUnit: "m2", attributes: [], keyAttributes: [] },
    { code: "floor_glue", label: "Colle parquet", needUnit: "kg", attributes: [], keyAttributes: [] },
    { code: "skirting_board", label: "Plinthe", needUnit: "u", attributes: [{ key: "longueur", label: "Longueur de barre", unit: "m" }], keyAttributes: [] },
  ],
  products: [
    generic(
      "mousse-750",
      "pu_foam",
      "Mousse PU pistolable, aérosol de 750 ml",
      "Mousse PU pistolable 750 ml",
      inPacks("aerosol", "aérosol de 750 ml", "aérosols de 750 ml", {
        ...packaging("25", "m", SOUDAL, todo("≈ 25 m de joint par aérosol (Soudafoam Gun) ; 30 m pour la B2.")),
        conflict: "De 24 à 30 m de joint selon la mousse (Soudal).",
        label: "≈ 25 m de joint par aérosol",
      }),
    ),
    generic(
      "mastic-ms-290",
      "sealant",
      "Mastic MS polymère blanc, cartouche de 290 ml",
      "Mastic MS polymère 290 ml",
      inPacks("cartouche", "cartouche de 290 ml", "cartouches de 290 ml", { ...packaging("6", "m", MS, ok("≈ 6 m en joint 10 × 5 mm.")), label: "≈ 6 m de joint par cartouche" }),
    ),
    generic(
      "cales-50",
      "shims",
      "Cales de pose de menuiserie, assortiment de 50 (1 à 5 mm)",
      "Cales de pose, sachet de 50",
      inPacks("sachet", "sachet de 50", "sachets de 50", packaging("50", "u", CALES, ok("Assortiment de 50 cales."))),
    ),
    generic(
      "quickstep-compact",
      "floor_boards",
      "Parquet stratifié (type Quick-Step Compact 2 200 × 145), paquet de 1,914 m²",
      "Stratifié, paquet 1,914 m²",
      inPacks("paquet", "paquet de 1,914 m²", "paquets de 1,914 m²", packaging("1.914", "m2", QUICKSTEP, ok("1,914 m² par paquet (fiche Quick-Step Compact)."))),
    ),
    generic(
      "sous-couche-15",
      "underlay",
      "Sous-couche parquet 2,2 mm, rouleau de 15 m²",
      "Sous-couche 2,2 mm, rouleau 15 m²",
      inPacks("rouleau", "rouleau de 15 m²", "rouleaux de 15 m²", packaging("15", "m2", SOUS_COUCHE, ok("Rouleau de 15 m² (Volden 2,2 mm)."))),
    ),
    generic(
      "colle-ms-15",
      "floor_glue",
      "Colle parquet MS polymère, seau de 15 kg",
      "Colle parquet MS, seau 15 kg",
      inPacks("seau", "seau de 15 kg", "seaux de 15 kg", packaging("15", "kg", COLLE_MS, ok("Seaux de 15 à 16 kg."))),
    ),
    generic("plinthe-240", "skirting_board", "Plinthe MDF revêtue blanc 10 × 70 mm, barre de 2,40 m", "Plinthes MDF 10×70, barre 2,40 m", byPiece("barre", "barres"), {
      attributes: { longueur: { ...spec("2.4", "m", PLINTHE, todo("Barres de 2,20 m ou 2,40 m selon le modèle.")), conflict: "2,20 m chez d'autres fabricants.", label: "barre de {v}" } },
    }),
  ],
  workItems: [
    {
      id: "fenetres",
      trade: "joinery",
      section: "principal",
      label: "Fenêtres (menuiserie, mousse, mastic, cales)",
      triggers: ["window_work"],
      params: [
        lineQuantity("nombre", "Nombre de fenêtres", "u", "Combien de fenêtres ?"),
        assumed("perimetre", "Périmètre d'une fenêtre", "m", "4.9", USAGE, todo(), "fenêtre courante 1,20 × 1,25 m", [
          { label: "3,6 m (0,80 × 1,00)", value: "3.6" },
          { label: "4,9 m (1,20 × 1,25)", value: "4.9" },
          { label: "8,6 m (2,15 × 2,15)", value: "8.6" },
        ]),
      ],
      slots: [
        { key: "fenetres", family: "window_work", label: "Fenêtres", measureOnly: true, orderedAsWritten: true },
        { key: "mousse", family: "pu_foam", label: "Mousse PU", usual: { text: "Mousse PU pistolable 750 ml.", source: SOUDAL, productId: "mousse-750" } },
        { key: "mastic", family: "sealant", label: "Mastic", usual: { text: "Mastic MS polymère 290 ml.", source: MS, productId: "mastic-ms-290" } },
        { key: "cales", family: "shims", label: "Cales", usual: { text: "Cales de pose, sachet de 50.", source: CALES, productId: "cales-50" } },
      ],
      constants: {
        cales_par_fenetre: rule("12", "u/u", USAGE, todo("Cales d'assise et de réglage (§5)."), "{v} cales par fenêtre"),
      },
      needs: [
        { id: "mousse", slot: "mousse", formula: "nombre * perimetre", unit: "m", core: true, precision: "calfeutrement sur le périmètre", source: USAGE, verification: ok(), version: 1 },
        { id: "mastic", slot: "mastic", formula: "nombre * perimetre", unit: "m", core: true, precision: "joint extérieur sur le périmètre", source: USAGE, verification: ok(), version: 1 },
        { id: "cales", slot: "cales", formula: "nombre * regle.cales_par_fenetre", unit: "u", core: true, source: USAGE, verification: ok(), version: 1 },
      ],
    },
    {
      id: "parquet-flottant",
      trade: "joinery",
      section: "principal",
      label: "Parquet flottant (lames, sous-couche)",
      triggers: ["floating_floor_work"],
      params: [lineQuantity("surface", "Surface posée", "m2", "Surface à poser ?")],
      slots: [
        { key: "sol", family: "floating_floor_work", label: "Parquet flottant", measureOnly: true },
        { key: "lames", formOf: "sol", family: "floor_boards", label: "Lames", usual: { text: "Stratifié en paquets de 1,914 m² (Quick-Step Compact).", source: QUICKSTEP, productId: "quickstep-compact" } },
        { key: "sous_couche", family: "underlay", label: "Sous-couche", usual: { text: "Sous-couche 2,2 mm en rouleau de 15 m².", source: SOUS_COUCHE, productId: "sous-couche-15" } },
      ],
      constants: {
        pertes: rule("1.07", "1", USAGE, todo("7 % de chutes en pose droite (§7)."), "parquet +7 % de chutes (pose droite)"),
        perte_sous_couche: rule("1.05", "1", USAGE, todo("Remontées et recouvrements (§7)."), "sous-couche +5 %"),
      },
      needs: [
        { id: "lames", slot: "lames", formula: "surface * regle.pertes", unit: "m2", core: true, precision: "paquets entiers, même lot", source: USAGE, verification: ok(), version: 1 },
        { id: "sous_couche", slot: "sous_couche", formula: "surface * regle.perte_sous_couche", unit: "m2", core: true, source: USAGE, verification: ok(), version: 1 },
      ],
    },
    {
      id: "parquet-colle",
      trade: "joinery",
      section: "principal",
      label: "Parquet collé (lames, colle)",
      triggers: ["glued_floor_work"],
      params: [lineQuantity("surface", "Surface posée", "m2", "Surface à poser ?")],
      slots: [
        { key: "sol", family: "glued_floor_work", label: "Parquet collé", measureOnly: true },
        { key: "lames", formOf: "sol", family: "floor_boards", label: "Lames", usual: { text: "Lames en paquets entiers.", source: QUICKSTEP, productId: "quickstep-compact" } },
        { key: "colle", family: "floor_glue", label: "Colle", usual: { text: "Colle MS polymère en seau de 15 kg.", source: COLLE_MS, productId: "colle-ms-15" } },
      ],
      constants: {
        pertes: rule("1.07", "1", USAGE, todo("7 % de chutes en pose droite (§7)."), "parquet +7 % de chutes (pose droite)"),
        colle_par_m2: rule("1.2", "kg/m2", COLLE_MS, ok("1 000 à 1 400 g/m² à la spatule B11 (fiche MS 20)."), "colle {v}"),
      },
      needs: [
        { id: "lames", slot: "lames", formula: "surface * regle.pertes", unit: "m2", core: true, precision: "paquets entiers, même lot", source: USAGE, verification: ok(), version: 1 },
        { id: "colle", slot: "colle", formula: "surface * regle.colle_par_m2", unit: "kg", core: true, source: COLLE_MS, verification: ok(), version: 1 },
      ],
    },
    {
      id: "plinthes",
      trade: "joinery",
      label: "Plinthes bois (barres)",
      triggers: ["skirting_work"],
      params: [lineQuantity("longueur", "Longueur de plinthes", "m", "Longueur de plinthes ?")],
      slots: [
        { key: "plinthes", family: "skirting_work", label: "Plinthes", measureOnly: true },
        { key: "plinthe", formOf: "plinthes", family: "skirting_board", label: "Plinthes", usual: { text: "Plinthe MDF 10 × 70 en barre de 2,40 m.", source: PLINTHE, productId: "plinthe-240" } },
      ],
      constants: { perte: rule("1.1", "1", USAGE, todo("Coupes d'angle et de porte (§5.3)."), "plinthes +10 % de coupe") },
      needs: [{ id: "plinthes", slot: "plinthe", formula: "arrondi_sup(longueur * regle.perte / plinthe.longueur)", unit: "u", core: true, source: USAGE, verification: ok(), version: 1 }],
    },
  ],
  wasteRules: [],
};
