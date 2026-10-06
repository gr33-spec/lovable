import type { ParamDef, Referential } from "../model.js";
import { assumed, byPiece, DEFINITION_SOURCE, generic, inPacks, lineQuantity, ok, packaging, rule, todo } from "./kit.js";

/**
 * TIROIR PLOMBERIE (lot B, paquet 2) : `docs/referentiels/plomberie.md` (règles R2, R4, R5) et `referentiels/plomberie/
 * tiroir.json` (valeurs relevées le 2026-10-04). Le devis compte des APPAREILS (alimentations, évacuations) ou une
 * surface (plancher chauffant) ; BatiClair en tire tubes, raccords, colle, plaques. Questions du comptoir seulement : le
 * tube (multicouche ou PER), le type de raccords, le diamètre d'évacuation. Les mètres de tube par appareil et les
 * coudes ne se demandent jamais : hypothèses dites, orange tant qu'un plombier ne les a pas confirmées.
 */
const USAGE = "usage-plombier";
const TIROIR = "tiroir-plomberie-2026-10-04";
const HENCO = "henco-multicouche-barre";
const COMAP = "comap-per-pregaine";
const NICOLL = "nicoll-tube-pvc";
const GRIFFON = "griffon-colle-pvc";
const GIACOMINI = "giacomini-r885";

const RACCORD: ParamDef = {
  key: "raccord",
  label: "Raccords",
  unit: "u",
  kind: "artisan_preference",
  question: "Raccords : à sertir (quel profil : TH, U, B) ou à visser ?",
  choices: [
    { label: "À sertir, profil TH", value: "1" },
    { label: "À sertir, profil U", value: "2" },
    { label: "À sertir, profil B", value: "3" },
    { label: "À visser (compression)", value: "4" },
  ],
  display: { "1": "à sertir profil TH", "2": "à sertir profil U", "3": "à sertir profil B", "4": "à visser (compression)" },
  textValues: [
    { value: "1", keywords: ["profil th", "sertir th"] },
    { value: "2", keywords: ["profil u "] },
    { value: "3", keywords: ["profil b "] },
    { value: "4", keywords: ["a visser", "compression"] },
  ],
};
const DIAMETRE_EVAC: ParamDef = {
  key: "diametre_evac",
  label: "Diamètre d'évacuation",
  unit: "mm",
  kind: "site_data",
  question: "Évacuation : PVC Ø32, 40, 50 ou 100 ?",
  choices: [
    { label: "Ø 32", value: "32" },
    { label: "Ø 40", value: "40" },
    { label: "Ø 50", value: "50" },
    { label: "Ø 100", value: "100" },
  ],
  textValues: [
    { value: "100", keywords: ["ø100", "o100", "diametre 100", "pvc 100"] },
    { value: "50", keywords: ["ø50", "o50", "diametre 50", "pvc 50"] },
    { value: "40", keywords: ["ø40", "o40", "diametre 40", "pvc 40"] },
    { value: "32", keywords: ["ø32", "o32", "diametre 32", "pvc 32"] },
  ],
};

export const PLOMBERIE_REFERENTIAL: Referential = {
  id: "plomberie",
  version: "plomberie-2026.10.06-2",
  trade: "plumbing",
  sources: [
    DEFINITION_SOURCE,
    {
      id: USAGE,
      kind: "trade_practice",
      title: "Référentiel quantitatif plomberie (docs/referentiels/plomberie.md, R2 à R5), usages à valider par un plombier",
      documentRef: "docs/referentiels/plomberie.md",
      retrievedAt: "2026-10-04",
    },
    { id: TIROIR, kind: "retailer", title: "Tiroir plomberie : valeurs relevées sur les fiches négoce", documentRef: "referentiels/plomberie/tiroir.json", retrievedAt: "2026-10-04" },
    { id: HENCO, kind: "manufacturer", title: "Henco Standard 16×2 : barres de 4 m et de 5 m", url: "https://www.henco.be/en/STRAIGHT-LENGTH", retrievedAt: "2026-10-04" },
    {
      id: COMAP,
      kind: "retailer",
      title: "PER pré-gainé 16×1,5 : couronnes de 25 m et 50 m",
      url: "https://www.cherchons.com/bricolage/plomberie/alimentation-en-eau/tuyau-de-plomberie/tube-per/tube-gaine-per.html",
      retrievedAt: "2026-10-04",
    },
    { id: NICOLL, kind: "manufacturer", title: "Nicoll : tube PVC d'évacuation en barre de 4 m", url: "https://www.nicoll.fr/fr/tube-pvc-compact-non-premanchonne-0", retrievedAt: "2026-10-04" },
    { id: GRIFFON, kind: "retailer", title: "Colle PVC Griffon : pots de 250 ml, 500 ml, 1 L", url: "https://lebonraccord.com/raccord-piscine/colle-griffon-pvc-pression-250ml-ref1495.html", retrievedAt: "2026-10-04" },
    {
      id: GIACOMINI,
      kind: "manufacturer",
      title: "Giacomini R885 : plaque à plots 1 200 × 1 000 mm, 1,18 m² utiles",
      url: "https://dam.giacomini.com/fr.giacomini.com/product_documentations/datasheets/R885DB.pdf",
      retrievedAt: "2026-10-04",
    },
  ],
  families: [
    {
      code: "supply_work",
      label: "Alimentations d'appareils",
      needUnit: "u",
      attributes: [],
      keyAttributes: [],
      keywords: ["alimentation ef", "alimentations ef", "alimentation eau", "alimentation en eau", "alimentations eau", "point d'eau", "points d'eau", "distribution eau"],
    },
    {
      code: "drain_work",
      label: "Évacuations d'appareils",
      needUnit: "u",
      attributes: [],
      keyAttributes: [],
      keywords: ["evacuation", "evacuations", "eaux usees", "ecoulement", "ecoulements"],
    },
    {
      code: "floor_heating_work",
      label: "Plancher chauffant hydraulique",
      needUnit: "m2",
      attributes: [],
      keyAttributes: [],
      keywords: ["plancher chauffant", "plancher rafraichissant", "chauffage au sol", "plancher chauffant hydraulique"],
    },
    { code: "supply_pipe", label: "Tube d'alimentation", needUnit: "m", attributes: [], keyAttributes: [] },
    { code: "supply_fitting", label: "Raccords d'alimentation", needUnit: "u", attributes: [], keyAttributes: [] },
    { code: "drain_pipe", label: "Tube PVC d'évacuation", needUnit: "m", attributes: [], keyAttributes: [] },
    { code: "drain_elbow", label: "Coudes PVC", needUnit: "u", attributes: [], keyAttributes: [] },
    { code: "pvc_glue", label: "Colle PVC", needUnit: "l", attributes: [], keyAttributes: [], consumable: true },
    { code: "stud_panel", label: "Plaque isolante à plots", needUnit: "u", attributes: [{ key: "utile", label: "Surface utile", unit: "m2" }], keyAttributes: [] },
    { code: "heating_pipe", label: "Tube de plancher chauffant", needUnit: "m", attributes: [], keyAttributes: [] },
    { code: "edge_strip", label: "Bande périphérique", needUnit: "m", attributes: [], keyAttributes: [] },
  ],
  products: [
    generic(
      "multicouche-16",
      "supply_pipe",
      "Tube multicouche 16×2 en barre de 4 m",
      "Multicouche 16×2, barre 4 m",
      inPacks("barre", "barre de 4 m", "barres de 4 m", {
        ...packaging("4", "m", HENCO, todo("Barres de 4 m ou de 5 m selon la marque.")),
        conflict: "Henco vend aussi la barre de 5 m.",
      }),
      { aliases: ["multicouche", "multi-couche", "mc 16"] },
    ),
    generic(
      "per-16",
      "supply_pipe",
      "Tube PER pré-gainé 16×1,5, couronne de 50 m",
      "PER pré-gainé 16, couronne 50 m",
      inPacks("couronne", "couronne de 50 m", "couronnes de 50 m", packaging("50", "m", COMAP, ok("Couronnes de 25 m et 50 m (BetaPEX Comap)."))),
      { aliases: ["per", "pre-gaine", "pregaine"] },
    ),
    generic("raccords-16", "supply_fitting", "Raccords Ø16 (coudes, tés, sorties de nourrice)", "Raccords Ø16", byPiece()),
    generic(
      "pvc-evac",
      "drain_pipe",
      "Tube PVC d'évacuation NF, barre de 4 m",
      "Tube PVC évacuation, barre 4 m",
      inPacks("barre", "barre de 4 m", "barres de 4 m", packaging("4", "m", NICOLL, ok("Barre de 4 m (Nicoll)."))),
    ),
    generic("coude-pvc", "drain_elbow", "Coude PVC 87°30 mâle-femelle", "Coudes PVC 87°30", byPiece()),
    generic(
      "colle-pvc-250",
      "pvc_glue",
      "Colle PVC (type Griffon), pot de 250 ml",
      "Colle PVC, pot 250 ml",
      inPacks("pot", "pot de 250 ml", "pots de 250 ml", packaging("0.25", "l", GRIFFON, ok("Pots de 250 ml, 500 ml, 1 L (Griffon)."))),
    ),
    generic(
      "plaque-plots",
      "stud_panel",
      "Plaque isolante à plots pour plancher chauffant 1 200 × 1 000 mm",
      "Plaques à plots 1 200 × 1 000",
      byPiece("plaque", "plaques"),
      { attributes: { utile: { ...packaging("1.18", "m2", GIACOMINI, ok("1 190 × 990 mm utiles (Giacomini R885)." )), kind: "manufacturer_spec", label: "plaque de {v} utiles" } } },
    ),
    generic(
      "per-pc-240",
      "heating_pipe",
      "Tube PER-BAO 16×2 pour plancher chauffant, couronne de 240 m",
      "PER-BAO 16×2, couronne 240 m",
      inPacks("couronne", "couronne de 240 m", "couronnes de 240 m", packaging("240", "m", USAGE, todo("Couronne de 240 m courante, à confirmer."))),
    ),
    generic(
      "bande-25",
      "edge_strip",
      "Bande périphérique 8 × 150 mm, rouleau de 25 m",
      "Bande périphérique, rouleau 25 m",
      inPacks("rouleau", "rouleau de 25 m", "rouleaux de 25 m", {
        ...packaging("25", "m", TIROIR, todo("Rouleaux de 25 m ou 50 m selon la marque.")),
        conflict: "Roth et Finimetal vendent aussi des rouleaux de 50 m.",
      }),
    ),
  ],
  workItems: [
    {
      id: "alimentations",
      trade: "plumbing",
      section: "principal",
      label: "Alimentations d'appareils en étoile (tube, raccords)",
      triggers: ["supply_work"],
      params: [
        lineQuantity("nombre", "Nombre d'appareils alimentés", "u", "Combien d'appareils ?"),
        assumed("distance", "Distance moyenne nourrice → appareil", "m", "5", USAGE, todo(), "5 m en moyenne dans une maison", [
          { label: "3 m", value: "3" },
          { label: "5 m", value: "5" },
          { label: "8 m", value: "8" },
        ]),
        RACCORD,
      ],
      slots: [
        { key: "alimentations", family: "supply_work", label: "Alimentations", measureOnly: true },
        { key: "tube", formOf: "alimentations", family: "supply_pipe", label: "Tube d'alimentation", keywords: ["multicouche", "per", "tube"], ask: "Tube : multicouche ou PER ?" },
        { key: "raccords", family: "supply_fitting", label: "Raccords", usual: { text: "Raccords Ø16.", source: USAGE, productId: "raccords-16" } },
      ],
      constants: {
        tubes_par_appareil: rule("2", "u/u", USAGE, todo("Eau froide et eau chaude ; un seul tube pour un WC ou un lave-linge (R2)."), "{v} tubes par appareil (EF + ECS)"),
        remontees: rule("1", "m", USAGE, todo("0,5 m de remontée à chaque extrémité (R2)."), "{v} de remontées par tube"),
        perte_tube: rule("1.05", "1", USAGE, todo("Perte couronne 5 % (R2)."), "tube +5 %"),
        raccords_par_tube: rule("2", "u/u", USAGE, todo("Sortie de nourrice et raccord d'appareil (R2)."), "{v} raccords par tube"),
      },
      needs: [
        {
          id: "tube",
          slot: "tube",
          formula: "nombre * regle.tubes_par_appareil * (distance + regle.remontees) * regle.perte_tube",
          unit: "m",
          core: true,
          source: USAGE,
          verification: ok(),
          version: 1,
        },
        {
          id: "raccords",
          slot: "raccords",
          formula: "nombre * regle.tubes_par_appareil * regle.raccords_par_tube",
          unit: "u",
          core: true,
          designation: "Raccords Ø16 {raccord}",
          precisionRequires: ["raccord"],
          source: USAGE,
          verification: ok(),
          version: 1,
        },
      ],
    },
    {
      id: "evacuations",
      trade: "plumbing",
      section: "principal",
      label: "Évacuations d'appareils en PVC (tube, coudes, colle)",
      triggers: ["drain_work"],
      params: [
        lineQuantity("nombre", "Nombre d'appareils raccordés", "u", "Combien d'appareils ?"),
        assumed("distance_evac", "Distance moyenne appareil → collecteur", "m", "3", USAGE, todo(), "3 m en moyenne", [
          { label: "2 m", value: "2" },
          { label: "3 m", value: "3" },
          { label: "5 m", value: "5" },
        ]),
        DIAMETRE_EVAC,
      ],
      slots: [
        { key: "evacuations", family: "drain_work", label: "Évacuations", measureOnly: true },
        { key: "tube", formOf: "evacuations", family: "drain_pipe", label: "Tube PVC", usual: { text: "Tube PVC en barre de 4 m.", source: NICOLL, productId: "pvc-evac" } },
        { key: "coudes", family: "drain_elbow", label: "Coudes PVC", usual: { text: "Coudes 87°30.", source: USAGE, productId: "coude-pvc" } },
        { key: "colle", family: "pvc_glue", label: "Colle PVC", usual: { text: "Colle PVC en pot de 250 ml.", source: GRIFFON, productId: "colle-pvc-250" } },
      ],
      constants: {
        remontee: rule("0.5", "m", USAGE, todo("Remontée sous l'appareil (R5)."), "{v} de remontée sous l'appareil"),
        perte_barre: rule("1.1", "1", USAGE, todo("Perte barre 10 % (R5)."), "tube +10 %"),
        coudes_par_appareil: rule("2", "u/u", USAGE, todo("Deux coudes par appareil par défaut (R5)."), "{v} coudes par appareil"),
        colle_par_appareil: rule("0.0125", "l/u", USAGE, todo("≈ 4 emboîtures par appareil, 3 g par emboîture en Ø40 (R5, Tangit)."), "colle ≈ 12,5 ml par appareil"),
      },
      needs: [
        {
          id: "tube",
          slot: "tube",
          formula: "nombre * (distance_evac + regle.remontee) * regle.perte_barre",
          unit: "m",
          core: true,
          designation: "Tube PVC évacuation Ø{diametre_evac|mm#}, barre 4 m",
          precisionRequires: ["diametre_evac"],
          source: USAGE,
          verification: ok(),
          version: 1,
        },
        {
          id: "coudes",
          slot: "coudes",
          formula: "nombre * regle.coudes_par_appareil",
          unit: "u",
          core: true,
          designation: "Coudes PVC 87°30 Ø{diametre_evac|mm#}",
          precisionRequires: ["diametre_evac"],
          source: USAGE,
          verification: ok(),
          version: 1,
        },
        { id: "colle", slot: "colle", formula: "nombre * regle.colle_par_appareil", unit: "l", core: true, source: USAGE, verification: ok(), version: 1 },
      ],
    },
    {
      id: "plancher-chauffant",
      trade: "plumbing",
      section: "principal",
      label: "Plancher chauffant hydraulique (plaques à plots, tube, bande périphérique)",
      triggers: ["floor_heating_work"],
      params: [lineQuantity("surface", "Surface chauffée", "m2", "Surface chauffée ?")],
      slots: [
        { key: "plancher", family: "floor_heating_work", label: "Plancher chauffant", measureOnly: true },
        { key: "plaques", family: "stud_panel", label: "Plaques à plots", usual: { text: "Plaque à plots 1 200 × 1 000.", source: GIACOMINI, productId: "plaque-plots" } },
        { key: "tube", formOf: "plancher", family: "heating_pipe", label: "Tube PER", usual: { text: "PER-BAO 16×2 en couronne.", source: USAGE, productId: "per-pc-240" } },
        { key: "bande", family: "edge_strip", label: "Bande périphérique", usual: { text: "Bande périphérique 8 × 150 mm.", source: TIROIR, productId: "bande-25" } },
      ],
      constants: {
        perte_plaques: rule("1.05", "1", USAGE, todo("Coupes en rive (§5)."), "plaques +5 %"),
        tube_par_m2: rule("6.7", "m/m2", USAGE, todo("Entraxe 15 cm : 6,7 m de tube par m²."), "{v} de tube par m² (entraxe 15 cm)"),
        bande_par_m2: rule("0.6", "m/m2", USAGE, todo("Périmètre des pièces rapporté à la surface."), "{v} de bande par m²"),
      },
      needs: [
        { id: "plaques", slot: "plaques", formula: "arrondi_sup(surface * regle.perte_plaques / plaques.utile)", unit: "u", core: true, source: GIACOMINI, verification: ok(), version: 1 },
        { id: "tube", slot: "tube", formula: "surface * regle.tube_par_m2", unit: "m", core: true, source: USAGE, verification: ok(), version: 1 },
        { id: "bande", slot: "bande", formula: "surface * regle.bande_par_m2", unit: "m", core: true, source: USAGE, verification: ok(), version: 1 },
      ],
    },
  ],
  wasteRules: [],
};
