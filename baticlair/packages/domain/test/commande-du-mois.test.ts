import { describe, expect, it } from "vitest";
import {
  affichageDeLaCommande,
  chrono,
  classerLesGrilles,
  clesDeCommande,
  comparatifDeLArtisan,
  datesDuCycle,
  deMois,
  fusionnerLesListes,
  messageAjout,
  messageTropTard,
  moisDeDepot,
  moisEnLettres,
  moisSuivant,
  phraseDeRang,
  prixChezUnNegoce,
  suiviDansLeMois,
  type CommandeDArtisan,
  type GrilleChiffree,
} from "../src/index.js";

/**
 * LA COMMANDE COMMUNE DU MOIS (Greg, 22 octobre 2026, au soir). Le cas posé à la main ici est celui de l'e2e et de
 * `docs/groupe/RECETTE.md` (« Commande du mois : les totaux à la main ») : deux artisans à Lannion et Paimpol, trois
 * négoces dont un qui ne chiffre pas les crochets.
 */
const ARDOISE = "ardoise#pièces";
const LITEAU = "liteau#m";
const CROCHET = "crochet#boîtes";

describe("le cycle raccourci (Greg, 23 octobre) : clôture le 1er et le 15 à 12 h (heure de Paris), 5 jours ouvrés aux négoces jusqu'à 18 h, relance la veille", () => {
  it("la commande du 15 octobre 2026 : clôture le jeudi 15 à 12 h (10 h UTC, heure d'été), réponse avant le jeudi 22 à 18 h (16 h UTC), relance le 21", () => {
    const d = datesDuCycle("2026-10-15");
    expect(d.clotureLe.toISOString()).toBe("2026-10-15T10:00:00.000Z");
    expect(d.reponseAvant.toISOString()).toBe("2026-10-22T16:00:00.000Z");
    expect(d.relanceLe.toISOString()).toBe("2026-10-21T16:00:00.000Z");
    // Le 1er novembre est un dimanche : clôture quand même à 12 h (heure d'hiver : 11 h UTC) ; les 5 jours ouvrés
    // courent du lundi 2 au vendredi 6.
    const nov = datesDuCycle("2026-11-01");
    expect(nov.clotureLe.toISOString()).toBe("2026-11-01T11:00:00.000Z");
    expect(nov.reponseAvant.toISOString()).toBe("2026-11-06T17:00:00.000Z");
    // Un week-end au milieu : du mardi 1er décembre, 5 jours ouvrés mènent au mardi 8.
    expect(datesDuCycle("2026-12-01").reponseAvant.toISOString()).toBe("2026-12-08T17:00:00.000Z");
    // Greg : en décembre, le 15 puis le 1er janvier (plus de clôture avancée avant Noël).
    expect(datesDuCycle("2026-12-15").clotureLe.toISOString()).toBe("2026-12-15T11:00:00.000Z");
    expect(datesDuCycle("2026-12-15").reponseAvant.toISOString()).toBe("2026-12-22T17:00:00.000Z");
    expect(moisSuivant("2026-12-15")).toBe("2027-01-01");
    expect(datesDuCycle("2027-01-01").reponseAvant.toISOString()).toBe("2027-01-08T17:00:00.000Z");
    // Les réglages : une clôture le 10 à 10 h, 3 jours ouvrés avant 17 h.
    const r = datesDuCycle("2026-10-10", { jourCloture1: 1, jourCloture2: 10, heureCloture: 10, joursOuvresReponse: 3, heureReponse: 17 });
    expect([r.clotureLe.toISOString(), r.reponseAvant.toISOString()]).toEqual(["2026-10-10T08:00:00.000Z", "2026-10-14T15:00:00.000Z"]);
  });

  it("les commandes se suivent : 1er, 15, 1er du mois suivant ; « du 15 octobre », « du 1er novembre »", () => {
    expect(clesDeCommande(new Date("2026-10-20T09:00:00Z"), undefined, 4)).toEqual(["2026-10-01", "2026-10-15", "2026-11-01", "2026-11-15"]);
    expect(moisSuivant("2026-10-01")).toBe("2026-10-15");
    expect(moisSuivant("2026-10-15")).toBe("2026-11-01");
    expect(deMois("2026-10-15")).toBe("du 15 octobre");
    expect(deMois("2026-11-01")).toBe("du 1er novembre");
    expect(moisEnLettres("2026-08-01")).toBe("1er août");
  });

  it("une liste déposée avant la clôture part avec cette commande ; après, ou si l'admin l'a close, la suivante", () => {
    expect(moisDeDepot(new Date("2026-10-10T09:00:00Z"))).toBe("2026-10-15");
    expect(moisDeDepot(new Date("2026-10-15T09:59:00Z"))).toBe("2026-10-15");
    expect(moisDeDepot(new Date("2026-10-15T10:00:00Z"))).toBe("2026-11-01");
    expect(moisDeDepot(new Date("2026-10-10T09:00:00Z"), undefined, ["2026-10-15"])).toBe("2026-11-01");
    expect(moisDeDepot(new Date("2026-12-20T09:00:00Z"))).toBe("2027-01-01");
    expect(messageTropTard("2026-10-15", "2026-11-01")).toBe("Trop tard pour le 15 octobre, ta liste part avec la commande du 1er novembre.");
    expect(messageTropTard("2026-07-01", "2026-07-15")).toBe("Trop tard pour le 1er juillet, ta liste part avec la commande du 15 juillet.");
  });

  it("le chrono : « 9 j 4 h », « 4 h 12 min », « 12 min », jamais négatif", () => {
    const t = new Date("2026-10-16T07:00:00Z");
    expect(chrono(t, new Date("2026-10-25T11:00:00Z"))).toBe("9 j 4 h");
    expect(chrono(t, new Date("2026-10-16T11:12:00Z"))).toBe("4 h 12 min");
    expect(chrono(t, new Date("2026-10-16T07:12:30Z"))).toBe("12 min");
    expect(chrono(t, new Date("2026-10-15T07:00:00Z"))).toBe("moins d'une minute");
  });
});

describe("la fusion à la clôture : produits identiques additionnés, différents à part, jamais des unités mélangées", () => {
  it("2 000 + 3 000 ardoises 32×22 = une ligne de 5 000 ; les liteaux et les crochets restent à part", () => {
    const grille = fusionnerLesListes([
      { cle: "ardoise", designation: "Ardoise naturelle 32×22", quantite: 2000, unite: "pièces" },
      { cle: "liteau", designation: "Liteau sapin traité 27×38", quantite: 400, unite: "m" },
      { cle: "ardoise", designation: "Ardoise naturelle 32×22", quantite: 3000, unite: "pièces" },
      { cle: "crochet", designation: "Crochet inox 100 mm", quantite: 10, unite: "boîtes" },
      { cle: "ardoise", designation: "Ardoise naturelle 32×22", quantite: 2, unite: "palettes" },
    ]);
    expect(grille.map((l) => [l.cle, l.quantite])).toEqual([
      [ARDOISE, 5000],
      [LITEAU, 400],
      [CROCHET, 10],
      ["ardoise#palettes", 2],
    ]);
  });
});

describe("les résultats : chaque grille appliquée à chaque artisan, livraison comprise ; le total de la commande classe", () => {
  // A à Lannion : 2 000 ardoises, 400 m de liteaux. B à Paimpol : 3 000 ardoises, 10 boîtes de crochets.
  // N1 (dépôt à Lannion, gratuit jusqu'à 20 km, 50 € au-delà) ; N2 (Paimpol, 30 km, 40 €) ; N3 (Lannion, 10 km, 60 €) sans crochets.
  // Lannion ↔ Paimpol = 40 km (cas 3 de `calculs-a-la-main`), sur place = 0.
  const A: CommandeDArtisan = { companyId: "A", chantiers: 1, distances: { N1: [0], N2: [40], N3: [0] }, lignes: [{ cle: ARDOISE, designation: "Ardoise", quantite: 2000, unite: "pièces" }, { cle: LITEAU, designation: "Liteau", quantite: 400, unite: "m" }] };
  const B: CommandeDArtisan = { companyId: "B", chantiers: 1, distances: { N1: [40], N2: [0], N3: [40] }, lignes: [{ cle: ARDOISE, designation: "Ardoise", quantite: 3000, unite: "pièces" }, { cle: CROCHET, designation: "Crochet", quantite: 10, unite: "boîtes" }] };
  const lignes = fusionnerLesListes([...A.lignes, ...B.lignes].map((l) => ({ ...l, cle: l.cle.split("#")[0]! })));
  const N1: GrilleChiffree = { negoceId: "N1", prix: { [ARDOISE]: 0.9, [LITEAU]: 0.8, [CROCHET]: 30 }, livraison: { gratuiteJusquaKm: 20, paliers: [{ jusquaKm: 1000, prixHt: 50 }], maxKm: 1000 } };
  const N2: GrilleChiffree = { negoceId: "N2", prix: { [ARDOISE]: 0.88, [LITEAU]: 0.85, [CROCHET]: 32 }, livraison: { gratuiteJusquaKm: 30, paliers: [{ jusquaKm: 1000, prixHt: 40 }], maxKm: 1000 } };
  const N3: GrilleChiffree = { negoceId: "N3", prix: { [ARDOISE]: 0.8, [LITEAU]: 0.7 }, livraison: { gratuiteJusquaKm: 10, paliers: [{ jusquaKm: 1000, prixHt: 60 }], maxKm: 1000 } };
  const classement = classerLesGrilles([N1, N2, N3], lignes, [A, B]);

  it("A : chez N1 2 120 € (1 800 + 320, livré gratuit) ; chez N2 2 140 € (1 760 + 340 + 40) ; chez N3 1 880 € (1 600 + 280)", () => {
    expect(prixChezUnNegoce(A, N1)).toMatchObject({ marchandiseHt: 2120, livraisonHt: 0, totalHt: 2120, complet: true });
    expect(prixChezUnNegoce(A, N2)).toMatchObject({ marchandiseHt: 2100, livraisonHt: 40, totalHt: 2140, complet: true });
    expect(prixChezUnNegoce(A, N3)).toMatchObject({ marchandiseHt: 1880, livraisonHt: 0, totalHt: 1880, complet: true });
  });

  it("B : chez N1 3 050 € (2 700 + 300 + 50) ; chez N2 2 960 € (2 640 + 320) ; chez N3 2 460 € sans les crochets (incomplet)", () => {
    expect(prixChezUnNegoce(B, N1)).toMatchObject({ totalHt: 3050, livraisonHt: 50, complet: true });
    expect(prixChezUnNegoce(B, N2)).toMatchObject({ totalHt: 2960, livraisonHt: 0, complet: true });
    expect(prixChezUnNegoce(B, N3)).toMatchObject({ marchandiseHt: 2400, livraisonHt: 60, totalHt: 2460, manquantes: 1, complet: false });
  });

  it("le classement sur le total : N2 (5 100 €) devant N1 (5 170 €) ; N3 (4 340 €) passe derrière, sa grille est incomplète", () => {
    expect(classement.map((g) => [g.negoceId, g.totalHt, g.complete, g.rang])).toEqual([
      ["N2", 5100, true, 1],
      ["N1", 5170, true, 2],
      ["N3", 4340, false, 3],
    ]);
  });

  it("une adresse introuvable compte au-delà du franco : jamais une livraison gratuite non vérifiée", () => {
    expect(prixChezUnNegoce({ ...A, distances: {} }, N1)).toMatchObject({ livraisonHt: 50, totalHt: 2170 });
  });

  it("le comparatif de A : N2 mis en avant (premier sur le total), mais N3 est moins cher pour lui (1 880 €) et complet pour sa liste ; B : N3 incomplet, en dernier", () => {
    const pourA = comparatifDeLArtisan(A, [N1, N2, N3], classement);
    expect(pourA.parDefaut).toBe("N2");
    expect(pourA.moinsCherPourToi).toBe("N3");
    expect(pourA.lignes.map((l) => [l.negoceId, l.totalHt])).toEqual([
      ["N3", 1880],
      ["N1", 2120],
      ["N2", 2140],
    ]);
    const pourB = comparatifDeLArtisan(B, [N1, N2, N3], classement);
    expect(pourB.moinsCherPourToi).toBe("N2");
    expect(pourB.lignes.map((l) => [l.negoceId, l.totalHt, l.complet])).toEqual([
      ["N2", 2960, true],
      ["N1", 3050, true],
      ["N3", 2460, false],
    ]);
  });

  it("pendant le chrono, le négoce ne voit que s'il est premier", () => {
    expect(phraseDeRang(1)).toBe("Vous êtes premier sur le total de la commande.");
    expect(phraseDeRang(2)).toBe("Vous n'êtes pas premier sur le total de la commande.");
  });
});

describe("l'affichage en quantités, jamais en nombre d'entreprises", () => {
  it("« Toi seul : … », « Toute la commande du 1er novembre : … », « Clôture dans 9 j », et le premier arrivé", () => {
    const toi = [{ cle: "a", designation: "Palettes d'ardoises", quantite: 3, unite: "" }];
    const a = affichageDeLaCommande({
      mois: "2026-11-01",
      toi: [{ cle: "a", designation: "Ardoises 32×22", quantite: 3, unite: "palettes" }, { cle: "l", designation: "Liteaux", quantite: 400, unite: "m" }],
      tout: [{ cle: "a", designation: "Ardoises 32×22", quantite: 52, unite: "palettes" }, { cle: "l", designation: "Liteaux", quantite: 6000, unite: "m" }],
      seul: false,
      clotureDans: "9 j",
    });
    expect(JSON.parse(JSON.stringify(a).replace(/[\u202f\u00a0]/g, " "))).toEqual({ toi: "Toi seul : 3 palettes d'ardoises 32×22, 400 m de liteaux", tout: "Toute la commande du 1er novembre : 52 palettes d'ardoises 32×22, 6 000 m de liteaux", cloture: "Clôture dans 9 j", premier: null });
    expect(affichageDeLaCommande({ mois: "2026-10-15", toi, tout: toi, seul: true, clotureDans: null }).premier).toBe("Pour l'instant, tu es le premier. Partage le lien pour faire grossir la commande.");
  });

  it("la notification d'ajout : « +6 palettes d'ardoises 32×22 viennent d'être ajoutées. L'union fait la force ! »", () => {
    expect(messageAjout([{ quantite: 6, unite: "palettes", designation: "Ardoises 32×22" }])).toBe("+6 palettes d'ardoises 32×22 viennent d'être ajoutées. L'union fait la force !");
    expect(messageAjout([{ quantite: 6, unite: "palettes", designation: "Ardoises 32×22" }, { quantite: 400, unite: "m", designation: "Liteaux" }])).toBe("+6 palettes d'ardoises 32×22 et 400 m de liteaux viennent d'être ajoutés. L'union fait la force !");
  });
});

describe("le suivi façon colis : Liste déposée → Commande close → Prix demandés → Prix reçus → Commandé", () => {
  const base = { mois: "2026-10-15", clotureDans: "2 j", reponseDans: null, grilles: 0, negoces: 0, commande: false } as const;
  it("chaque phase a sa phrase", () => {
    expect(suiviDansLeMois({ ...base, phase: "inscriptions" })).toMatchObject({ etape: 0, phrase: "Ta liste est dans la commande du 15 octobre.", aFaire: "Clôture dans 2 j. Partage le lien pour faire grossir la commande." });
    // Suivi des demandes (Greg, 24 octobre 2026) : des comptes, jamais un nom ni un prix.
    expect(suiviDansLeMois({ ...base, phase: "negoces", negoces: 10, grilles: 4, reponseDans: "3 j", resultatsLe: "Résultats le 22/10 à 18 h" })).toMatchObject({ etape: 2, phrase: "Demandes envoyées à 10 négoces de ton secteur.", aFaire: "4 négoces sur 10 ont répondu. Résultats le 22/10 à 18 h." });
    expect(suiviDansLeMois({ ...base, phase: "negoces", negoces: 0 })).toMatchObject({ etape: 1, aFaire: "Aucun négoce de ton secteur n'a encore son accès. Mets ton négoce dans la boucle." });
    // La limite passée sans aucune grille : la liste part avec la commande suivante.
    expect(suiviDansLeMois({ ...base, phase: "resultats", negoces: 5, grilles: 0 })).toMatchObject({ etape: 2, phrase: "Aucun négoce n'a répondu à la commande du 15 octobre.", aFaire: "Ta liste passe automatiquement à la commande suivante." });
    expect(suiviDansLeMois({ ...base, phase: "resultats", negoces: 3, grilles: 2 })).toMatchObject({ etape: 3, phrase: "Les prix sont là.", aFaire: "Sur 3 demandes, 2 négoces ont répondu. Voici le meilleur prix livré pour toi." });
    expect(suiviDansLeMois({ ...base, phase: "resultats", negoces: 3, grilles: 1 }).aFaire).toBe("Sur 3 demandes, 1 négoce a répondu. Compare son prix à ta dernière facture.");
    expect(suiviDansLeMois({ ...base, phase: "resultats", negoces: 3, grilles: 2, commande: true }).etapes.map((e) => e.fait)).toEqual([true, true, true, true, true]);
  });
});
