import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ecranDeLecture, parseLecture, ROOFING_REFERENTIAL as ref, type EngineAnswer } from "../src/index.js";
import { computeWithAnswers } from "../src/trust/artisan-view.js";

/**
 * CALCULATEUR DE FEUILLES DE ZINC (Greg, 22 novembre 2026) : feuilles 2 × 1 m ; pièces = ml ÷ longueur (1 m ou 2 m), arrondi
 * au-dessus ; bandes par feuille = 100 cm ÷ développé, arrondi en dessous ; feuilles = pièces ÷ bandes par feuille, arrondi
 * au-dessus ; les pièces du même article partagent les feuilles (un seul arrondi sur la liste) ; pas de recouvrement.
 * Exemple de Greg : 10 ml, pièces de 2 m, dév. 20 → 5 pièces, 5 bandes par feuille → 1 feuille.
 */
const C11 = parseLecture(JSON.parse(readFileSync(new URL("./banc-couverture/C11.json", import.meta.url), "utf8")).lecture)!;
const PLIE = { "param:faconnage@pieces-pliees": { value: "1", unit: "u" } } as const;
const lire = (answers: Record<string, EngineAnswer>) => {
  const e = ecranDeLecture({ ref, lecture: C11, answers, preferences: {} });
  return { e, needs: computeWithAnswers(ref, e.plan, answers, {}, {}).needs };
};

describe("le calculateur de feuilles", () => {
  it("chaque pièce dit son calcul sous la flèche, sa longueur se corrige ; la part de feuille n'est pas encore arrondie", () => {
    const { needs } = lire(PLIE);
    const aretier = needs.find((n) => n.needId === "feuilles-aretier-zinc")!;
    expect(aretier.postes?.map((x) => x.texte)).toEqual(["15 pièces de 2 m (30 ml), développé 33 cm, 3 par feuille"]);
    expect(aretier.postes?.[0]?.cle).toBe("param:longueur_aretier@aretier");
    expect(aretier.partage).toBe("5");
    const noue = needs.find((n) => n.needId === "feuilles-noue")!;
    expect(noue.postes?.map((x) => x.texte)).toEqual(["2 pièces de 2 m (3 ml), développé 50 cm, 2 par feuille"]);
  });

  it("les pièces de plusieurs ouvrages partagent les feuilles : UNE ligne, un seul arrondi", () => {
    const { e } = lire(PLIE);
    const feuilles = e.purchase.toBuy.filter((b) => /^Feuilles .*2 × 1 m/.test(b.label));
    expect(feuilles).toHaveLength(1);
    // Arêtiers 30 ml (15 bandes de dév. 33) + faîtage (bandes de dév. 33) + noues 3 ml (2 bandes de dév. 50) : 7 feuilles.
    expect(feuilles[0]!.quantity).toBe("7 pièces");
  });

  it("pièces de 1 m : deux pièces par bande de 2 m", () => {
    const { needs } = lire({ ...PLIE, "param:longueur_pieces@longueur-pieces-pliees": { value: "1", unit: "m" } });
    const noue = needs.find((n) => n.needId === "feuilles-noue")!;
    // 3 ml → 3 pièces de 1 m → 2 bandes de 2 m, 2 par feuille → 1 feuille.
    expect(noue.postes?.map((x) => x.texte)).toEqual(["3 pièces de 1 m (3 ml), développé 50 cm, 2 par feuille"]);
    expect(noue.partage).toBe("1");
  });
});

describe("« Combien de feuilles ? » (Greg, 23 novembre 2026)", () => {
  const C01 = parseLecture(JSON.parse(readFileSync(new URL("./banc-couverture/C01.json", import.meta.url), "utf8")).lecture)!;
  const ecran = (answers: Record<string, EngineAnswer>) => ecranDeLecture({ ref, lecture: C01, answers, preferences: {} });
  const feuilles = (e: ReturnType<typeof ecran>) => e.purchase.toBuy.find((b) => /^Feuilles .*2 × 1 m/.test(b.label));

  it("« Je ne sais pas » au développé (je plie) : « Pour le faîtage, combien de feuilles de zinc te faut-il ? » (Greg, 23 novembre 2026)", () => {
    const base = { ...PLIE, "param:type_crochet@crochets-ardoise": { value: "1", unit: "u" } } as Record<string, EngineAnswer>;
    const dev = ecran(base).questions.find((q) => /^param:developpe\b/.test(q.key))!;
    const e = ecran({ ...base, [dev.key]: null });
    const q = e.questions.find((x) => /feuilles_faitage/.test(x.key))!;
    expect(q.text).toBe("Pour le faîtage, combien de feuilles de zinc te faut-il ?");
    // Répondue : le nombre dit fait la ligne. « Je ne sais pas » encore : la ligne reste à préciser, rien n'est inventé.
    expect(feuilles(ecran({ ...base, [dev.key]: null, [q.key]: { value: "2", unit: "u" } }))!.quantity).toBe("2 pièces");
  });

  it("« Je ne sais pas » au développé d'une pièce commandée toute faite : pas de question de feuilles", () => {
    const base = { "param:faconnage@pieces-pliees": { value: "2", unit: "u" }, "param:type_crochet@crochets-ardoise": { value: "1", unit: "u" } } as Record<string, EngineAnswer>;
    const dev = ecran(base).questions.find((q) => /^param:developpe\b/.test(q.key));
    if (!dev) return;
    expect(ecran({ ...base, [dev.key]: null }).questions.some((x) => /feuilles_/.test(x.key))).toBe(false);
  });

  it("le nombre de feuilles dit par l'artisan remplace le calcul, dit sous la flèche", () => {
    const base = { ...PLIE, "param:type_crochet@crochets-ardoise": { value: "1", unit: "u" } } as Record<string, EngineAnswer>;
    const dev = ecran(base).questions.find((q) => /^param:developpe\b/.test(q.key))!;
    const e = ecran({ ...base, [dev.key]: { value: "1200", unit: "mm" } });
    const q = e.questions.find((x) => /feuilles_faitage/.test(x.key))!;
    expect(q.text).toBe("Pour le faîtage, combien de feuilles de zinc te faut-il ?");
    expect(q.options?.map((o) => o.label)).toEqual(["1", "2", "3", "4"]);
    const f = feuilles(ecran({ ...base, [dev.key]: { value: "1200", unit: "mm" }, [q.key]: { value: "3", unit: "u" } }))!;
    expect(f.quantity).toBe("3 pièces");
    expect(f.postes?.map((x) => x.texte)).toEqual(["Ta réponse : 3 feuilles"]);
  });

  it("un développé plus large que la feuille (« Autre » : 120 cm) : la même question", () => {
    const base = { ...PLIE, "param:type_crochet@crochets-ardoise": { value: "1", unit: "u" } } as Record<string, EngineAnswer>;
    const dev = ecran(base).questions.find((q) => /^param:developpe\b/.test(q.key))!;
    const e = ecran({ ...base, [dev.key]: { value: "1200", unit: "mm" } });
    expect(e.questions.some((x) => /feuilles_faitage/.test(x.key))).toBe(true);
  });
});
