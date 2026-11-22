import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ecranDeLecture, parseLecture, ROOFING_REFERENTIAL as ref, verificationDeLaLigne } from "../src/index.js";

/**
 * « À VÉRIFIER » OU « CALCULÉ » (Greg, 22 novembre 2026) : « Aujourd'hui, toutes les lignes calculées affichent à vérifier,
 * même les tasseaux et les couvre-joints validés. Si tout est à vérifier, l'artisan ne fait plus confiance à rien. » Règle :
 * « à vérifier » seulement sur une valeur par défaut ou une hypothèse incertaine, et la raison est dite ; sinon « Calculé ».
 */
const lignes = (c: string) => {
  const lecture = parseLecture(JSON.parse(readFileSync(new URL(`./banc-couverture/${c}.json`, import.meta.url), "utf8")).lecture)!;
  const e = ecranDeLecture({ ref, lecture, answers: {}, preferences: {} });
  return e.purchase.toBuy.map((b) => ({ label: b.label, ...verificationDeLaLigne(b, e.purchase.assumptions) }));
};
const de = (l: ReturnType<typeof lignes>, mot: RegExp) => l.find((x) => mot.test(x.label))!;

describe("« À vérifier » seulement sur une vraie hypothèse", () => {
  it("zinc à tasseaux (C04) : tasseaux, couvre-joints et bobine de 650 « Calculé » (la largeur du pan se déduit du devis, l'entraxe et la bobine sont validés)", () => {
    const l = lignes("C04");
    for (const mot of [/^Tasseaux/, /^Couvre-joints/, /^Bobine /]) expect(de(l, mot)).toMatchObject({ etat: "calcule", raisons: [] });
  });
  it("tubes de 2 m (validés par Greg), liteaux 18×40 par défaut (validés) : « Calculé »", () => {
    const l = lignes("C01");
    expect(de(l, /^Tubes de descente/).etat).toBe("calcule");
    expect(de(l, /^Liteaux/).etat).toBe("calcule");
  });
  it("une vraie hypothèse se dit : bac acier simple peau faute de « sandwich » au devis (C07) ; diamètre du crochet par défaut (C01)", () => {
    expect(de(lignes("C07"), /^Plaques bac acier/)).toEqual(expect.objectContaining({ etat: "a_verifier", raisons: ["Bac acier simple peau : valeur par défaut"] }));
    expect(de(lignes("C01"), /^Ardoises/).raisons).toEqual(["Diamètre du crochet standard : valeur par défaut"]);
  });
  it("une ligne qui attend une réponse est à vérifier ; une ligne dite telle quelle reste « dite »", () => {
    const l = lignes("C01");
    expect(de(l, /^Crochets d'ardoise/).raisons).toContain("Une réponse est attendue");
    expect(de(l, /^Dauphin/).etat).toBe("dit");
  });
});

describe("un produit par défaut dont le format est écrit sur la ligne", () => {
  it("« Ardoises naturelles 32×22 » : le 32×22 n'est pas une valeur par défaut ; un autre format l'est, dit sans redite", () => {
    const a = [{ key: "product:ardoise", label: "Ardoises", value: "Ardoises 32×22", unit: "" }];
    const base = { kind: "computed" as const, state: "ok" as never, toConfirm: [], waitsOn: [], assumptionKeys: ["product:ardoise"], edited: [] };
    expect(verificationDeLaLigne({ ...base, label: "Ardoises naturelles 32×22" } as never, a).etat).toBe("calcule");
    expect(verificationDeLaLigne({ ...base, label: "Ardoises naturelles" } as never, a).raisons).toEqual(["Ardoises 32×22 : modèle par défaut"]);
  });
});
