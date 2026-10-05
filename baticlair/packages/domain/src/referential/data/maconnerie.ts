import type { Product, Referential } from "../model.js";
import { assumed, byPiece, DEFINITION_SOURCE, disputed, generic, inPacks, lineQuantity, ok, packaging, rule, spec, todo } from "./kit.js";

/**
 * TIROIR MAÇONNERIE (lot B, paquet 1) : `docs/referentiels/maconnerie.md` (chapitres 2 à 7) et `referentiels/
 * maconnerie/tiroir.json`. Les blocs à l'unité (palette en ordre de grandeur), le mortier et l'enduit en sacs, le
 * béton en m³, le treillis au panneau, le film en rouleaux. Question du comptoir seulement : le bloc (creux de 20,
 * 15 ou 10) quand le devis ne le dit pas ; épaisseurs de dalle et de chape, section de semelle : hypothèses dites.
 */
const USAGE = "usage-macon";
const GGI = "ggi-blocs-b40";
const VICAT_PRO300 = "vicat-mortier-pro-300";
const POROTHERM = "wienerberger-porotherm-r20";
const WEBER_MORTIER = "weber-mortier";
const WEBERLITE = "weberlite-f";
const ADETS = "adets-st25c";
const TIROIR = "tiroir-maconnerie-2026-10-04";

/** Bloc béton creux B40 (NF EN 771-3) : 10 blocs par m², palette selon l'épaisseur (fiches GGI et Fabemi). */
function block(ep: number, palette: string, aliases: string[]): Product {
  return generic(
    `bloc-creux-${ep}`,
    "masonry_block",
    `Bloc béton creux B40 50 × ${ep} × 20 cm`,
    `Blocs béton creux de ${ep} (50×20)`,
    [
      {
        id: "piece",
        label: { one: "bloc", many: "blocs" },
        contains: packaging("1", "u", "definition", ok()),
        primary: true,
      },
      {
        id: "palette",
        label: { one: `palette de ${palette}`, many: `palettes de ${palette}` },
        contains: packaging(palette, "u", GGI, ok(`Palette de ${palette} blocs (fiches GGI, Fabemi).`)),
      },
    ],
    {
      aliases: [`parpaing de ${ep}`, `parpaings de ${ep}`, `agglo ${ep}`, `agglo de ${ep}`, `bloc de ${ep}`, `blocs de ${ep}`, `${ep}x20x50`, `50x${ep}x20`],
      attributes: {
        par_m2: spec("10", "u/m2", GGI, ok("Bloc 50 × 20 : 10 par m² (fiches GGI, Fabemi).")),
      },
    },
  );
}

const SAC = (kg: string, source: string, note: string) => inPacks("sac", `sac de ${kg} kg`, `sacs de ${kg} kg`, packaging(kg, "kg", source, ok(note)));

export const MACONNERIE_REFERENTIAL: Referential = {
  id: "maconnerie",
  version: "maconnerie-2026.10.05-1",
  trade: "masonry",
  sources: [
    DEFINITION_SOURCE,
    {
      id: USAGE,
      kind: "trade_practice",
      title: "Référentiel quantitatif maçonnerie (docs/referentiels/maconnerie.md), usages à valider par un maçon",
      documentRef: "docs/referentiels/maconnerie.md",
      retrievedAt: "2026-10-03",
    },
    {
      id: TIROIR,
      kind: "retailer",
      title: "Tiroir maçonnerie : valeurs relevées sur les fiches fabricant et négoce",
      documentRef: "referentiels/maconnerie/tiroir.json",
      retrievedAt: "2026-10-04",
    },
    {
      id: GGI,
      kind: "manufacturer",
      title: "Blocs béton creux B40 (GGI MC20L, Fabemi) : 10 u/m², palettes 70 à 120",
      url: "https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_19568.pdf",
      retrievedAt: "2026-10-03",
    },
    {
      id: VICAT_PRO300,
      kind: "manufacturer",
      title: "Vicat Mortier Pro 300 : 35 kg/m² de mur en blocs creux, sac 35 kg",
      url: "https://www.vpi.vicat.fr/content/download/11500/96933/version/8/file/FT+MORTIER+PRO+300+_+06.2023.pdf",
      retrievedAt: "2026-10-03",
    },
    {
      id: POROTHERM,
      kind: "manufacturer",
      title: "Wienerberger Porotherm R20 : 8 u/m², joint mince ≈ 1,8 kg/m²",
      url: "https://documentacion.generadordeprecios.info/documentaciontecnica/wienerberger/wienerb_poro_r20.pdf",
      retrievedAt: "2026-10-03",
    },
    {
      id: WEBER_MORTIER,
      kind: "manufacturer",
      title: "weber mortier : 20 kg/m² par cm, sac 25 kg",
      url: "https://www.cmesmat.fr/media/catalog/product/attributes/7/s/7sAl7oLpmh8ON14Ve8pHXzBAXDnYR8ACKrzYZx8ga2g4_AbrwKdFXcAKtWjzdjRWIt_YuFhG7Q3b7qSYEA8xuQ==.pdf",
      retrievedAt: "2026-10-03",
    },
    {
      id: WEBERLITE,
      kind: "manufacturer",
      title: "weberlite F (monocouche OC2) : 18 à 23 kg/m², sac 25 kg",
      url: "https://medias.groupe-samse.fr/Fiche_technique/Fiche_technique_1111341.pdf",
      retrievedAt: "2026-10-03",
    },
    {
      id: ADETS,
      kind: "manufacturer",
      title: "ADETS, treillis soudé ST25C : panneau 6,00 × 2,40 m",
      url: "https://cdn.chausson.fr/catalog-document/a4d6953b-a95d-4465-b3f3-fdec9e12773f/ft-2-20171130-100049-1.pdf",
      retrievedAt: "2026-10-03",
    },
  ],
  families: [
    {
      code: "block_wall_work",
      label: "Mur en blocs béton",
      needUnit: "m2",
      attributes: [],
      keyAttributes: [],
      keywords: ["parpaing", "parpaings", "agglo", "bloc beton", "blocs beton", "bloc creux", "blocs creux", "mur en blocs"],
    },
    {
      code: "brick_wall_work",
      label: "Mur en brique",
      needUnit: "m2",
      attributes: [],
      keyAttributes: [],
      keywords: ["porotherm", "brique rectifiee", "brique r20", "monomur", "biobric", "mur en brique", "mur en briques", "brique de 20"],
    },
    {
      code: "slab_work",
      label: "Dallage sur terre-plein",
      needUnit: "m2",
      attributes: [],
      keyAttributes: [],
      keywords: ["dallage", "dalle beton", "dalle de garage", "dalle sur terre-plein", "dalle armee", "dalle sur herisson"],
    },
    { code: "screed_work", label: "Chape", needUnit: "m2", attributes: [], keyAttributes: [], keywords: ["chape ciment", "chape"] },
    {
      code: "render_work",
      label: "Enduit de façade",
      needUnit: "m2",
      attributes: [],
      keyAttributes: [],
      keywords: ["enduit monocouche", "enduit de facade", "enduit facade", "crepi", "enduit gratte", "enduit projete"],
    },
    {
      code: "footing_work",
      label: "Semelle filante",
      needUnit: "ml",
      attributes: [],
      keyAttributes: [],
      keywords: ["semelle filante", "semelles filantes", "fondations", "fondation", "semelle"],
    },
    { code: "masonry_block", label: "Bloc béton", needUnit: "u", attributes: [{ key: "par_m2", label: "Blocs par m²", unit: "u/m2" }], keyAttributes: [] },
    { code: "clay_brick", label: "Brique", needUnit: "u", attributes: [], keyAttributes: [] },
    { code: "masonry_mortar", label: "Mortier de montage", needUnit: "kg", attributes: [], keyAttributes: [] },
    { code: "thin_mortar", label: "Mortier joint mince", needUnit: "kg", attributes: [], keyAttributes: [] },
    { code: "concrete", label: "Béton", needUnit: "m3", attributes: [], keyAttributes: [] },
    { code: "hardcore", label: "Hérisson", needUnit: "t", attributes: [], keyAttributes: [] },
    { code: "poly_film", label: "Film polyane", needUnit: "m2", attributes: [], keyAttributes: [] },
    { code: "mesh", label: "Treillis soudé", needUnit: "u", attributes: [], keyAttributes: [] },
    { code: "screed_mortar", label: "Mortier de chape", needUnit: "kg", attributes: [], keyAttributes: [] },
    { code: "render", label: "Enduit monocouche", needUnit: "kg", attributes: [], keyAttributes: [] },
    { code: "rebar_cage", label: "Armature de semelle", needUnit: "u", attributes: [], keyAttributes: [] },
  ],
  products: [
    block(20, "70", ["agglo 20", "parpaing 20"]),
    block(15, "70", ["agglo 15", "parpaing 15"]),
    block(10, "120", ["agglo 10", "parpaing 10"]),
    generic(
      "porotherm-r20",
      "clay_brick",
      "Brique rectifiée Porotherm R20 (500 × 200 × 249)",
      "Briques rectifiées R20",
      [
        {
          id: "piece",
          label: { one: "brique", many: "briques" },
          contains: packaging("1", "u", "definition", ok()),
          primary: true,
        },
        { id: "palette", label: { one: "palette de 60", many: "palettes de 60" }, contains: packaging("60", "u", POROTHERM, ok()) },
      ],
      { aliases: ["porotherm r20", "r20", "brique r20"] },
    ),
    generic(
      "mortier-pro-35",
      "masonry_mortar",
      "Mortier de montage prêt à gâcher (type Vicat Pro 300), sac de 35 kg",
      "Mortier de montage, sac 35 kg",
      SAC("35", VICAT_PRO300, "Sac 35 kg, palette 42."),
      { aliases: ["mortier"] },
    ),
    generic(
      "mortier-joint-mince-25",
      "thin_mortar",
      "Mortier joint mince pour brique rectifiée, sac de 25 kg",
      "Mortier joint mince, sac 25 kg",
      SAC("25", TIROIR, "Sac de 25 kg (Porotherm)."),
    ),
    generic(
      "beton-c25",
      "concrete",
      "Béton prêt à l'emploi C25/30, livré toupie",
      "Béton C25/30 (toupie)",
      [
        {
          id: "m3",
          label: { one: "m³", many: "m³" },
          contains: packaging("1", "m3", "definition", ok()),
          primary: true,
        },
      ],
      { aliases: ["beton c25/30", "bpe"] },
    ),
    generic(
      "herisson-20-40",
      "hardcore",
      "Hérisson 20/40, big-bag d'1 t",
      "Hérisson 20/40, big-bag 1 t",
      inPacks("bigbag", "big-bag d'1 t", "big-bags d'1 t", packaging("1", "t", TIROIR, ok("Big-bag 1 m³ de 20/40 = 1 500 kg (Cemex) : livré à la tonne."))),
    ),
    generic(
      "polyane-150",
      "poly_film",
      "Film polyéthylène 150 µm, rouleau 4 × 25 m",
      "Film polyane 150 µm, rouleau 100 m²",
      inPacks(
        "rouleau",
        "rouleau de 100 m²",
        "rouleaux de 100 m²",
        packaging("100", "m2", TIROIR, ok("Rouleau 4 × 25 m (100 m²), 150 µm minimum (DTU 13.3).")),
      ),
    ),
    generic("treillis-st25c", "mesh", "Treillis soudé ST25C, panneau 6,00 × 2,40 m", "Treillis soudé ST25C 6,00 × 2,40", byPiece("panneau", "panneaux"), {
      aliases: ["st25c", "st 25 c", "st25"],
    }),
    generic(
      "mortier-chape-25",
      "screed_mortar",
      "Mortier de chape (type weber mortier), sac de 25 kg",
      "Mortier de chape, sac 25 kg",
      SAC("25", WEBER_MORTIER, "Sac 25 kg, palette 48."),
    ),
    generic(
      "enduit-monocouche-25",
      "render",
      "Enduit de façade monocouche OC2 (type weberlite F), sac de 25 kg",
      "Enduit monocouche OC2, sac 25 kg",
      SAC("25", WEBERLITE, "Sac 25 kg, palette 48."),
      { aliases: ["monocouche"] },
    ),
    generic(
      "armature-semelle-6m",
      "rebar_cage",
      "Armature de semelle filante préfabriquée, élément de 6 m",
      "Armatures de semelle, éléments 6 m",
      byPiece("élément de 6 m", "éléments de 6 m"),
    ),
  ],
  workItems: [
    {
      id: "mur-blocs",
      trade: "masonry",
      section: "principal",
      label: "Mur en blocs béton (blocs, mortier)",
      triggers: ["block_wall_work"],
      params: [lineQuantity("surface", "Surface de mur", "m2", "Surface de mur ?")],
      slots: [
        {
          key: "mur",
          family: "block_wall_work",
          label: "Mur en blocs",
          measureOnly: true,
        },
        { key: "bloc", family: "masonry_block", label: "Blocs béton", keywords: ["parpaing", "agglo", "bloc"], ask: "Parpaings de 20, de 15 ou de 10 ?" },
        {
          key: "mortier",
          family: "masonry_mortar",
          label: "Mortier de montage",
          usual: {
            text: "Mortier prêt à gâcher en sac de 35 kg.",
            source: VICAT_PRO300,
            productId: "mortier-pro-35",
          },
        },
      ],
      constants: {
        perte_blocs: rule("1.05", "1", USAGE, todo("Perte blocs 5 % (§5.2, à valider)."), "blocs +5 % de casse"),
        mortier_par_m2: rule("35", "kg/m2", VICAT_PRO300, ok("35 kg/m² de mur en blocs creux (fiche Vicat Pro 300)."), "mortier {v}"),
        perte_mortier: rule("1.1", "1", USAGE, todo("Perte mortier 10 % (§5.2)."), "mortier +10 %"),
      },
      needs: [
        {
          id: "blocs",
          slot: "bloc",
          formula: "surface * bloc.par_m2 * regle.perte_blocs",
          unit: "u",
          core: true,
          precision: "palettes avec blocs d'angle et de coupe",
          source: GGI,
          verification: ok(),
          version: 1,
        },
        {
          id: "mortier",
          slot: "mortier",
          formula: "surface * regle.mortier_par_m2 * regle.perte_mortier",
          unit: "kg",
          core: true,
          source: VICAT_PRO300,
          verification: ok(),
          version: 1,
        },
      ],
    },
    {
      id: "mur-brique",
      trade: "masonry",
      section: "principal",
      label: "Mur en brique rectifiée (briques, joint mince)",
      triggers: ["brick_wall_work"],
      params: [lineQuantity("surface", "Surface de mur", "m2", "Surface de mur ?")],
      slots: [
        {
          key: "mur",
          family: "brick_wall_work",
          label: "Mur en brique",
          measureOnly: true,
        },
        {
          key: "brique",
          family: "clay_brick",
          label: "Briques",
          usual: {
            text: "Brique rectifiée R20, 8 par m².",
            source: POROTHERM,
            productId: "porotherm-r20",
          },
        },
        {
          key: "mortier",
          family: "thin_mortar",
          label: "Mortier joint mince",
          usual: {
            text: "Mortier joint mince en sac de 25 kg.",
            source: TIROIR,
            productId: "mortier-joint-mince-25",
          },
        },
      ],
      constants: {
        briques_par_m2: rule("8", "u/m2", POROTHERM, ok("Porotherm R20 : 8 par m²."), "{v} briques"),
        perte_briques: rule("1.05", "1", USAGE, todo("Perte briques 5 % (§5.2)."), "briques +5 % de casse"),
        joint_par_m2: rule("1.8", "kg/m2", POROTHERM, ok("Joint mince ≈ 1,8 kg/m² (fiche R20)."), "joint mince {v}"),
        perte_mortier: rule("1.1", "1", USAGE, todo("Perte mortier 10 % (§5.2)."), "mortier +10 %"),
      },
      needs: [
        {
          id: "briques",
          slot: "brique",
          formula: "surface * regle.briques_par_m2 * regle.perte_briques",
          unit: "u",
          core: true,
          source: POROTHERM,
          verification: ok(),
          version: 1,
        },
        {
          id: "mortier",
          slot: "mortier",
          formula: "surface * regle.joint_par_m2 * regle.perte_mortier",
          unit: "kg",
          core: true,
          source: POROTHERM,
          verification: ok(),
          version: 1,
        },
      ],
    },
    {
      id: "dallage",
      trade: "masonry",
      section: "principal",
      label: "Dallage sur terre-plein (hérisson, film, treillis, béton)",
      triggers: ["slab_work"],
      params: [
        lineQuantity("surface", "Surface de dallage", "m2", "Surface de dallage ?"),
        assumed(
          "epaisseur",
          "Épaisseur du dallage",
          "cm",
          "12",
          USAGE,
          ok("NF DTU 13.3 : 12 cm minimum en maison individuelle."),
          "12 cm, minimum en maison individuelle (NF DTU 13.3)",
          [
            { label: "10 cm", value: "10" },
            { label: "12 cm", value: "12" },
            { label: "15 cm", value: "15" },
          ],
          { textLabels: ["epaisseur", "ep."] },
        ),
      ],
      slots: [
        {
          key: "dalle",
          family: "slab_work",
          label: "Dallage",
          measureOnly: true,
        },
        {
          key: "herisson",
          family: "hardcore",
          label: "Hérisson",
          usual: {
            text: "Hérisson 20/40 sur 20 cm.",
            source: USAGE,
            productId: "herisson-20-40",
          },
        },
        {
          key: "film",
          family: "poly_film",
          label: "Film polyane",
          usual: {
            text: "Film polyéthylène 150 µm, rouleau 4 × 25 m.",
            source: TIROIR,
            productId: "polyane-150",
          },
        },
        {
          key: "treillis",
          family: "mesh",
          label: "Treillis soudé",
          usual: {
            text: "Treillis ST25C, panneaux 6,00 × 2,40 m.",
            source: ADETS,
            productId: "treillis-st25c",
          },
        },
        {
          key: "beton",
          family: "concrete",
          label: "Béton",
          usual: {
            text: "Béton C25/30 livré toupie.",
            source: USAGE,
            productId: "beton-c25",
          },
        },
      ],
      constants: {
        epaisseur_herisson: rule("0.2", "m", TIROIR, ok("Hérisson ≈ 20 cm (Cemex)."), "hérisson {v}"),
        densite_herisson: disputed("1.6", "t/m3", USAGE, "hérisson {v}", "1,5 t/m³ (big-bag Cemex) ou 1,6 (référentiel)."),
        perte_herisson: rule("1.1", "1", USAGE, todo("Perte 10 % (§5.5)."), "hérisson +10 %"),
        film_recouvrement: rule("1.15", "1", USAGE, todo("Recouvrements et relevés (§5.5)."), "film +15 % de recouvrements"),
        treillis_utile: rule("11.8", "m2", USAGE, todo("6,00 × 2,40 moins une maille et les abouts (§5.5, à valider)."), "treillis {v} utiles par panneau"),
        perte_beton: rule("1.05", "1", USAGE, todo("Perte béton 5 % (§5.5)."), "béton +5 %"),
      },
      needs: [
        {
          id: "herisson",
          slot: "herisson",
          formula: "surface * regle.epaisseur_herisson * regle.densite_herisson * regle.perte_herisson",
          unit: "t",
          core: true,
          source: USAGE,
          verification: ok(),
          version: 1,
        },
        { id: "film", slot: "film", formula: "surface * regle.film_recouvrement", unit: "m2", core: true, source: USAGE, verification: ok(), version: 1 },
        {
          id: "treillis",
          slot: "treillis",
          formula: "arrondi_sup(surface / regle.treillis_utile)",
          unit: "u",
          core: true,
          source: USAGE,
          verification: ok(),
          version: 1,
        },
        {
          id: "beton",
          slot: "beton",
          formula: "surface * epaisseur * regle.perte_beton",
          unit: "m3",
          core: true,
          precision: "livré toupie",
          source: USAGE,
          verification: ok(),
          version: 1,
        },
      ],
    },
    {
      id: "chape",
      trade: "masonry",
      label: "Chape ciment",
      triggers: ["screed_work"],
      params: [
        lineQuantity("surface", "Surface de chape", "m2", "Surface de chape ?"),
        assumed(
          "epaisseur",
          "Épaisseur de chape",
          "cm",
          "5",
          USAGE,
          todo(),
          "5 cm, chape courante",
          [
            { label: "4 cm", value: "4" },
            { label: "5 cm", value: "5" },
            { label: "6 cm", value: "6" },
          ],
          { textLabels: ["epaisseur", "chape"] },
        ),
      ],
      slots: [
        {
          key: "chape_sol",
          family: "screed_work",
          label: "Chape",
          measureOnly: true,
        },
        {
          key: "mortier",
          family: "screed_mortar",
          label: "Mortier de chape",
          usual: {
            text: "Mortier en sac de 25 kg, 20 kg/m² par cm.",
            source: WEBER_MORTIER,
            productId: "mortier-chape-25",
          },
        },
      ],
      constants: {
        mortier_par_m2_cm: rule("2000", "kg/m3", WEBER_MORTIER, ok("20 kg/m² par cm (fiche weber mortier)."), "mortier 20 kg/m² par cm"),
        perte: rule("1.1", "1", USAGE, todo("Perte 10 % (§5.5)."), "chape +10 %"),
      },
      needs: [
        {
          id: "mortier",
          slot: "mortier",
          formula: "surface * epaisseur * regle.mortier_par_m2_cm * regle.perte",
          unit: "kg",
          core: true,
          source: WEBER_MORTIER,
          verification: ok(),
          version: 1,
        },
      ],
    },
    {
      id: "enduit-facade",
      trade: "masonry",
      label: "Enduit de façade monocouche",
      triggers: ["render_work"],
      params: [lineQuantity("surface", "Surface d'enduit", "m2", "Surface d'enduit ?")],
      slots: [
        {
          key: "facade",
          family: "render_work",
          label: "Enduit",
          measureOnly: true,
        },
        {
          key: "enduit",
          family: "render",
          label: "Enduit monocouche",
          usual: {
            text: "Monocouche OC2 en sac de 25 kg, 22 kg/m².",
            source: WEBERLITE,
            productId: "enduit-monocouche-25",
          },
        },
      ],
      constants: {
        enduit_par_m2: rule("22", "kg/m2", WEBERLITE, ok("18 à 23 kg/m² selon la finition (fiche weberlite F), retenu 22."), "enduit {v}"),
        perte: rule("1.1", "1", USAGE, todo("Perte enduit 10 % (§5.6)."), "enduit +10 %"),
      },
      needs: [
        {
          id: "enduit",
          slot: "enduit",
          formula: "surface * regle.enduit_par_m2 * regle.perte",
          unit: "kg",
          core: true,
          precision: "teinte à préciser",
          source: WEBERLITE,
          verification: ok(),
          version: 1,
        },
      ],
    },
    {
      id: "semelle-filante",
      trade: "masonry",
      label: "Semelle filante (béton, armatures)",
      triggers: ["footing_work"],
      params: [
        lineQuantity("longueur", "Longueur de semelle", "m", "Longueur de semelle ?"),
        assumed("largeur", "Largeur de semelle", "cm", "50", USAGE, todo(), "semelle 50 × 25 cm", [
          { label: "40 cm", value: "40" },
          { label: "50 cm", value: "50" },
          { label: "60 cm", value: "60" },
        ]),
        assumed("hauteur", "Hauteur de semelle", "cm", "25", USAGE, todo(), "semelle 50 × 25 cm", [
          { label: "25 cm", value: "25" },
          { label: "30 cm", value: "30" },
        ]),
      ],
      slots: [
        {
          key: "semelle",
          family: "footing_work",
          label: "Semelle",
          measureOnly: true,
        },
        {
          key: "beton",
          family: "concrete",
          label: "Béton",
          usual: {
            text: "Béton C25/30 livré toupie.",
            source: USAGE,
            productId: "beton-c25",
          },
        },
        {
          key: "armature",
          family: "rebar_cage",
          label: "Armatures",
          usual: {
            text: "Armature préfabriquée en éléments de 6 m.",
            source: TIROIR,
            productId: "armature-semelle-6m",
          },
        },
      ],
      constants: {
        perte_fouille: rule("1.1", "1", USAGE, todo("Béton coulé en fouille : 10 % (§5.3)."), "béton +10 % en fouille"),
        longueur_element: rule("6", "m", TIROIR, ok("Élément de 6 m."), "élément de {v}"),
        recouvrement: rule("0.5", "m", TIROIR, ok("50 diamètres, soit 50 cm en HA10."), "recouvrement {v}"),
      },
      needs: [
        {
          id: "beton",
          slot: "beton",
          formula: "longueur * largeur * hauteur * regle.perte_fouille",
          unit: "m3",
          core: true,
          precision: "livré toupie",
          source: USAGE,
          verification: ok(),
          version: 1,
        },
        {
          id: "armatures",
          slot: "armature",
          formula: "arrondi_sup(longueur / (regle.longueur_element - regle.recouvrement))",
          unit: "u",
          core: true,
          source: TIROIR,
          verification: ok(),
          version: 1,
        },
      ],
    },
  ],
  wasteRules: [],
};
