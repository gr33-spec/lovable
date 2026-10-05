import type { Referential } from "../model.js";
import { DEFINITION_SOURCE, byPiece, generic, inPacks, lineQuantity, ok, packaging, rule, spec, todo } from "./kit.js";

/**
 * TIROIR BARDAGE (lot B, paquet 3) : `docs/referentiels/poseur-de-bardage.md` et `referentiels/bardage/tiroir.json`
 * (relevé du 2026-10-04). Bardage bois sur tasseaux : lames en bottes entières (largeur utile × longueur), pare-pluie en
 * rouleaux de 75 m², tasseaux en barres, pointes inox. Question du comptoir : l'essence (douglas ou mélèze) quand le devis
 * ne la dit pas. Les pertes de coupe et le nombre de lames au m² ne se demandent jamais : hypothèses dites, orange tant
 * qu'un bardeur ne les a pas confirmées.
 */
const USAGE = "usage-bardeur";
const CHAUSSON = "chausson-douglas-21x132";
const BIGMAT = "bigmat-meleze-21x132";
const DELTA = "delta-fassade-50";
const SIVALBP = "guide-pose-sivalbp";

const lame = (id: string, label: string, short: string, utile: ReturnType<typeof spec>, botte: ReturnType<typeof packaging>, aliases: string[]) =>
  generic(id, "cladding_board", label, short, inPacks("botte", "botte de 5 lames", "bottes de 5 lames", botte), {
    aliases,
    attributes: { utile: { ...utile, label: "largeur utile {v}" }, longueur: spec("4", "m", "definition", ok("Lame de 4 m.")) },
  });

export const BARDAGE_REFERENTIAL: Referential = {
  id: "bardage",
  version: "bardage-2026.10.05-1",
  trade: "cladding",
  sources: [
    DEFINITION_SOURCE,
    {
      id: USAGE,
      kind: "trade_practice",
      title: "Référentiel quantitatif bardage (docs/referentiels/poseur-de-bardage.md), usages à valider par un bardeur",
      documentRef: "docs/referentiels/poseur-de-bardage.md",
      retrievedAt: "2026-10-04",
    },
    { id: CHAUSSON, kind: "retailer", title: "Bardage douglas 21 × 132 : bottes de 5 lames", url: "https://www.chausson.fr/media/article-document/273073", retrievedAt: "2026-10-04" },
    {
      id: BIGMAT,
      kind: "retailer",
      title: "Bardage mélèze 21 × 145 (132 utiles), 3 et 4 m, bottes de 5",
      url: "https://medias.bigmat.fr/data_medias/medias_finaux/documents/jKqnnPCzWMDPI61XOMrV.pdf",
      retrievedAt: "2026-10-04",
    },
    {
      id: DELTA,
      kind: "manufacturer",
      title: "Delta-Fassade 50 : pare-pluie de bardage, rouleau 1,50 × 50 m (75 m²)",
      url: "https://www.doerken.com/ch/fr/content/preview/21012/file/Fiche%20technique%20DELTA-FASSADE%2050%20%28PLUS%29.pdf",
      retrievedAt: "2026-10-04",
    },
    {
      id: SIVALBP,
      kind: "manufacturer",
      title: "Guide de pose SIVALBP : 2 pointes inox par lame et par tasseau, tasseaux 27 mm à 65 cm au plus",
      url: "https://cdn.chausson.fr/catalog-document/a9ee1aa0-85ac-4733-a46c-1f61c3680926/guide-fr-de-pose-sivalbp-21.pdf",
      retrievedAt: "2026-10-04",
    },
  ],
  families: [
    {
      code: "cladding_work",
      label: "Bardage bois",
      needUnit: "m2",
      attributes: [],
      keyAttributes: [],
      keywords: ["bardage", "bardage bois", "bardage douglas", "bardage meleze", "clin", "claire voie", "claire-voie"],
    },
    {
      code: "cladding_board",
      label: "Lame de bardage",
      needUnit: "u",
      attributes: [
        { key: "utile", label: "Largeur utile", unit: "m" },
        { key: "longueur", label: "Longueur", unit: "m" },
      ],
      keyAttributes: [],
    },
    { code: "rain_screen", label: "Pare-pluie de bardage", needUnit: "m2", attributes: [], keyAttributes: [] },
    { code: "batten", label: "Tasseau", needUnit: "u", attributes: [], keyAttributes: [] },
    { code: "cladding_nail", label: "Pointes inox", needUnit: "u", attributes: [], keyAttributes: [], consumable: true },
  ],
  products: [
    lame(
      "douglas-21x132",
      "Lame de bardage douglas 21 × 132 mm, longueur 4 m",
      "Bardage douglas 21×132, L 4 m",
      spec("0.132", "m", CHAUSSON, todo("132 mm utiles ; certaines références annoncent 130."), "Largeur utile."),
      { ...packaging("5", "u", CHAUSSON, ok("Bottes de 5 lames.")), conflict: "Largeur utile de 130 ou 132 mm selon la référence." },
      ["douglas"],
    ),
    lame(
      "meleze-21x132",
      "Lame de bardage mélèze 21 × 145 mm (132 utiles), longueur 4 m",
      "Bardage mélèze 21×132, L 4 m",
      spec("0.132", "m", BIGMAT, ok("21 × 145 hors tout, 132 utiles.")),
      packaging("5", "u", BIGMAT, ok("Bottes de 5 lames.")),
      ["meleze"],
    ),
    generic(
      "pare-pluie-75",
      "rain_screen",
      "Pare-pluie de bardage (type Delta-Fassade), rouleau 1,50 × 50 m",
      "Pare-pluie bardage, rouleau 75 m²",
      inPacks("rouleau", "rouleau de 75 m²", "rouleaux de 75 m²", packaging("75", "m2", DELTA, ok("1,50 × 50 m = 75 m²."))),
    ),
    generic("tasseau-27x40", "batten", "Tasseau sapin traité classe 3, 27 × 40 mm, longueur 4 m", "Tasseaux 27×40 traités, L 4 m", byPiece("tasseau", "tasseaux")),
    generic("pointes-inox", "cladding_nail", "Pointes annelées inox A2 pour bardage 2,5 × 50 mm", "Pointes inox bardage 2,5 × 50", byPiece()),
  ],
  workItems: [
    {
      id: "bardage-bois",
      trade: "cladding",
      section: "principal",
      label: "Bardage bois sur tasseaux (lames, pare-pluie, tasseaux, pointes)",
      triggers: ["cladding_work"],
      params: [lineQuantity("surface", "Surface de bardage", "m2", "Surface à barder ?")],
      slots: [
        { key: "bardage", family: "cladding_work", label: "Bardage", measureOnly: true },
        { key: "lames", family: "cladding_board", label: "Lames", keywords: ["douglas", "meleze", "lame"], ask: "Bardage : douglas ou mélèze ?" },
        { key: "pare_pluie", family: "rain_screen", label: "Pare-pluie", usual: { text: "Pare-pluie de bardage 75 m².", source: DELTA, productId: "pare-pluie-75" } },
        { key: "tasseaux", family: "batten", label: "Tasseaux", usual: { text: "Tasseaux 27 × 40 traités classe 3.", source: SIVALBP, productId: "tasseau-27x40" } },
        { key: "pointes", family: "cladding_nail", label: "Pointes inox", usual: { text: "Pointes annelées inox.", source: SIVALBP, productId: "pointes-inox" } },
      ],
      constants: {
        pertes: rule("1.1", "1", USAGE, todo("Coupes en about et autour des baies (§5)."), "lames +10 % de coupe"),
        recouvrement: rule("1.1", "1", USAGE, todo("Recouvrements de 10 cm entre lés (§5)."), "pare-pluie +10 % de recouvrements"),
        perte_tasseaux: rule("1.1", "1", USAGE, todo("Chutes et doublages autour des baies (§5)."), "tasseaux +10 % de chutes"),
        entraxe: rule("0.6", "m", SIVALBP, ok("Tasseaux à 65 cm au plus ; 60 cm courant."), "tasseaux tous les {v}"),
        longueur_tasseau: rule("4", "m", "definition", ok("Tasseau de 4 m."), ""),
        pointes_par_m2: rule("25", "u/m2", SIVALBP, todo("2 pointes par lame et par tasseau : ≈ 25 au m² à 65 cm."), "{v} pointes par m²"),
      },
      needs: [
        { id: "lames", slot: "lames", formula: "surface * regle.pertes / (lames.utile * lames.longueur)", unit: "u", core: true, source: USAGE, verification: ok(), version: 1 },
        { id: "pare_pluie", slot: "pare_pluie", formula: "surface * regle.recouvrement", unit: "m2", core: true, source: DELTA, verification: ok(), version: 1 },
        {
          id: "tasseaux",
          slot: "tasseaux",
          formula: "arrondi_sup(surface / regle.entraxe * regle.perte_tasseaux / regle.longueur_tasseau)",
          unit: "u",
          core: true,
          source: SIVALBP,
          verification: ok(),
          version: 1,
        },
        { id: "pointes", slot: "pointes", formula: "surface * regle.pointes_par_m2", unit: "u", core: true, source: SIVALBP, verification: ok(), version: 1 },
      ],
    },
  ],
  wasteRules: [],
};
