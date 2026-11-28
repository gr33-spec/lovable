import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ecranDeLecture, parseLecture, ROOFING_REFERENTIAL as ref, SUGGESTIONS_KEY, type EngineAnswer } from "../src/index.js";

/**
 * CLOUS D'ARDOISE NATURELLE EN SUGGESTION (A-INTEGRER §3, Greg, 22 novembre 2026) : 2 clous par ardoise au doublis et au 1er
 * rang d'égout, aux rives et au dernier rang sous le faîtage (NF DTU 40.11 P1-1 2020 §5.1.3) ; les longueurs viennent du
 * devis, une longueur qui manque ne se demande que si la case est cochée ; vendus au kg (cuivre 3 × 30 ≈ 418 au kg).
 */
const C01 = parseLecture(JSON.parse(readFileSync(new URL("./banc-couverture/C01.json", import.meta.url), "utf8")).lecture)!;
const lire = (answers: Record<string, EngineAnswer>) => ecranDeLecture({ ref, lecture: C01, answers, preferences: {} });
const CASE = "couverture-ardoises-crochet/clou";

describe("les clous d'ardoise", () => {
  it("une case de la catégorie Fixations ; non cochée, rien ne sort et rien n'est demandé", () => {
    const e = lire({});
    expect(e.suggestions.find((s) => s.key === CASE)).toMatchObject({ label: "Clous d'ardoise (égout, rives, faîtage)", categorie: "Fixations" });
    const sans = lire({ [SUGGESTIONS_KEY]: "aucune" });
    expect(sans.purchase.toBuy.some((b) => /^Clous/.test(b.label))).toBe(false);
    expect(sans.questions.some((q) => /rives/.test(q.key))).toBe(false);
  });

  it("cochée : la longueur des rives, absente du devis, se demande ; puis 2 clous par ardoise d'égout (2 rangs), de faîtage et de rive", () => {
    const coche = lire({ [SUGGESTIONS_KEY]: CASE });
    const q = coche.questions.find((x) => /longueur_rives/.test(x.key));
    expect(q?.text).toBe("Longueur totale de tes rives (en mètres) ?");
    const e = lire({ [SUGGESTIONS_KEY]: CASE, [q!.key]: { value: "28", unit: "m" } });
    const clous = e.purchase.toBuy.find((b) => /^Clous galva/.test(b.label))!;
    // C01 : ardoise 32×22. Égout 16 m (la gouttière) : 2 × 2 × 16 ÷ 0,22 = 290,9 ; faîtage 8 m : 2 × 8 ÷ 0,22 = 72,7 ;
    // rives 28 m au pureau du chantier : 2 × 28 ÷ pureau. Vendus en boîtes de 1 kg (≈ 653 clous galva ; Greg, 23 novembre 2026 : galva par défaut).
    expect(clous.quantity).toMatch(/^\d+ boîtes? de 1 kg$/);
    expect(clous.postes?.map((x) => x.texte)).toEqual(["Égout : 2 rangs × 2 clous", "Faîtage 8 ml : dernier rang × 2 clous", expect.stringMatching(/^Rives 28 ml × 2 clous$/)]);
  });
});
