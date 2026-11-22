import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ecranDeLecture, lectureDepuisLignes, parseLecture, ROOFING_REFERENTIAL as ref, type EngineAnswer } from "../src/index.js";
import { lectureParLeCode } from "../src/lecture/par-le-code.js";
import { computeWithAnswers } from "../src/trust/artisan-view.js";

/**
 * LE DÉTAIL DU CALCUL SOUS LA FLÈCHE (Greg, 22 novembre 2026) : « un poste par ligne, en mots simples : Surface 150 m² ×
 * 39,5 = 5 925 · Arêtiers 12 m × 26 = 312 · Égout 20 m = … · Faîtage 10 m, 1 rang = … · Perte 5 % ». La somme des postes est
 * le besoin, la perte s'ajoute ; jamais dans le PDF ni l'e-mail (seulement dans la vue de l'écran).
 */
const besoins = (lecture: Parameters<typeof ecranDeLecture>[0]["lecture"], answers: Record<string, EngineAnswer> = {}) => {
  const e = ecranDeLecture({ ref, lecture, answers, preferences: {} });
  return computeWithAnswers(ref, e.plan, answers, {}, {}).needs;
};

describe("les postes du calcul", () => {
  it("ardoises (C01) : surface, faîtage et égout un rang chacun, puis la perte ; la somme fait la commande", () => {
    const lecture = parseLecture(JSON.parse(readFileSync(new URL("./banc-couverture/C01.json", import.meta.url), "utf8")).lecture)!;
    const ardoises = besoins(lecture).find((n) => n.needId === "ardoises")!;
    expect(ardoises.postes?.map((p) => p.texte)).toEqual(["Surface 96 m² × 39,6 au m²", "Faîtage 8 ml, 1 rang", "Égout 16 ml (la gouttière), 1 rang", "Perte 5 %"]);
    expect(ardoises.postes?.find((p) => p.id === "surface")?.cle).toMatch(/^param:surface@/);
    const total = ardoises.postes!.reduce((s, p) => s + Number(p.valeur), 0);
    expect(total).toBeCloseTo(Number(ardoises.quantity!.value), 1);
  });

  it("gouttière zinc de 20 m : 20 m + 5 croisures de 3 cm ; « 5 longueurs couvriraient 19,88 m », pour repasser à 5 d'un toucher", () => {
    const brut = lectureDepuisLignes([{ id: "1", designation: "Fourniture et pose gouttière zinc demi-ronde de 33", quantity: "20", unit: "ml" }]);
    const lecture = lectureParLeCode(ref, { ...brut, lignes: brut.lignes.map((l) => ({ ...l, role: "fourniture_et_pose" as const })) });
    const profil = besoins(lecture, { "param:developpe_gouttiere": { value: "330", unit: "mm" } }).find((n) => n.needId === "profil")!;
    expect(profil.purchase?.order.count).toBe("6");
    expect(profil.postes?.map((p) => [p.texte, p.valeur, p.info ?? false])).toEqual([
      ["Gouttière 20 ml", "20", false],
      ["Croisures : 5 jonctions × 3 cm", "0.15", false],
      ["5 longueurs couvriraient", "19.88", true],
    ]);
  });

  it("une ligne sans postes écrits dans la fiche a quand même son détail : sa précision, puis la perte", () => {
    const lecture = parseLecture(JSON.parse(readFileSync(new URL("./banc-couverture/C01.json", import.meta.url), "utf8")).lecture)!;
    const liteaux = besoins(lecture).find((n) => n.needId === "liteaux-ardoise")!;
    expect(liteaux.postes?.length).toBe(2);
    expect(liteaux.postes?.[1]).toMatchObject({ id: "perte", texte: "Perte 10 %" });
  });
});
