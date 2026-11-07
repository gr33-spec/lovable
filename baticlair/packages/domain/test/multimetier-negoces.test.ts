import { describe, expect, it } from "vitest";
import {
  combinaisonsDeLArtisan,
  concerne,
  familleDeLaLigne,
  libelleDeCombinaison,
  lignesDuNegoce,
  phraseDeLivraisons,
  rangSurSonPerimetre,
  type CommandeDArtisan,
  type GrilleChiffree,
  type LigneDeGrille,
} from "../src/index.js";

// LISTES MULTIMÉTIERS, NÉGOCES GÉNÉRALISTES OU SPÉCIALISTES (Greg, 25 octobre 2026) : l'app range chaque ligne dans sa
// famille ; un spécialiste ne reçoit que ses familles ; l'artisan voit les meilleures combinaisons livraison comprise.

const TUILES: LigneDeGrille = { cle: "tuile#pièces", designation: "Tuile terre cuite Romane", quantite: 100, unite: "pièces", famille: "couverture" };
const PLACO: LigneDeGrille = { cle: "ba13#plaques", designation: "Plaque de plâtre BA13 2,50 × 1,20 m", quantite: 50, unite: "plaques", famille: "second_oeuvre" };
const paliers = (prix: number) => ({ gratuiteJusquaKm: 10, paliers: [{ jusquaKm: 100, prixHt: prix }], maxKm: 100 });
const grille = (negoceId: string, prix: Record<string, number>, livraison = 50): GrilleChiffree => ({ negoceId, prix, livraison: paliers(livraison) });
const artisan = (lignes: LigneDeGrille[]): CommandeDArtisan => ({ companyId: "A", lignes, chantiers: 1, distances: { G: [40], C: [40], P: [40] } });
const nom = (id: string) => ({ G: "Généraliste", C: "Couverture Pro", P: "Placo Pro" })[id] ?? id;

describe("l'app range chaque ligne dans sa famille, sans rien demander à l'artisan", () => {
  it("par les mots du comptoir", () => {
    expect(familleDeLaLigne("Plaque de plâtre BA13", { defaut: "couverture" })).toBe("second_oeuvre");
    expect(familleDeLaLigne("Rail R48 3 m", { defaut: "couverture" })).toBe("second_oeuvre");
    expect(familleDeLaLigne("Tuile Romane canal", { defaut: "second_oeuvre" })).toBe("couverture");
    expect(familleDeLaLigne("Mortier d'étanchéité pour solin, sac 25 kg", { defaut: "maconnerie" })).toBe("couverture");
    expect(familleDeLaLigne("Câble R2V 3G2,5 couronne 100 m", { defaut: "couverture" })).toBe("electricite");
  });
  it("le lot lu par le modèle passe avant les mots ; une ligne inconnue garde le métier de la liste", () => {
    expect(familleDeLaLigne("Plaque de plâtre BA13", { familleDuLot: "couverture", defaut: "couverture" })).toBe("couverture");
    expect(familleDeLaLigne("Article mystère", { defaut: "plomberie" })).toBe("plomberie");
  });
});

describe("un spécialiste ne reçoit que ses familles", () => {
  const specialisteCouverture = { generaliste: false, familles: ["couverture"] };
  it("sa grille ne porte que ses lignes ; le généraliste reçoit tout", () => {
    expect(lignesDuNegoce([TUILES, PLACO], specialisteCouverture)).toEqual([TUILES]);
    expect(lignesDuNegoce([TUILES, PLACO], { generaliste: true, familles: [] })).toEqual([TUILES, PLACO]);
  });
  it("un cycle avec seulement du placo ne le concerne pas : rien ne lui part", () => {
    expect(concerne([PLACO], specialisteCouverture)).toBe(false);
    expect(concerne([PLACO], { generaliste: true, familles: [] })).toBe(true);
  });
  it("une ligne d'avant le multimétier (sans famille) prend celle du cycle", () => {
    const { famille: _f, ...ancienne } = TUILES;
    expect(lignesDuNegoce([ancienne], specialisteCouverture, "couverture")).toHaveLength(1);
  });
});

describe("les meilleures combinaisons, livraison comprise", () => {
  it("les spécialistes gagnent malgré deux livraisons", () => {
    const grilles = [grille("G", { [TUILES.cle]: 10, [PLACO.cle]: 8 }), grille("C", { [TUILES.cle]: 9.5 }), grille("P", { [PLACO.cle]: 7.5 })];
    const r = combinaisonsDeLArtisan(artisan([TUILES, PLACO]), grilles);
    expect(r.sansPrix).toEqual([]);
    const [premiere, ...autres] = r.combinaisons;
    // 950 + 375 de marchandise, 50 + 50 de livraison.
    expect(premiere).toMatchObject({ totalHt: 1425, livraisons: 2, ecartHt: 0, toutChez: null });
    expect(libelleDeCombinaison(premiere!, nom)).toBe("Couverture chez Couverture Pro, second œuvre chez Placo Pro");
    // « Tout chez » le généraliste reste proposé : 1 400 + 50, 25 € de plus, une seule livraison.
    const tout = r.combinaisons.find((c) => c.toutChez === "G")!;
    expect(tout).toMatchObject({ totalHt: 1450, livraisons: 1, ecartHt: 25 });
    expect(libelleDeCombinaison(tout, nom)).toBe("Tout chez Généraliste");
    expect(phraseDeLivraisons(tout.livraisons)).toBe("1 livraison");
    expect(r.combinaisons).toHaveLength(3);
    expect(autres.map((c) => c.totalHt)).toEqual([...autres.map((c) => c.totalHt)].sort((a, b) => a - b));
  });

  it("le généraliste gagne grâce à la livraison unique", () => {
    const grilles = [grille("G", { [TUILES.cle]: 10, [PLACO.cle]: 8 }, 80), grille("C", { [TUILES.cle]: 9.5 }, 80), grille("P", { [PLACO.cle]: 7.5 }, 80)];
    const r = combinaisonsDeLArtisan(artisan([TUILES, PLACO]), grilles);
    // Tout chez G : 1 400 + 80 = 1 480 ; spécialistes : 1 325 + 160 = 1 485.
    expect(r.combinaisons[0]).toMatchObject({ toutChez: "G", totalHt: 1480, livraisons: 1, ecartHt: 0 });
    expect(r.combinaisons[1]).toMatchObject({ totalHt: 1485, livraisons: 2, ecartHt: 5 });
  });

  it("chaque négoce retenu ne reçoit que sa partie", () => {
    const grilles = [grille("G", { [TUILES.cle]: 10, [PLACO.cle]: 8 }), grille("C", { [TUILES.cle]: 9.5 }), grille("P", { [PLACO.cle]: 7.5 })];
    const c = combinaisonsDeLArtisan(artisan([TUILES, PLACO]), grilles).combinaisons[0]!;
    expect(c.parts.map((p) => [p.negoceId, p.cles])).toEqual([
      ["C", [TUILES.cle]],
      ["P", [PLACO.cle]],
    ]);
    expect(c.parts.map((p) => p.totalHt)).toEqual([1000, 425]);
  });

  it("une grille partielle d'un spécialiste est acceptée ; une famille que personne n'a chiffrée est dite à part", () => {
    const r = combinaisonsDeLArtisan(artisan([TUILES, PLACO]), [grille("C", { [TUILES.cle]: 9.5 })]);
    expect(r.combinaisons).toEqual([expect.objectContaining({ totalHt: 1000, toutChez: null })]);
    expect(r.sansPrix).toEqual(["second_oeuvre"]);
  });

  it("un négoce qui ne livre pas l'artisan n'entre dans aucune combinaison", () => {
    const loin: CommandeDArtisan = { ...artisan([TUILES]), distances: { C: [150], G: [40] } };
    const r = combinaisonsDeLArtisan(loin, [grille("C", { [TUILES.cle]: 1 }), grille("G", { [TUILES.cle]: 10 })]);
    expect(r.combinaisons.map((c) => c.toutChez)).toEqual(["G"]);
  });
});

describe("le rang d'un négoce se calcule sur ses seules lignes", () => {
  const grilles = [grille("G", { [TUILES.cle]: 10, [PLACO.cle]: 8 }), grille("C", { [TUILES.cle]: 9.5 }), grille("P", { [PLACO.cle]: 7.5 })];
  const commandes = [artisan([TUILES, PLACO])];
  it("le spécialiste couverture est premier sur la couverture, sans rien savoir du placo", () => {
    expect(rangSurSonPerimetre(grilles[1]!, { generaliste: false, familles: ["couverture"] }, grilles, [TUILES, PLACO], commandes)).toBe(1);
  });
  it("le généraliste n'a en face aucune autre grille complète : il est premier sur toute la liste", () => {
    expect(rangSurSonPerimetre(grilles[0]!, { generaliste: true, familles: [] }, grilles, [TUILES, PLACO], commandes)).toBe(1);
  });
});
