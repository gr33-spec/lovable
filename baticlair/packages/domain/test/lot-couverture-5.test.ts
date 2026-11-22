import { describe, expect, it } from "vitest";
import { computeWorkItem, ROOFING_REFERENTIAL } from "../src/index.js";
import { describeLot, type Metier } from "./support/paquet.js";
import { readQuote } from "./support/read-quote.js";
import { readQuoteComplet, REFERENTIEL_COMPLET } from "./support/complet.js";

/**
 * LOT COUVERTURE, POINT 5 : ardoise fibres-ciment (§4). Le même calcul que l'ardoise naturelle (ardoises au m² du
 * format, liteaux, contre-liteaux, écran), avec ses formats (40 × 24, 40 × 27, 60 × 30, 60 × 40, recouvrement courant
 * 100 mm) et ses fixations : 2 clous inox et 1 crochet d'antivent par ardoise (« clous = 2,1 × ardoises, antivents =
 * 1,05 × ardoises »). Le comptoir demande le format et la teinte quand le devis ne les dit pas. Compte rendu :
 * `docs/lot-couverture/point-5.md`, tableau de Brest compris (l'ardoise naturelle ne change pas).
 */
const CAS: Metier[] = [
  {
    nom: "Ardoises fibres-ciment 40 × 24 bleu-noir",
    ref: ROOFING_REFERENTIAL,
    metier: "couverture",
    bench: [{ ref: "1", designation: "Couverture en ardoises fibres-ciment 40x24 bleu-noir", quantity: "100", unit: "m²" }],
    questions: [],
    couleurs: { vert: 1, orange: 0, gris: 0 },
  },
  {
    nom: "Ardoises fibro-ciment sans format ni teinte",
    ref: ROOFING_REFERENTIAL,
    metier: "couverture",
    bench: [{ ref: "1", designation: "Couverture ardoises fibro-ciment", quantity: "80", unit: "m²" }],
    questions: ["Ardoises fibres-ciment : anthracite (noir) ou brun ?", "Ardoises fibres-ciment : 40 × 24, 40 × 27, 60 × 30 ou 60 × 40 ?"],
    couleurs: { vert: 0, orange: 1, gris: 0 },
  },
];

describeLot({
  suite: "lot couverture, point 5 : ardoise fibres-ciment",
  titre: "Lot couverture, point 5 : ardoise fibres-ciment (§4)",
  fichier: "lot-couverture/point-5.md",
  test: "lot-couverture-5.test.ts",
  colonne: "Devis de test",
  intro: "Pour chaque devis : les lignes, l'écran à l'ouverture (lignes vertes, orange, grises, questions du comptoir),",
  paquet: CAS,
});

describe("ardoise fibres-ciment : le moteur de l'ardoise, ses formats, ses clous et ses antivents", () => {
  it("100 m² de 40 × 24 : 2 846 ardoises (27,1/m² + 5 % ; Cedral et Cembrit, avant 27,8 : 2 919), 5 977 clous (× 2,1), 2 989 antivents (× 1,05), 771 ml de liteaux (6,67/m² × 1,10 d'aboutage + 5 %)", () => {
    // Règle changée (Greg, 22 novembre 2026) : 10 % de chute d'aboutage sur les liteaux ; avant 701 → 771 ml (100 × 6,67 × 1,10 × 1,05 = 770,4 → 771).
    const v = readQuoteComplet([{ ref: "1", designation: "Couverture en ardoises fibres-ciment 40x24 bleu-noir", quantity: "100", unit: "m²" }]);
    expect(v.questions).toEqual([]);
    expect(Object.fromEntries(v.toBuy.map((b) => [b.label, b.quantity]))).toMatchObject({
      "Ardoises fibres-ciment bleu-noir 40×24": "2 846 pièces",
      "Clous inox d'ardoise": "5 977 pièces",
      "Crochets d'antivent": "2 989 pièces",
      "Liteaux 18×40": "771 ml",
    });
  });

  it("60 × 40 : 10 ardoises et 4 ml de liteaux au m² ; jamais de crochets d'ardoise naturelle", () => {
    const v = readQuoteComplet([{ ref: "1", designation: "Ardoises fibres-ciment 60x40 noires", quantity: "50", unit: "m²" }]);
    const got = Object.fromEntries(v.toBuy.map((b) => [b.label, b.quantity]));
    expect(got["Ardoises fibres-ciment noir 60×40"]).toBe("525 pièces"); // 50 × 10 + 5 %
    expect(v.toBuy.some((b) => /Crochets d'ardoise/.test(b.label))).toBe(false);
    // Une ardoise naturelle reste une ardoise naturelle (Brest).
    const naturelle = readQuoteComplet([{ ref: "1", designation: "Couverture en ardoises naturelles 30x22 posées au crochet", quantity: "200", unit: "m²" }]);
    expect(naturelle.toBuy.some((b) => /fibres-ciment|antivent/i.test(b.label))).toBe(false);
  });
});

describe("règles changées (Greg, 22 novembre 2026) : aboutage des liteaux, faîtière fibres-ciment", () => {
  const need = (r: ReturnType<typeof computeWorkItem>, id: string) => r.needs.find((n) => n.needId === id);
  it("110 m² de 40 × 24 : 110 × 6,67 × 1,10 × 1,05 = 847,4 → 848 ml de liteaux (avant 771) ; contre-liteaux inchangés", () => {
    const r = computeWorkItem(REFERENTIEL_COMPLET, {
      workItemId: "couverture-ardoises-fibres-ciment",
      params: { surface: { value: "110", unit: "m2", origin: "devis" }, teinte_fc: { value: "1", unit: "u", origin: "devis" } },
      products: { ardoise: { productId: "ardoise-fc-40x24", origin: "devis" } },
      mentioned: ["ardoise"],
    });
    // Besoin avant marge : 110 × 6,67 × 1,10 = 807,07 ml ; + 5 % de la famille = 847,42 → 848 ml commandés.
    expect(need(r, "liteaux-ardoise")).toMatchObject({ purchase: { order: { count: "848" } } });
    expect(Number(need(r, "liteaux-ardoise")!.quantity!.value)).toBeCloseTo(847.42, 1);
  });

  it("faîtage sur fibres-ciment : « Quelle faîtière ? » puis longueur ÷ longueur utile, arrondi au-dessus ; jamais de crochets de faîtière", () => {
    const faitage = (extra: Record<string, { value: string; unit: string; origin: "artisan" | "devis" }>) =>
      computeWorkItem(REFERENTIEL_COMPLET, {
        workItemId: "faitage",
        params: { longueur_faitage: { value: "10", unit: "m", origin: "devis" }, faitage_sur_fc: { value: "1", unit: "u", origin: "devis" }, ...extra },
        products: {},
        mentioned: ["faitiere"],
      });
    const attend = faitage({});
    expect(need(attend, "faitieres-fibres-ciment")?.status).toBe("question");
    expect(attend.nextQuestion).toMatchObject({ key: "param:faitiere_fc", text: "Quelle faîtière ?" });
    // 10 m ÷ 0,33 = 30,3 → 31 ; ÷ 1,10 = 9,1 → 10 ; ÷ 0,49 = 20,4 → 21.
    for (const [modele, pieces] of [["1", "31"], ["2", "10"], ["3", "21"]] as const) {
      const r = faitage({ faitiere_fc: { value: modele, unit: "u", origin: "artisan" } });
      expect(need(r, "faitieres-fibres-ciment"), modele).toMatchObject({ status: "calculated", quantity: { value: pieces } });
      expect(need(r, "faitieres"), modele).toBeUndefined();
      expect(need(r, "crochets-faitiere"), modele).toBeUndefined();
    }
  });
});
