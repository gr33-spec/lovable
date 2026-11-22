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
