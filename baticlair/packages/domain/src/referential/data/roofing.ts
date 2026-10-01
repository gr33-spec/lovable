import type { Fact, Referential } from "../model.js";

/**
 * Référentiel COUVERTURE — premier jeu, pour valider la structure.
 *
 * TOUT EST EN BROUILLON : ces valeurs ont été relevées le 2026-10-01 via
 * une recherche web (les documents eux-mêmes n'ont pas pu être ouverts
 * depuis l'environnement BatiClair). Aucune ne sert au calcul d'un artisan
 * tant qu'un professionnel identifié ne l'a pas vérifiée sur la source et
 * passée en « verified » (avec date et nom).
 */
const draft = { status: "draft" } as const;

const fact = (value: string, unit: string, source: string, note?: string): Fact => ({
  value,
  unit,
  source,
  verification: draft,
  version: 1,
  ...(note ? { note } : {}),
});

/** « 1 pièce contient 1 pièce » : une définition, pas une donnée à prouver. */
const ONE_PIECE: Fact = {
  value: "1",
  unit: "u",
  source: "definition",
  verification: { status: "verified", verifiedAt: "2026-10-01", verifiedBy: "BatiClair (définition)" },
  version: 1,
};

export const ROOFING_REFERENTIAL: Referential = {
  id: "roofing",
  version: "roofing-2026.10.01-1",
  trade: "roofing",
  sources: [
    {
      id: "definition",
      kind: "definition",
      title: "Définition",
      retrievedAt: "2026-10-01",
    },
    {
      id: "edilians-hp10",
      kind: "manufacturer",
      title: "Fiche HP 10 Huguenot (Edilians)",
      publisher: "Edilians",
      url: "https://edilians.com/media/productattach/2/0/205_fag_hp_10_huguenot_14122021_bd.pdf",
      retrievedAt: "2026-10-01",
      note: "Valeurs relevées par recherche web, document non ouvert : à vérifier sur la fiche (version du 14/12/2021).",
    },
    {
      id: "baticlair-geometrie-liteaunage",
      kind: "baticlair_rule",
      title: "Règle BatiClair : un rang de liteaux par pureau, une file de contre-liteaux par chevron",
      retrievedAt: "2026-10-01",
      note: "Cohérente avec le tableau « ml de liteaux par m² » de la fiche HP 10 (1 ÷ pureau). À valider par un couvreur.",
    },
    {
      id: "dtu-40-29",
      kind: "standard",
      title: "NF DTU 40.29 — Écrans souples de sous-toiture",
      documentRef: "NF DTU 40.29 (recouvrements entre lés)",
      retrievedAt: "2026-10-01",
      note: "Recouvrement selon la pente relevé sur une fiche produit citant le DTU : à vérifier sur le texte du DTU.",
    },
    {
      id: "retail-ecran-hpv-r2",
      kind: "retailer",
      title: "Écran de sous-toiture HPV R2, rouleau 1,50 × 50 m (fiche distributeur)",
      url: "https://www.toiture-online.com/ecran-de-sous-toiture-hpv-r2-les-elementaires-rouleau-de-1-5-m-x-50-m.html",
      retrievedAt: "2026-10-01",
    },
    {
      id: "longueur-liteau-courante",
      kind: "retailer",
      title: "Fiche article liteau sapin traité 27 × 40 (négoce)",
      documentRef: "Fiche article du négoce à fournir (longueur, botte) : 3 m, 4 m, 4,2 m… selon le négoce",
      retrievedAt: "2026-10-01",
    },
  ],
  families: [
    {
      code: "roof_tile",
      label: "Tuile",
      needUnit: "u",
      attributes: [
        { key: "largeur_utile", label: "Largeur utile", unit: "m" },
        { key: "pureau_min", label: "Pureau minimal", unit: "m" },
        { key: "pureau_max", label: "Pureau maximal", unit: "m" },
      ],
      keyAttributes: ["largeur_utile"],
    },
    {
      code: "batten",
      label: "Liteau et contre-liteau",
      needUnit: "ml",
      attributes: [
        { key: "epaisseur", label: "Épaisseur", unit: "mm" },
        { key: "largeur", label: "Largeur", unit: "mm" },
      ],
      keyAttributes: ["epaisseur", "largeur"],
    },
    {
      code: "underlay",
      label: "Écran sous-toiture / pare-pluie",
      needUnit: "m2",
      attributes: [
        { key: "largeur_rouleau", label: "Largeur du rouleau", unit: "m" },
        { key: "longueur_rouleau", label: "Longueur du rouleau", unit: "m" },
      ],
      keyAttributes: ["largeur_rouleau"],
    },
  ],
  products: [
    {
      id: "edilians-hp10-huguenot",
      family: "roof_tile",
      label: "Tuile terre cuite HP 10 Huguenot (Edilians)",
      shortLabel: "Tuiles HP10",
      manufacturer: "Edilians",
      aliases: ["hp10", "hp 10", "hp10 huguenot", "hp 10 huguenot"],
      attributes: {
        largeur_utile: fact("0.268", "m", "edilians-hp10"),
        pureau_min: fact("0.310", "m", "edilians-hp10"),
        pureau_max: fact("0.376", "m", "edilians-hp10"),
      },
      sellingUnits: [{ id: "piece", label: { one: "pièce", many: "pièces" }, contains: ONE_PIECE, primary: true }],
      note: "Tuiles par palette : à relever sur la fiche (aucune valeur saisie).",
    },
    {
      id: "liteau-sapin-27x40-4m",
      family: "batten",
      label: "Liteau sapin traité 27 × 40 mm, longueur 4 m",
      shortLabel: "Liteaux 27×40",
      aliases: ["27x40", "27 x 40", "27*40", "27 40"],
      attributes: {
        epaisseur: fact("27", "mm", "longueur-liteau-courante", "Section nominale (désignation commerciale)."),
        largeur: fact("40", "mm", "longueur-liteau-courante", "Section nominale (désignation commerciale)."),
      },
      sellingUnits: [
        { id: "longueur-4m", label: { one: "longueur de 4 m", many: "longueurs de 4 m" }, contains: fact("4", "m", "longueur-liteau-courante"), primary: true },
      ],
    },
    {
      id: "ecran-hpv-r2-150x50",
      family: "underlay",
      label: "Écran de sous-toiture HPV R2, rouleau 1,50 × 50 m",
      shortLabel: "Écran HPV",
      aliases: ["ecran hpv", "hpv", "ecran sous toiture hpv", "membrane respirante", "pare pluie hpv"],
      attributes: {
        largeur_rouleau: fact("1.5", "m", "retail-ecran-hpv-r2"),
        longueur_rouleau: fact("50", "m", "retail-ecran-hpv-r2"),
      },
      sellingUnits: [{ id: "rouleau", label: { one: "rouleau", many: "rouleaux" }, contains: fact("75", "m2", "retail-ecran-hpv-r2"), primary: true }],
    },
  ],
  workItems: [
    {
      id: "couverture-tuiles-emboitement",
      trade: "roofing",
      label: "Couverture en tuiles à emboîtement sur liteaux",
      triggers: ["roof_tile"],
      params: [
        { key: "surface", label: "Surface de toiture", unit: "m2", question: "Quelle surface de toiture ?" },
        {
          key: "pureau",
          label: "Pureau",
          unit: "cm",
          question: "À quel pureau posez-vous ces tuiles ?",
          hint: "Selon la pente, la zone et l'exposition (fiche du fabricant).",
          range: { min: "tuile.pureau_min", max: "tuile.pureau_max" },
        },
        { key: "entraxe_chevrons", label: "Entraxe des chevrons", unit: "cm", question: "Entraxe des chevrons ?" },
        { key: "pente", label: "Pente du toit", unit: "%", question: "Pente du toit (en %) ?" },
      ],
      slots: [
        { key: "tuile", family: "roof_tile", label: "Tuiles" },
        { key: "liteau", family: "batten", label: "Liteaux" },
        { key: "contre_liteau", family: "batten", label: "Contre-liteaux" },
        { key: "ecran", family: "underlay", label: "Écran sous-toiture" },
      ],
      constants: {
        seuil_pente_ecran: fact("30", "%", "dtu-40-29"),
        recouvrement_faible_pente: fact("0.20", "m", "dtu-40-29", "Pente inférieure OU ÉGALE au seuil (fiche SOP'ÉCRAN HPV R2 : « ≤ 30 % »)."),
        recouvrement_forte_pente: fact("0.10", "m", "dtu-40-29", "Pente supérieure au seuil."),
      },
      needs: [
        {
          id: "tuiles",
          slot: "tuile",
          formula: "surface / (tuile.largeur_utile * pureau)",
          unit: "u",
          core: true,
          exclusions: "Hors tuiles de rive, faîtières et accessoires (calculés à part).",
          source: "edilians-hp10",
          verification: draft,
          version: 1,
        },
        {
          id: "liteaux",
          slot: "liteau",
          formula: "surface / pureau",
          unit: "ml",
          core: false,
          exclusions: "Hors doublage du liteau d'égout et liteaux de faîtage.",
          source: "baticlair-geometrie-liteaunage",
          verification: draft,
          version: 1,
        },
        {
          id: "contre-liteaux",
          slot: "contre_liteau",
          formula: "surface / entraxe_chevrons",
          unit: "ml",
          core: false,
          exclusions: "Suppose des chevrons réguliers sur toute la surface.",
          source: "baticlair-geometrie-liteaunage",
          verification: draft,
          version: 1,
        },
        {
          id: "ecran",
          slot: "ecran",
          formula:
            "surface * ecran.largeur_rouleau / (ecran.largeur_rouleau - si(pente <= regle.seuil_pente_ecran, regle.recouvrement_faible_pente, regle.recouvrement_forte_pente))",
          unit: "m2",
          core: false,
          exclusions: "Hors recouvrements en bout de rouleau, relevés et chutes.",
          source: "dtu-40-29",
          verification: draft,
          version: 1,
        },
      ],
    },
  ],
  wasteRules: [],
};
