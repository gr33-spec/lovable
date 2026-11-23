import { describe, expect, it } from "vitest";
import { cleDeSon, corrigerTexte, devisAuPropre, ecranDeLecture, parseLecture, ROOFING_REFERENTIAL as ref, vocabulaireDuMetier } from "../src/index.js";
import { chantiers, noter, type Chantier } from "./banc-couverture.js";

/**
 * LES FAUTES D'ORTHOGRAPHE DES ARTISANS (Greg, 22 novembre 2026) : le devis est remis au propre avant tout calcul ; jamais
 * un chiffre, une mesure ni une référence touchés ; un vrai doute devient une question. « Ajoute au banc au moins 5 chantiers
 * dont le devis est plein de fautes : la liste doit être la même que pour le devis bien écrit. »
 */
const FAUTES: [RegExp, string][] = [
  [/\bardoises\b/gi, "ardoizes"],
  [/\bardoise\b/gi, "ardoize"],
  [/\bfaîtage\b/gi, "faitage"],
  [/\bzinc\b/gi, "zing"],
  [/\bliteaux\b/gi, "litos"],
  [/\bgouttière\b/gi, "goutiere"],
  [/\bgouttières\b/gi, "goutieres"],
  [/\btuiles\b/gi, "tuilles"],
  [/\bcrochets\b/gi, "crochés"],
  [/\bdescentes\b/gi, "dessentes"],
  [/\bfaîtières\b/gi, "faitieres"],
];
const avecFautes = (c: Chantier): { chantier: Chantier; fautes: number } => {
  const lecture = structuredClone(c.lecture) as { lignes: { designation: string }[] };
  let fautes = 0;
  for (const l of lecture.lignes) {
    let d = l.designation;
    // La faute garde la majuscule du mot (« Faîtage » → « Faitage »).
    for (const [mot, faute] of FAUTES) d = d.replace(mot, (m) => (fautes++, m[0] === m[0]!.toUpperCase() ? faute[0]!.toUpperCase() + faute.slice(1) : faute));
    l.designation = d;
  }
  return { chantier: { ...c, id: `${c.id}-fautes`, lecture }, fautes };
};

describe("le devis remis au propre", () => {
  it("la clé de son : « ardoize » = ardoise, « zing » = zinc, « lito » = liteau, « tuille » = tuile ; jamais « toile » = tuile", () => {
    expect(cleDeSon("ardoize")).toBe(cleDeSon("ardoise"));
    expect(cleDeSon("zing")).toBe(cleDeSon("zinc"));
    expect(cleDeSon("lito")).toBe(cleDeSon("liteau"));
    expect(cleDeSon("tuille")).toBe(cleDeSon("tuile"));
    expect(cleDeSon("goutiere")).toBe(cleDeSon("gouttière"));
    expect(cleDeSon("toile")).not.toBe(cleDeSon("tuile"));
  });

  it("corrige les mots du métier, jamais un chiffre, une mesure, une référence ni une autre forme du même mot", () => {
    const v = vocabulaireDuMetier(ref);
    expect(corrigerTexte("Couverture en ardoize naturelle 32×22, crochés inox de 11", v)).toBe("Couverture en ardoise naturelle 32×22, crochets inox de 11");
    expect(corrigerTexte("Faitage en tuilles HP10, goutiere zing Ø80, 12 ml", v)).toBe("Faîtage en tuiles HP10, gouttière zinc Ø80, 12 ml");
    expect(corrigerTexte("Toile de verre à poser, PVC, HPV", v)).toBe("Toile de verre à poser, PVC, HPV");
  });

  it("un vrai doute ne change rien et devient une question « Tu as écrit … , c'est bien … ? »", () => {
    const v = { connus: new Map<string, string>(), parSon: new Map([[cleDeSon("bande"), new Set(["bande", "bende"])]]) };
    const doutes: Parameters<typeof corrigerTexte>[2] = [];
    expect(corrigerTexte("Bandde de rive", v, doutes)).toBe("Bandde de rive");
    expect(doutes).toEqual([{ mot: "Bandde", candidats: ["bande", "bende"], question: "Tu as écrit « Bandde », c'est bien « bande » ou « bende » ?" }]);
    // La réponse de l'artisan remplace le mot ; « Non, c'est bien … » le garde.
    expect(corrigerTexte("Bandde de rive", v, [], { Bandde: "bande" })).toBe("Bande de rive");
    expect(corrigerTexte("Bandde de rive", v, [], { Bandde: "Bandde" })).toBe("Bandde de rive");
  });

  it("« Arretier » : l'arêtier (la ligne) ou l'arêtière (la tuile) ? Une question à l'écran ; la réponse corrige la ligne", () => {
    const c = chantiers().find((x) => x.id === "C11")!;
    const lecture = structuredClone(c.lecture) as { lignes: { designation: string }[] };
    const i = lecture.lignes.findIndex((l) => /^Arêtier/i.test(l.designation));
    expect(i).toBeGreaterThanOrEqual(0);
    lecture.lignes[i]!.designation = lecture.lignes[i]!.designation.replace(/^Arêtiers?/i, "Arretier");
    const l = parseLecture(lecture)!;
    const e = ecranDeLecture({ ref, lecture: l, answers: {}, preferences: {} });
    const q = e.questions.find((x) => x.key.startsWith("orthographe:"))!;
    expect(q.text).toMatch(/^Tu as écrit « Arretier », c'est bien /);
    expect(q.options?.at(-1)).toEqual({ label: "Non, c'est bien « Arretier »", value: "Arretier" });
    const apres = ecranDeLecture({ ref, lecture: l, answers: { [q.key]: "arêtier" }, preferences: {} });
    expect(apres.questions.some((x) => x.key.startsWith("orthographe:"))).toBe(false);
    expect(devisAuPropre(ref, l, { [q.key]: "arêtier" }).lecture.lignes[i]!.designation).toMatch(/^Arêtier/);
  });

  const cinq = chantiers().filter((c) => ["C01", "C02", "C04", "C05", "C06", "C11"].includes(c.id));
  for (const c of cinq) {
    it(`${c.id} écrit avec des fautes : la même liste que bien écrit`, () => {
      const { chantier, fautes } = avecFautes(c);
      expect(fautes).toBeGreaterThan(0);
      // Les fautes sont bien là avant, et parties après la remise au propre.
      const propre = devisAuPropre(ref, parseLecture(chantier.lecture)!);
      expect(propre.lecture.lignes.map((l) => l.designation)).toEqual(devisAuPropre(ref, parseLecture(c.lecture)!).lecture.lignes.map((l) => l.designation));
      const a = noter(c);
      const b = noter(chantier);
      expect(b.lignes).toEqual(a.lignes);
      expect(b.enTrop).toEqual(a.enTrop);
    });
  }
});
