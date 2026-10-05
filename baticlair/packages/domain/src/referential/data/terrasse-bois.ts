import type { ParamDef, Referential } from "../model.js";
import { DEFINITION_SOURCE, byPiece, generic, inPacks, lineQuantity, ok, packaging, rule, spec, todo } from "./kit.js";

/**
 * TIROIR TERRASSE BOIS (lot B, paquet 5) : `docs/referentiels/terrasse-bois-composite.md` et
 * `referentiels/terrasse-bois-composite/tiroir.json` (relevé du 2026-10-04). Lames à l'entraxe des lambourdes, lambourdes
 * en barres de 4 m, plots réglables, vis inox, saturateur en pots. Questions du comptoir seulement : l'essence de la lame
 * quand le devis ne la dit pas, la hauteur des plots. L'entraxe des lambourdes et les pertes ne se demandent jamais.
 */
const USAGE = "usage-terrassier-bois";
const BLANCHON = "blanchon-saturateur";

const PLOTS: ParamDef = {
  key: "hauteur_plots",
  label: "Hauteur des plots",
  unit: "mm",
  kind: "site_data",
  question: "Plots réglables : quelle hauteur ?",
  choices: [
    { label: "40 à 60 mm", value: "60" },
    { label: "60 à 90 mm", value: "90" },
    { label: "90 à 150 mm", value: "150" },
  ],
  display: { "60": "40 à 60 mm", "90": "60 à 90 mm", "150": "90 à 150 mm" },
  textValues: [
    { value: "60", keywords: ["plots 40", "plots 60"] },
    { value: "90", keywords: ["plots 90", "plots 60/90"] },
    { value: "150", keywords: ["plots 150", "plots 90/150"] },
  ],
};

const lame = (id: string, label: string, short: string, largeur: string, aliases: string[]) =>
  generic(id, "deck_board", label, short, byPiece("lame", "lames"), {
    aliases,
    attributes: { largeur: spec(largeur, "m", "definition", ok("Largeur de la lame + 5 mm de joint.")), longueur: spec("4.2", "m", "definition", ok("Lame de 4,20 m.")) },
  });

export const TERRASSE_BOIS_REFERENTIAL: Referential = {
  id: "terrasse-bois",
  version: "terrasse-bois-2026.10.05-1",
  trade: "decking",
  sources: [
    DEFINITION_SOURCE,
    {
      id: USAGE,
      kind: "trade_practice",
      title: "Référentiel terrasse bois et composite (docs/referentiels/terrasse-bois-composite.md), usages à valider",
      documentRef: "docs/referentiels/terrasse-bois-composite.md",
      retrievedAt: "2026-10-04",
    },
    { id: BLANCHON, kind: "retailer", title: "Saturateur terrasse : 4 à 12 m²/L selon la marque, pots de 0,75 à 5 L", url: "https://www.bricozor.com/saturateur-bois-terrasses-menuserie-exterieures-blanchon.html", retrievedAt: "2026-10-04" },
  ],
  families: [
    { code: "deck_work", label: "Terrasse bois", needUnit: "m2", attributes: [], keyAttributes: [], keywords: ["terrasse bois", "terrasse en bois", "terrasse composite", "platelage", "lames de terrasse"] },
    { code: "deck_board", label: "Lame de terrasse", needUnit: "u", attributes: [{ key: "largeur", label: "Largeur posée", unit: "m" }, { key: "longueur", label: "Longueur", unit: "m" }], keyAttributes: [] },
    { code: "joist", label: "Lambourde", needUnit: "u", attributes: [], keyAttributes: [] },
    { code: "pedestal", label: "Plot réglable", needUnit: "u", attributes: [], keyAttributes: [] },
    { code: "deck_screw", label: "Vis inox", needUnit: "u", attributes: [], keyAttributes: [], consumable: true },
    { code: "deck_oil", label: "Saturateur", needUnit: "l", attributes: [], keyAttributes: [] },
  ],
  products: [
    lame("pin-27x145", "Lame de terrasse pin traité classe 4, 27 × 145 mm, longueur 4,20 m", "Lames pin classe 4 27×145, L 4,20 m", "0.15", ["pin", "classe 4"]),
    lame("ipe-21x145", "Lame de terrasse ipé 21 × 145 mm, longueur 4,20 m", "Lames ipé 21×145, L 4,20 m", "0.15", ["ipe", "exotique"]),
    generic("lambourde-45x70", "joist", "Lambourde pin traité classe 4, 45 × 70 mm, longueur 4 m", "Lambourdes classe 4 45×70, L 4 m", byPiece("lambourde", "lambourdes")),
    generic("plot", "pedestal", "Plot réglable pour terrasse", "Plots réglables", byPiece("plot", "plots")),
    generic("vis-inox", "deck_screw", "Vis inox A2 tête fraisée 5 × 50 pour terrasse", "Vis inox terrasse 5 × 50", byPiece()),
    generic(
      "saturateur-5",
      "deck_oil",
      "Saturateur pour terrasse bois, pot de 5 L",
      "Saturateur terrasse, pot 5 L",
      inPacks("pot", "pot de 5 L", "pots de 5 L", { ...packaging("5", "l", BLANCHON, todo("Pots de 0,75, 2,5, 3 et 5 L.")), conflict: "Rendement de 4 à 12 m²/L selon la marque." }),
    ),
  ],
  workItems: [
    {
      id: "terrasse",
      trade: "decking",
      section: "principal",
      label: "Terrasse bois sur lambourdes et plots",
      triggers: ["deck_work"],
      params: [lineQuantity("surface", "Surface de terrasse", "m2", "Surface de terrasse ?"), PLOTS],
      slots: [
        { key: "terrasse", family: "deck_work", label: "Terrasse", measureOnly: true },
        { key: "lames", family: "deck_board", label: "Lames", keywords: ["pin", "ipe", "lame"], ask: "Lames : pin classe 4 ou ipé ?" },
        { key: "lambourdes", family: "joist", label: "Lambourdes", usual: { text: "Lambourdes classe 4 45 × 70.", source: USAGE, productId: "lambourde-45x70" } },
        { key: "plots", family: "pedestal", label: "Plots", usual: { text: "Plots réglables.", source: USAGE, productId: "plot" } },
        { key: "vis", family: "deck_screw", label: "Vis inox", usual: { text: "Vis inox A2 5 × 50.", source: USAGE, productId: "vis-inox" } },
        { key: "saturateur", family: "deck_oil", label: "Saturateur", usual: { text: "Saturateur en pot de 5 L.", source: BLANCHON, productId: "saturateur-5" } },
      ],
      constants: {
        perte: rule("1.1", "1", USAGE, todo("Coupes et défauts (§5)."), "lames +10 %"),
        perte_lambourdes: rule("1.1", "1", USAGE, todo("Aboutages et chutes (§5)."), "lambourdes +10 %"),
        entraxe: rule("0.5", "m", USAGE, todo("Lambourdes tous les 50 cm (§4)."), "lambourdes tous les {v}"),
        lambourde: rule("4", "m", "definition", ok("Lambourde de 4 m."), ""),
        plots_par_m2: rule("3.5", "u/m2", USAGE, todo("Un plot tous les 50 × 60 cm (§4)."), "{v} plots par m²"),
        vis_par_m2: rule("30", "u/m2", USAGE, todo("2 vis par lame et par lambourde (§4)."), "{v} vis par m²"),
        rendement: rule("4", "m2/l", BLANCHON, todo("4 m²/L en première saturation, 8 en entretien."), "saturateur {v} par litre en première couche"),
      },
      needs: [
        { id: "lames", slot: "lames", formula: "arrondi_sup(surface * regle.perte / (lames.largeur * lames.longueur))", unit: "u", core: true, source: USAGE, verification: ok(), version: 1 },
        { id: "lambourdes", slot: "lambourdes", formula: "arrondi_sup(surface / regle.entraxe * regle.perte_lambourdes / regle.lambourde)", unit: "u", core: true, source: USAGE, verification: ok(), version: 1 },
        {
          id: "plots",
          slot: "plots",
          formula: "arrondi_sup(surface * regle.plots_par_m2)",
          unit: "u",
          core: true,
          designation: "Plots réglables {hauteur_plots}",
          precisionRequires: ["hauteur_plots"],
          source: USAGE,
          verification: ok(),
          version: 1,
        },
        { id: "vis", slot: "vis", formula: "surface * regle.vis_par_m2", unit: "u", core: true, source: USAGE, verification: ok(), version: 1 },
        { id: "saturateur", slot: "saturateur", formula: "surface / regle.rendement", unit: "l", core: true, source: BLANCHON, verification: ok(), version: 1 },
      ],
    },
  ],
  wasteRules: [],
};
