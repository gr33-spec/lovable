import type { Referential } from "../model.js";
import { assumed, DEFINITION_SOURCE, disputed, generic, inPacks, lineQuantity, ok, packaging, rule, spec, todo } from "./kit.js";

/**
 * TIROIR PEINTURE (lot B, paquet 1) : `docs/referentiels/peintre.md` (chapitres 2 à 7) et `referentiels/peinture/
 * tiroir.json`. Jamais un m² ni un litre en vrac : des seaux de 15 L, des sacs, des rouleaux. Les rendements sont
 * ceux des fiches (valeur retenue au chapitre 4) ; couches, pertes et coefficients de support sont des usages « à
 * vérifier ». Questions du comptoir seulement : la finition (mat, velours, satin) et l'impression, quand le devis
 * ne les dit pas ; le nombre de couches et le rendement ne sont jamais demandés.
 */
const USAGE = "usage-peintre";
const PANTEX = "seigneurie-pantex-mat";
const PRACTI_PRIM = "seigneurie-practi-prim";
const TOUPRET_F = "toupret-f";
const PANCRYL = "seigneurie-pancryl";
const TDV = "toile-de-verre-formats";
const COLLE_TDV = "zolpan-quelyd-tdv";
const PAPIER = "papier-peint-standard";
const COLLE_PP = "colle-papier-intisse";

/** Finition : mat, velours ou satin (le comptoir la demande, §47.8) ; lue au devis quand il la dit. */
const ASPECT = {
  key: "aspect",
  label: "Finition",
  unit: "u",
  kind: "site_data" as const,
  question: "Quelle finition : mat, velours ou satin ?",
  choices: [
    { label: "Mat", value: "1" },
    { label: "Velours", value: "2" },
    { label: "Satin", value: "3" },
  ],
  display: { "1": "mate", "2": "velours", "3": "satinée" },
  textValues: [
    { value: "3", keywords: ["satin", "satine", "satinee"] },
    { value: "2", keywords: ["velours", "veloute"] },
    { value: "1", keywords: ["mat", "mate"] },
  ],
};
const IMPRESSION = {
  key: "impression",
  label: "Impression",
  unit: "u",
  kind: "site_data" as const,
  question: "Une couche d'impression : oui ou non ?",
  choices: [
    { label: "Oui", value: "1" },
    { label: "Non", value: "0" },
  ],
  display: { "1": "oui", "0": "non" },
  textValues: [
    { value: "0", keywords: ["sans impression", "sans sous-couche"] },
    {
      value: "1",
      keywords: ["impression", "sous-couche", "sous couche", "primaire", "couche d'accrochage"],
    },
  ],
};
const COUCHES = assumed(
  "couches",
  "Couches de finition",
  "u",
  "2",
  USAGE,
  todo(),
  "2 couches (NF DTU 59.1, finition B)",
  [
    { label: "1", value: "1" },
    { label: "2", value: "2" },
    { label: "3", value: "3" },
  ],
  {
    textValues: [
      { value: "1", keywords: ["monocouche", "1 couche", "une couche"] },
      { value: "3", keywords: ["3 couches", "trois couches"] },
      { value: "2", keywords: ["2 couches", "deux couches"] },
    ],
  },
);
/** Rendement de la finition selon l'aspect (m²/L, valeur retenue des fiches, chapitre 4.1 et 4.3). */
const RENDEMENT = {
  label: "rendement de la finition",
  unit: "m2/l",
  axes: [{ param: "aspect", thresholds: ["1", "2", "3"] }],
  values: [["10"], ["9"], ["12"]],
  source: PANTEX,
  verification: ok("Pantex mat 9 à 12 m²/L (retenu 10) ; Practi Velours 8 à 10 (9) ; satin acrylique 11 à 13 (12)."),
  version: 1,
};
const PERTE_ROULEAU = rule("1.05", "1", USAGE, todo("Perte au rouleau (§5.3)."), "peinture +5 % au rouleau");

const seau15 = (source: string, verification = ok()) => inPacks("seau", "seau de 15 L", "seaux de 15 L", packaging("15", "l", source, verification));

export const PEINTURE_REFERENTIAL: Referential = {
  id: "peinture",
  version: "peinture-2026.10.06-2",
  trade: "painting",
  sources: [
    DEFINITION_SOURCE,
    {
      id: USAGE,
      kind: "trade_practice",
      title: "Référentiel quantitatif peintre (docs/referentiels/peintre.md), usages à valider par un peintre",
      documentRef: "docs/referentiels/peintre.md",
      retrievedAt: "2026-10-04",
    },
    {
      id: PANTEX,
      kind: "manufacturer",
      title: "Seigneurie Pantex Mat : 9 à 12 m²/L, 1 - 5 - 15 L",
      url: "https://seigneurie.com/peintures-peintures-interieures-peintures-murs-plafonds-pantex-bas-carbone-mat-blanc-1l",
      retrievedAt: "2026-10-04",
    },
    {
      id: PRACTI_PRIM,
      kind: "manufacturer",
      title: "Seigneurie Practi Prim : 8 à 10 m²/L, 5 - 15 L",
      url: "https://seigneurie.com/nos-produits/peintures-interieures/impressions/practi-prim-blanc-15l",
      retrievedAt: "2026-10-04",
    },
    {
      id: TOUPRET_F,
      kind: "manufacturer",
      title: "Toupret F : 25 kg = 60 à 75 m² par passe",
      url: "https://toupret.com/fr/enduit-professionnels/produit/enduits-de-lissage/toupret-f-enduit-de-finition",
      retrievedAt: "2026-10-04",
    },
    {
      id: PANCRYL,
      kind: "manufacturer",
      title: "Seigneurie Pancryl (D2) : 6 à 9 m²/L, 1 - 5 - 15 L",
      url: "https://seigneurie.com/nos-produits/facades/films-minces-d2/pancryl-blanc-1l",
      retrievedAt: "2026-10-04",
    },
    {
      id: TDV,
      kind: "retailer",
      title: "Toile de verre : rouleaux 1 × 25 m ou 1 × 50 m",
      url: "https://www.brikadeco.com/toile-de-verre/",
      retrievedAt: "2026-10-04",
    },
    {
      id: COLLE_TDV,
      kind: "manufacturer",
      title: "Zolpan Quelyd TDV : 150 à 250 g/m², seaux 5 à 20 kg",
      url: "https://www.zolpan.fr/download/fiche_technique/zol_quelyd_tdv/1/QUELYD+Tdv-fiche_technique.pdf",
      retrievedAt: "2026-10-04",
    },
    {
      id: PAPIER,
      kind: "retailer",
      title: "Papier peint standard : rouleau 10,05 × 0,53 m",
      url: "https://www.leroymerlin.fr/produits/papier-peint-intisse-vintage-gris-84709436.html",
      retrievedAt: "2026-10-04",
    },
    {
      id: COLLE_PP,
      kind: "retailer",
      title: "Colle papier peint intissé prête à l'emploi : 150 à 200 g/m², seaux de 5 et 10 kg (tiroir peinture)",
      documentRef: "referentiels/peinture/tiroir.json",
      retrievedAt: "2026-10-04",
    },
  ],
  families: [
    {
      code: "paint_work",
      label: "Peinture murs et plafonds",
      needUnit: "m2",
      attributes: [],
      keyAttributes: [],
      keywords: [
        "peinture murs",
        "peinture des murs",
        "peinture plafond",
        "peinture des plafonds",
        "peinture murs et plafonds",
        "mise en peinture",
        "peinture acrylique",
        "peinture mate",
        "peinture velours",
        "peinture satinee",
        "peinture interieure",
        "peinture",
      ],
    },
    {
      code: "coating_work",
      label: "Enduit de lissage",
      needUnit: "m2",
      attributes: [],
      keyAttributes: [],
      keywords: ["enduit de lissage", "ratissage", "enduisage", "enduit", "lissage"],
    },
    {
      code: "glassfibre_work",
      label: "Toile de verre",
      needUnit: "m2",
      attributes: [],
      keyAttributes: [],
      keywords: ["toile de verre", "fibre de verre", "voile de verre", "intisse a peindre"],
    },
    {
      code: "wallpaper_work",
      label: "Papier peint",
      needUnit: "m2",
      attributes: [],
      keyAttributes: [],
      keywords: ["papier peint", "tapisserie", "papier intisse"],
    },
    {
      code: "facade_work",
      label: "Peinture de façade",
      needUnit: "m2",
      attributes: [],
      keyAttributes: [],
      keywords: ["ravalement", "peinture facade", "peinture de facade", "facade d2", "pliolite", "siloxane"],
    },
    { code: "paint", label: "Peinture", needUnit: "l", attributes: [], keyAttributes: [] },
    { code: "primer_paint", label: "Impression", needUnit: "l", attributes: [], keyAttributes: [] },
    { code: "filler", label: "Enduit", needUnit: "kg", attributes: [], keyAttributes: [] },
    { code: "glassfibre", label: "Toile de verre", needUnit: "m2", attributes: [], keyAttributes: [] },
    {
      code: "wallpaper",
      label: "Papier peint",
      needUnit: "u",
      attributes: [
        { key: "longueur", label: "Longueur d'un rouleau", unit: "m" },
        { key: "largeur", label: "Largeur d'un rouleau", unit: "m" },
      ],
      keyAttributes: [],
    },
    { code: "wall_glue", label: "Colle murale", needUnit: "kg", attributes: [], keyAttributes: [] },
    { code: "facade_paint", label: "Peinture façade", needUnit: "l", attributes: [], keyAttributes: [] },
    { code: "moss_killer", label: "Anti-mousse", needUnit: "l", attributes: [], keyAttributes: [] },
  ],
  products: [
    generic(
      "peinture-acrylique-15",
      "paint",
      "Peinture acrylique murs et plafonds, blanc, seau de 15 L",
      "Peinture acrylique blanc, seau 15 L",
      seau15(PANTEX),
    ),
    generic(
      "impression-15",
      "primer_paint",
      "Impression acrylique murs et plafonds (type Practi Prim), seau de 15 L",
      "Impression acrylique, seau 15 L",
      seau15(PRACTI_PRIM),
    ),
    generic(
      "enduit-lissage-25",
      "filler",
      "Enduit de lissage poudre (type Toupret F), sac de 25 kg",
      "Enduit de lissage poudre, sac 25 kg",
      inPacks("sac", "sac de 25 kg", "sacs de 25 kg", packaging("25", "kg", TOUPRET_F, ok("Sac 15 - 25 kg (fiche Toupret F)."))),
    ),
    generic(
      "toile-verre-50",
      "glassfibre",
      "Toile de verre à peindre, rouleau de 1 × 50 m",
      "Toile de verre, rouleau 50 m²",
      inPacks("rouleau", "rouleau de 50 m²", "rouleaux de 50 m²", packaging("50", "m2", TDV, ok("Rouleau 1 × 50 m."))),
    ),
    generic(
      "colle-tdv-20",
      "wall_glue",
      "Colle toile de verre prête à l'emploi, seau de 20 kg",
      "Colle toile de verre, seau 20 kg",
      inPacks("seau", "seau de 20 kg", "seaux de 20 kg", packaging("20", "kg", COLLE_TDV, ok("Seaux 5 - 10 - 15 - 20 kg (fiche Zolpan)."))),
    ),
    generic(
      "papier-peint-1005",
      "wallpaper",
      "Papier peint intissé, rouleau de 10,05 × 0,53 m",
      "Papier peint, rouleau 10,05 × 0,53 m",
      [
        {
          id: "rouleau",
          label: { one: "rouleau", many: "rouleaux" },
          contains: packaging("1", "u", "definition", ok()),
          primary: true,
        },
      ],
      {
        attributes: {
          longueur: spec("10.05", "m", PAPIER, ok()),
          largeur: spec("0.53", "m", PAPIER, ok()),
        },
      },
    ),
    generic(
      "colle-papier-10",
      "wall_glue",
      "Colle papier peint intissé prête à l'emploi, seau de 10 kg",
      "Colle papier peint intissé, seau 10 kg",
      inPacks("seau", "seau de 10 kg", "seaux de 10 kg", packaging("10", "kg", COLLE_PP, ok("Seaux de 5 et 10 kg."))),
    ),
    generic(
      "peinture-facade-15",
      "facade_paint",
      "Peinture de façade D2 (type Pancryl), blanc, seau de 15 L",
      "Peinture façade D2 blanc, seau 15 L",
      seau15(PANCRYL),
    ),
    generic(
      "anti-mousse-5",
      "moss_killer",
      "Traitement anti-mousse façade, bidon de 5 L",
      "Anti-mousse façade, bidon 5 L",
      inPacks("bidon", "bidon de 5 L", "bidons de 5 L", packaging("5", "l", USAGE, ok("Bidons 1, 5, 20 ou 30 L (tiroir peinture)."))),
      { aliases: ["anti-mousse", "antimousse", "demoussage"] },
    ),
  ],
  workItems: [
    {
      id: "peinture-murs-plafonds",
      trade: "painting",
      section: "principal",
      label: "Peinture murs et plafonds (impression, finition)",
      triggers: ["paint_work"],
      params: [lineQuantity("surface", "Surface à peindre", "m2", "Surface à peindre ?"), ASPECT, IMPRESSION, COUCHES],
      slots: [
        {
          key: "murs",
          family: "paint_work",
          label: "Peinture",
          measureOnly: true,
        },
        {
          key: "finition", formOf: "murs",
          family: "paint",
          label: "Peinture de finition",
          usual: {
            text: "Peinture acrylique blanche en seau de 15 L.",
            source: PANTEX,
            productId: "peinture-acrylique-15",
          },
        },
        {
          key: "impression",
          family: "primer_paint",
          label: "Impression",
          usual: {
            text: "Impression acrylique en seau de 15 L, 9 m²/L.",
            source: PRACTI_PRIM,
            productId: "impression-15",
          },
        },
      ],
      constants: { perte: PERTE_ROULEAU, rendement_impression: rule("9", "m2/l", PRACTI_PRIM, ok("Practi Prim 8 à 10 m²/L, retenu 9."), "impression {v}") },
      tables: { rendement: RENDEMENT },
      needs: [
        {
          id: "finition",
          slot: "finition",
          formula: "surface * couches / table.rendement * regle.perte",
          unit: "l",
          core: true,
          designation: "Peinture acrylique {aspect} blanche, seau de 15 L",
          precisionRequires: ["aspect"],
          precision: "même teinte, même lot",
          source: PANTEX,
          verification: ok(),
          version: 1,
        },
        {
          id: "impression",
          slot: "impression",
          formula: "surface / regle.rendement_impression * regle.perte",
          unit: "l",
          core: true,
          when: "impression >= 1",
          source: PRACTI_PRIM,
          verification: ok(),
          version: 1,
        },
      ],
    },
    {
      id: "enduit-lissage",
      trade: "painting",
      label: "Enduit de lissage",
      triggers: ["coating_work"],
      params: [
        lineQuantity("surface", "Surface à enduire", "m2", "Surface à enduire ?"),
        assumed(
          "passes",
          "Passes d'enduit",
          "u",
          "1",
          USAGE,
          todo(),
          "1 passe générale (finition B)",
          [
            { label: "1 passe", value: "1" },
            { label: "2 passes", value: "2" },
          ],
          { textValues: [{ value: "2", keywords: ["2 passes", "deux passes"] }] },
        ),
      ],
      slots: [
        {
          key: "enduit_murs",
          family: "coating_work",
          label: "Enduit",
          measureOnly: true,
        },
        {
          key: "enduit", formOf: "enduit_murs",
          family: "filler",
          label: "Enduit de lissage",
          usual: {
            text: "Enduit de lissage poudre en sac de 25 kg.",
            source: TOUPRET_F,
            productId: "enduit-lissage-25",
          },
        },
      ],
      constants: {
        enduit_par_passe: rule("0.4", "kg/m2", TOUPRET_F, ok("25 kg pour 60 à 75 m² par passe (fiche Toupret F)."), "enduit {v} par passe"),
        perte_enduit: rule("1.1", "1", USAGE, todo("Perte d'enduit (§5.3)."), "enduit +10 %"),
      },
      needs: [
        {
          id: "enduit",
          slot: "enduit",
          formula: "surface * passes * regle.enduit_par_passe * regle.perte_enduit",
          unit: "kg",
          core: true,
          source: TOUPRET_F,
          verification: ok(),
          version: 1,
        },
      ],
    },
    {
      id: "toile-de-verre",
      trade: "painting",
      label: "Toile de verre à peindre (toile, colle)",
      triggers: ["glassfibre_work"],
      params: [lineQuantity("surface", "Surface de toile", "m2", "Surface de toile ?")],
      slots: [
        {
          key: "toile_murs",
          family: "glassfibre_work",
          label: "Toile de verre",
          measureOnly: true,
        },
        {
          key: "toile", formOf: "toile_murs",
          family: "glassfibre",
          label: "Toile de verre",
          usual: {
            text: "Toile de verre en rouleau de 50 m².",
            source: TDV,
            productId: "toile-verre-50",
          },
        },
        {
          key: "colle",
          family: "wall_glue",
          label: "Colle toile de verre",
          keywords: ["colle"],
          usual: {
            text: "Colle toile de verre prête à l'emploi, seau de 20 kg.",
            source: COLLE_TDV,
            productId: "colle-tdv-20",
          },
        },
      ],
      constants: {
        perte_toile: rule("1.1", "1", USAGE, todo("Lés et coupes (§5.6)."), "toile +10 % de lés"),
        colle_par_m2: rule("0.22", "kg/m2", COLLE_TDV, ok("150 à 250 g/m² (fiche Quelyd TDV), retenu 0,22."), "colle {v}"),
        perte_colle: rule("1.1", "1", USAGE, todo("Perte de colle (§5.3)."), "colle +10 %"),
      },
      needs: [
        {
          id: "toile",
          slot: "toile",
          formula: "surface * regle.perte_toile",
          unit: "m2",
          core: true,
          source: TDV,
          verification: ok(),
          version: 1,
        },
        {
          id: "colle",
          slot: "colle",
          formula: "surface * regle.colle_par_m2 * regle.perte_colle",
          unit: "kg",
          core: true,
          source: COLLE_TDV,
          verification: ok(),
          version: 1,
        },
      ],
    },
    {
      id: "papier-peint",
      trade: "painting",
      label: "Papier peint (rouleaux, colle)",
      triggers: ["wallpaper_work"],
      params: [
        lineQuantity("surface", "Surface tapissée", "m2", "Surface tapissée ?"),
        assumed(
          "hauteur",
          "Hauteur des murs",
          "m",
          "2.5",
          USAGE,
          todo(),
          "hauteur sous plafond courante",
          [
            { label: "2,50 m", value: "2.5" },
            { label: "2,70 m", value: "2.7" },
            { label: "3 m", value: "3" },
          ],
          { textLabels: ["hauteur", "hsp"] },
        ),
      ],
      slots: [
        {
          key: "murs_papier",
          family: "wallpaper_work",
          label: "Papier peint",
          measureOnly: true,
        },
        {
          key: "papier", formOf: "murs_papier",
          family: "wallpaper",
          label: "Papier peint",
          usual: {
            text: "Rouleau standard 10,05 × 0,53 m, uni.",
            source: PAPIER,
            productId: "papier-peint-1005",
          },
        },
        {
          key: "colle",
          family: "wall_glue",
          label: "Colle papier peint",
          usual: {
            text: "Colle papier peint intissé, seau de 10 kg.",
            source: COLLE_PP,
            productId: "colle-papier-10",
          },
        },
      ],
      constants: {
        marge_coupe: rule("0.1", "m", USAGE, ok("10 cm de coupe par lé (méthode courante, §5.5)."), "10 cm de coupe par lé"),
        colle_par_m2: rule("0.2", "kg/m2", COLLE_PP, ok("150 à 200 g/m²."), "colle {v}"),
      },
      derived: [
        {
          key: "les",
          label: "Lés à poser",
          unit: "u",
          formula: "arrondi_sup(surface / hauteur / papier.largeur)",
          shown: true,
          source: PAPIER,
          verification: ok(),
          version: 1,
        },
      ],
      needs: [
        {
          id: "papier",
          slot: "papier",
          formula: "arrondi_sup(les / arrondi_inf(papier.longueur / (hauteur + regle.marge_coupe)))",
          unit: "u",
          core: true,
          precision: "uni, sans raccord",
          source: PAPIER,
          verification: ok(),
          version: 1,
        },
        { id: "colle", slot: "colle", formula: "surface * regle.colle_par_m2", unit: "kg", core: true, source: COLLE_PP, verification: ok(), version: 1 },
      ],
    },
    {
      id: "facade-d2",
      trade: "painting",
      section: "principal",
      label: "Peinture de façade D2 (démoussage, deux couches)",
      triggers: ["facade_work"],
      params: [lineQuantity("surface", "Surface de façade", "m2", "Surface de façade ?")],
      slots: [
        {
          key: "facade",
          family: "facade_work",
          label: "Façade",
          measureOnly: true,
        },
        {
          key: "peinture", formOf: "facade",
          family: "facade_paint",
          label: "Peinture façade",
          usual: {
            text: "Peinture façade D2 en seau de 15 L, 7 m²/L.",
            source: PANCRYL,
            productId: "peinture-facade-15",
          },
        },
        {
          key: "antimousse",
          family: "moss_killer",
          label: "Anti-mousse",
          usual: {
            text: "Anti-mousse en bidon de 5 L, une passe.",
            source: USAGE,
            productId: "anti-mousse-5",
          },
        },
      ],
      constants: {
        couches_facade: rule("2", "u", USAGE, ok("2 couches de finition (NF DTU 42.1, §5.7)."), "{v} couches"),
        rendement_facade: rule("7", "m2/l", PANCRYL, ok("Pancryl 6 à 9 m²/L, retenu 7."), "façade {v}"),
        relief: rule("0.85", "1", USAGE, todo("Enduit gratté ou taloché (§5.3)."), "relief de l'enduit −15 % de rendement"),
        perte: PERTE_ROULEAU,
        rendement_antimousse: disputed("4", "m2/l", USAGE, "anti-mousse {v}", "3 à 5 m²/L selon les fiches (5 courant)."),
      },
      needs: [
        {
          id: "peinture",
          slot: "peinture",
          formula: "surface * regle.couches_facade / (regle.rendement_facade * regle.relief) * regle.perte",
          unit: "l",
          core: true,
          source: PANCRYL,
          verification: ok(),
          version: 1,
        },
        {
          id: "antimousse",
          slot: "antimousse",
          formula: "surface / regle.rendement_antimousse",
          unit: "l",
          core: true,
          source: USAGE,
          verification: ok(),
          version: 1,
        },
      ],
    },
  ],
  wasteRules: [],
};
