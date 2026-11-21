/**
 * TEMPS TROIS, les quantités (directive du fondateur, 2026-10-12 ; référentiel électricité, sections 2, 3 et 6) : le code
 * convertit la fiche en unités commandables avec le référentiel, zéro IA ; une fois tout répondu, la liste est verte (§51.6).
 *  - « Prises 9 + 9 + 6 : une ligne 24, c'est le quantitatif. Garde la trace des trois lignes du devis dans la raison de
 *    la ligne. »
 *  - Section 6 du référentiel électricité (devis 7954, 10 logements) : « Le test échoue si une seule question porte sur
 *    une donnée écrite au devis, si une ligne sort en « point » ou en « U », ou si un compte s'écarte de plus de 3 % des
 *    valeurs ci-dessus. »
 *
 * Décisions du fondateur (2026-10-12), qui corrigent les valeurs de la section 6 :
 *  - « Prises réfrigérateur : oui, prises 16 A, compte-les et mets à jour le test » : 161 + 10 = 171 prises, +10 boîtes,
 *    +80 m de 3G2,5, +80 m de gaine Ø20 ;
 *  - « Va-et-vient : deux interrupteurs par VV, le test passe à 28 (sauf ligne « 3 points » = permutateur en plus) » ;
 *  - « Longueurs : garde la mention « ratios en cours de validation » » (section 7).
 */
import { describe, expect, it } from "vitest";
import { ecranDeLecture, ELECTRICITE_REFERENTIAL, exportPourLecture, fournituresElectriques, type LectureDevis } from "../src/index.js";
import { lectureAttendue7954 } from "./support/lecture-7954.js";

const ref = ELECTRICITE_REFERENTIAL;
const REFRIGERATEURS = 10;

const liste = (lecture: LectureDevis, answers: Record<string, unknown> = {}) => {
  const e = ecranDeLecture({ ref, lecture, answers: answers as never });
  const rows = e.purchase.screen.groups.flatMap((g) => g.rows);
  const elec = e.purchase.toBuy.filter((b) => b.key.startsWith("elec:")).map((b) => {
    const row = rows.find((r) => r.itemKey === b.key);
    return { label: b.label, quantity: b.quantity, approx: b.approx, precision: b.precision ?? "", couleur: row?.status === "ok" ? "vert" : "orange", raison: row?.reason ?? "", waitsOn: b.waitsOn ?? [] };
  });
  return { e, elec, rows };
};
const article = (lignes: ReturnType<typeof liste>["elec"], label: RegExp) => {
  const found = lignes.filter((l) => label.test(l.label));
  expect(found, `une seule ligne ${label}`).toHaveLength(1);
  return found[0]!;
};
const nombre = (q: string | null) => Number((q ?? "").replace(/\D/g, ""));
const proche = (got: number, want: number) => expect(Math.abs(got - want) / want, `${got} au lieu de ${want}`).toBeLessThanOrEqual(0.03);

describe("temps trois : « Prises 9 + 9 + 6 : une ligne 24 », avec la trace des lignes du devis", () => {
  it("trois lignes de prises en font une, et la raison garde les trois lignes", () => {
    const [prises] = fournituresElectriques([
      { id: "a", ref: "12", point: "prise-16a", quantite: 9, attend: [] },
      { id: "b", ref: "25", point: "prise-16a", quantite: 9, attend: [] },
      { id: "c", ref: "38", point: "prise-16a", quantite: 6, attend: [] },
    ]);
    expect(prises).toMatchObject({ label: "Prise 2P+T 16 A", quantite: "24 pièces", precision: "9 + 9 + 6, lignes 12, 25 et 38 du devis", lineIds: ["a", "b", "c"] });
  });

  it("un câble au mètre se commande en couronnes de 100 m, arrondies au-dessus, avec le besoin en mètres", () => {
    const out = fournituresElectriques([{ id: "a", ref: "4", point: "prise-16a", quantite: 24, attend: [] }]);
    expect(out.find((a) => a.label === "Câble rigide 3G2,5")).toMatchObject({ quantite: "2 couronnes de 100 m", approx: "192 m à poser", order: { count: "2", unit: "couronnes de 100 m" } });
  });

  it("« 3 points » : deux va-et-vient et un permutateur en plus (décision du fondateur, 2026-10-12)", () => {
    const out = fournituresElectriques([{ id: "a", ref: "7", point: "va-et-vient-3", quantite: 2, attend: [] }]);
    expect(out.find((a) => a.label === "Interrupteur va-et-vient")).toMatchObject({ quantite: "4 pièces" });
    expect(out.find((a) => a.label === "Permutateur")).toMatchObject({ quantite: "2 pièces" });
  });

  it("le modèle reçoit la liste des points dans l'export du référentiel électricité, et seulement là", () => {
    expect(exportPourLecture(ref)).toMatch(/POINTS ÉLECTRIQUES[\s\S]*prise-16a/);
  });
});

describe("temps trois, devis 7954 : les comptes de la section 6 du référentiel électricité", () => {
  const { elec, e } = liste(lectureAttendue7954());

  it("les lignes de point ne sortent plus une à une, ni en « point » ni en « U »", () => {
    const labels = e.purchase.toBuy.map((b) => b.label);
    expect(labels.filter((l) => /^(LAMP|PRISE DE COURANT|VA ET VIENT|ALIMENTATION RADIATEUR)/.test(l))).toEqual([]);
    for (const l of elec) expect(l.quantity).toMatch(/^\d[\d\s]* (pièces?|couronnes? de 100 m|boîtes? de 100 m)$/);
  });

  it("appareillage, boîtes et DCL : à 3 % de la section 6", () => {
    proche(nombre(article(elec, /^Interrupteur simple/).quantity), 58);
    expect(nombre(article(elec, /^Interrupteur va-et-vient/).quantity)).toBe(28); // décision du fondateur : 2 par VV
    expect(elec.filter((l) => /^Permutateur/.test(l.label))).toEqual([]); // aucune ligne « 3 points » dans 7954
    expect(nombre(article(elec, /^Bouton poussoir/).quantity)).toBe(3);
    expect(nombre(article(elec, /^Télérupteur/).quantity)).toBe(1);
    proche(nombre(article(elec, /^Prise 2P\+T 16 A/).quantity), 161 + REFRIGERATEURS);
    proche(nombre(article(elec, /^Prise 2P\+T 20 A/).quantity), 23);
    proche(nombre(article(elec, /^Sortie de câble 32 A/).quantity), 20);
    proche(nombre(article(elec, /^Sortie de câble avec fil pilote/).quantity), 59);
    proche(nombre(article(elec, /^Prise RJ45/).quantity), 28);
    proche(nombre(article(elec, /^Prise TV/).quantity), 12);
    const boites = nombre(article(elec, /prof\. 40/).quantity) + nombre(article(elec, /prof\. 50/).quantity);
    proche(boites, 392 + REFRIGERATEURS);
    expect(nombre(article(elec, /prof\. 50/).quantity)).toBe(20);
    proche(nombre(article(elec, /^Boîte DCL/).quantity), 74);
  });

  it("câbles et gaines : les mètres à 3 % de la section 6, en couronnes et boîtes de 100 m", () => {
    const metres = (label: RegExp) => Number(article(elec, label).approx!.replace(/[^\d,]/g, "").replace(",", "."));
    const cas: [RegExp, number, string][] = [
      [/3G1,5/, 734, "8 couronnes de 100 m"],
      [/4G1,5/, 556, "6 couronnes de 100 m"],
      [/2×1,5/, 12, "1 couronne de 100 m"],
      [/3G2,5/, 1472 + REFRIGERATEURS * 8, "16 couronnes de 100 m"], // réfrigérateurs comptés (décision du fondateur)
      [/3G6/, 160, "2 couronnes de 100 m"],
      [/^Câble réseau grade 2/, 336, "4 boîtes de 100 m"],
      [/coaxial/, 144, "2 couronnes de 100 m"],
      [/Ø20/, 3254 + REFRIGERATEURS * 8, "34 couronnes de 100 m"], // réfrigérateurs comptés (décision du fondateur)
      [/Ø25/, 160, "2 couronnes de 100 m"],
    ];
    for (const [label, m, quantite] of cas) {
      proche(metres(label), m);
      expect(article(elec, label).quantity).toBe(quantite);
    }
  });

  it("chaque ligne garde la trace des lignes du devis qui la donnent", () => {
    expect(article(elec, /^Prise 2P\+T 16 A/).precision).toMatch(/^\d+ \+ \d+ \+ .*lignes .* du devis/);
    expect(article(elec, /^Prise 2P\+T 16 A/).precision).toContain("lignes");
  });

  it("l'appareillage attend la teinte (orange), les boîtes et les câbles non ; la teinte répondue, il passe au vert avec elle", () => {
    expect(article(elec, /^Interrupteur simple/)).toMatchObject({ couleur: "orange", raison: "Teinte à préciser" });
    expect(article(elec, /prof\. 40/).couleur).toBe("vert");
    expect(article(elec, /3G2,5/).couleur).toBe("vert");
    const apres = liste(lectureAttendue7954(), { "fiche:teinte_appareillage": "blanc" }).elec;
    const inter = article(apres, /^Interrupteur simple/);
    expect(inter.couleur).toBe("vert");
    expect(inter.precision).toMatch(/Teinte de l'appareillage : Blanc$/);
  });

  it("une fois tout répondu, toutes les fournitures des points sont vertes (§51.6)", () => {
    const tout = { "fiche:teinte_appareillage": "blanc", "fiche:usage_alimentations_radiateur": "10 en attente pour sèche-serviettes et réserve", "fiche:logement_bloc_page_12": "Logement 1" };
    const { elec: apres } = liste(lectureAttendue7954(), tout);
    expect(apres.filter((l) => l.couleur !== "vert")).toEqual([]);
  });
});
