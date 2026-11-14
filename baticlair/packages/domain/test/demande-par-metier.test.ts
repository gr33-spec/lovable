import { describe, expect, it } from "vitest";
import { cocherSpecialite, repartirLaDemande, specialiteDeLaLigne, type LigneARepartir, type NegoceDestinataire } from "../src/index.js";

/**
 * LA DEMANDE CLASSIQUE TRIE SES LIGNES PAR MÉTIER DU NÉGOCE (Greg, 14 novembre 2026 ; recette complète du 13, B7 : un négoce
 * « Zinguerie seule » et un négoce « Étanchéité seule » recevaient les six lignes d'une liste de couvreur, ardoises comprises).
 */
const ligne = (cle: string, libelle: string): LigneARepartir => ({ cle, libelle, specialite: specialiteDeLaLigne(libelle, "roofing") });
const LISTE = [ligne("a", "Ardoise naturelle 32×22"), ligne("l", "Liteau 27×40"), ligne("g", "Gouttière zinc demi-ronde de 25"), ligne("n", "Naissance zinc"), ligne("d", "Descente zinc Ø 80"), ligne("m", "Membrane EPDM 1,14 mm")];
const negoce = (id: string, ...specialites: string[]): NegoceDestinataire => ({ id, nom: id, specialites });

describe("demande de prix classique : qui reçoit quoi", () => {
  it("chaque ligne a sa spécialité : ses mots, sinon le métier de la liste", () => {
    expect(LISTE.map((l) => l.specialite)).toEqual(["couverture", "couverture", "zinguerie", "zinguerie", "zinguerie", "etancheite"]);
    expect(specialiteDeLaLigne("Peinture acrylique blanc mat", "painting")).toBe("isolation_platrerie");
    expect(specialiteDeLaLigne("Article inconnu", null)).toBe("autre");
  });

  it("un spécialiste ne reçoit que ses lignes ; un généraliste et un négoce sans spécialité déclarée reçoivent tout", () => {
    const r = repartirLaDemande(LISTE, [negoce("couv", "couverture"), negoce("zing", "zinguerie"), negoce("etan", "etancheite"), negoce("gene", "generaliste"), negoce("vide")]);
    const de = (id: string) => r.groupes.find((g) => g.negoces.includes(id))!.lignes;
    expect(de("couv")).toEqual(["a", "l"]);
    expect(de("zing")).toEqual(["g", "n", "d"]);
    expect(de("etan")).toEqual(["m"]);
    expect(de("gene")).toEqual(["a", "l", "g", "n", "d", "m"]);
    // Les deux qui reçoivent tout partent dans la même demande.
    expect(r.groupes.find((g) => g.negoces.includes("gene"))!.negoces).toEqual(["gene", "vide"]);
    expect(r).toMatchObject({ sansSpecialiste: [], sansLigne: [], toutPourTous: false });
  });

  it("un négoce peut couvrir plusieurs métiers", () => {
    const r = repartirLaDemande(LISTE, [negoce("deux", "couverture", "zinguerie"), negoce("etan", "etancheite")]);
    expect(r.groupes).toEqual([{ negoces: ["deux"], lignes: ["a", "l", "g", "n", "d"] }, { negoces: ["etan"], lignes: ["m"] }]);
  });

  it("aucune ligne n'est perdue : celle que personne ne couvre part chez tous, et se dit ; un négoce sans ligne se dit, sans demande vide", () => {
    const r = repartirLaDemande(LISTE, [negoce("couv", "couverture"), negoce("elec", "electricite")]);
    expect(r.sansSpecialiste.map((l) => l.cle)).toEqual(["g", "n", "d", "m"]);
    expect(r.groupes).toEqual([{ negoces: ["couv"], lignes: ["a", "l", "g", "n", "d", "m"] }, { negoces: ["elec"], lignes: ["g", "n", "d", "m"] }]);
    const seul = repartirLaDemande([ligne("a", "Ardoise naturelle 32×22")], [negoce("couv", "couverture"), negoce("zing", "zinguerie")]);
    expect(seul).toMatchObject({ groupes: [{ negoces: ["couv"], lignes: ["a"] }], sansLigne: ["zing"], toutPourTous: false });
  });

  it("rien à trier : tous les négoces reçoivent toute la liste", () => {
    expect(repartirLaDemande(LISTE, [negoce("a", "couverture", "zinguerie", "etancheite"), negoce("b", "generaliste")]).toutPourTous).toBe(true);
  });

  it("« négoce couverture » coche d'office Couverture, Zinguerie et Étanchéité ; on décoche ce qu'on ne vend pas", () => {
    expect(cocherSpecialite([], "couverture", true)).toEqual(["couverture", "zinguerie", "etancheite"]);
    expect(cocherSpecialite(["couverture", "zinguerie", "etancheite"], "etancheite", false)).toEqual(["couverture", "zinguerie"]);
    expect(cocherSpecialite(["charpente"], "zinguerie", true)).toEqual(["charpente", "zinguerie"]);
    expect(cocherSpecialite(["couverture", "zinguerie"], "couverture", false)).toEqual(["zinguerie"]);
  });
});
