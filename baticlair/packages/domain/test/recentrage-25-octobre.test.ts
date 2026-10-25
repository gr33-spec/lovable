import { describe, expect, it } from "vitest";
import {
  comparerLesReponses,
  cyclesAuChoix,
  cycleConseille,
  droitsDe,
  debutHistorique,
  indicateursDuMois,
  ligneGroupable,
  lireTableNombres,
  lireZonesActives,
  mesPrix,
  passageParticipation,
  payantOffertDansLaZone,
  phraseDernierPrix,
  phraseParticipants,
  plusHeuresOuvrees,
  referenceStricte,
  relanceDue,
  resultatsNegoce,
  validiteAcceptee,
  verifierDroit,
  volumeAtteint,
  blocLienChiffrage,
} from "../src/index.js";

/**
 * RECENTRAGE (Greg, 25 octobre 2026) : demande perso, « Mes prix », regroupements de gros articles identiques, gratuit
 * et payant, hypothèses de lancement. Tests permanents des règles du domaine.
 */

const cle = (d: string) => {
  const r = referenceStricte(d);
  return r.ok ? r.reference.cle : r.raison;
};

describe("référence stricte : une 30×20 ne rejoint jamais une 32×22", () => {
  it("deux formats différents, deux clés", () => {
    expect(cle("Ardoise naturelle 30x20 Espagne 1er choix")).not.toBe(cle("Ardoise naturelle 32x22 Espagne 1er choix"));
  });
  it("le même article écrit autrement : la même clé", () => {
    expect(cle("Ardoise naturelle 32 × 22 cm Espagne 1er choix")).toBe(cle("ARDOISE 32x22 espagnole premier choix"));
  });
  it("une origine, une qualité ou une marque précisée d'un côté seulement : pas la même clé", () => {
    expect(cle("Ardoise 32x22 Espagne")).not.toBe(cle("Ardoise 32x22"));
    expect(cle("Ardoise 32x22 1er choix")).not.toBe(cle("Ardoise 32x22 2e choix"));
    expect(cle("Ardoise 32x22 Cupa")).not.toBe(cle("Ardoise 32x22"));
  });
  it("en cas de doute, pas de regroupement", () => {
    expect(referenceStricte("Ardoise naturelle Espagne")).toEqual({ ok: false, raison: "attribut_manquant" });
    expect(referenceStricte("Ardoise 32x22 ou 30x20")).toEqual({ ok: false, raison: "ambigu" });
    expect(referenceStricte("Zinc naturel")).toEqual({ ok: false, raison: "attribut_manquant" });
    expect(referenceStricte("Tuile romane canal")).toEqual({ ok: false, raison: "type_inconnu" });
  });
  it("les petits accessoires ne se regroupent jamais", () => {
    expect(referenceStricte("Crochet inox 100 mm")).toEqual({ ok: false, raison: "accessoire" });
    expect(referenceStricte("Clous cuivre pour ardoise 32x22")).toEqual({ ok: false, raison: "accessoire" });
    // « Ardoise posée au crochet » reste une ardoise.
    expect(referenceStricte("Ardoise 32x22 posée au crochet").ok).toBe(true);
  });
  it("le zinc : épaisseur, largeur, aspect", () => {
    const r = referenceStricte("Bobine zinc naturel 0,65 mm largeur 500 mm");
    expect(r.ok && r.reference.attributs).toEqual({ epaisseur: "0.65", largeur: "500", aspect: "naturel" });
    expect(cle("Zinc naturel 0,65 mm")).not.toBe(cle("Zinc naturel 0,80 mm"));
  });
  it("le bois et le plâtre : la section et le format", () => {
    expect(cle("Liteau sapin traité 27x38")).not.toBe(cle("Liteau sapin traité 27x40"));
    const placo = referenceStricte("Plaque de plâtre BA13 2,50 × 1,20 m");
    expect(placo.ok && placo.reference.attributs.format).toBe("250x120");
  });
});

describe("une ligne groupable : famille, référence, 1 000 € HT estimés", () => {
  const reperes = lireTableNombres("ardoise:pieces=1.2,zinc:m=18");
  it("estimée sur le repère au-dessus du seuil", () => {
    const r = ligneGroupable({ designation: "Ardoise naturelle 32x22 Espagne 1er choix", quantite: 1800, unite: "pièces", famille: "couverture" }, { reperes });
    expect(r).toMatchObject({ ok: true, ligne: { estimeHt: 2160, source: "repere" } });
  });
  it("le dernier prix de l'artisan passe avant le repère", () => {
    const r = ligneGroupable({ designation: "Ardoise 32x22 Espagne", quantite: 1800, unite: "pièces", famille: "couverture" }, { reperes, dernierPrix: () => 0.5 });
    expect(r).toEqual({ ok: false, raison: "sous_le_seuil" });
  });
  it("sans estimation, pas de regroupement", () => {
    expect(ligneGroupable({ designation: "Ardoise 32x22", quantite: 1800, unite: "pièces", famille: "couverture" })).toEqual({ ok: false, raison: "sans_estimation" });
  });
  it("une ligne non groupable est refusée", () => {
    expect(ligneGroupable({ designation: "Crochet inox 100 mm", quantite: 5000, unite: "pièces", famille: "couverture" }, { reperes })).toEqual({ ok: false, raison: "accessoire" });
    expect(ligneGroupable({ designation: "Ardoise 32x22", quantite: 1800, unite: "pièces", famille: "electricite" }, { reperes })).toEqual({ ok: false, raison: "famille" });
  });
});

describe("regroupement : volume minimum, anonymat, statuts, validité, cycles", () => {
  it("volume minimum par famille", () => {
    expect(volumeAtteint("couverture", 4999)).toBe(false);
    expect(volumeAtteint("couverture", 5000)).toBe(true);
    expect(volumeAtteint("couverture", 100, lireTableNombres("couverture=50"))).toBe(true);
  });
  it("sous le seuil d'anonymat : seulement « Regroupement en cours », jamais de nombre ni de ville", () => {
    expect(phraseParticipants(2, "22")).toEqual({ titre: "Regroupement en cours", detail: null });
    expect(phraseParticipants(7, "22")).toEqual({ titre: "5+ entreprises", detail: "Département 22" });
  });
  it("jamais de commande annoncée avant le clic « Commander »", () => {
    expect(passageParticipation("intention", "commande")).toBe(false);
    expect(passageParticipation("intention", "quantite_confirmee")).toBe(true);
    expect(passageParticipation("quantite_confirmee", "commande")).toBe(true);
  });
  it("la validité d'une offre : 7 jours au moins, fixée par le négoce", () => {
    expect(validiteAcceptee(6)).toBe(false);
    expect(validiteAcceptee(7)).toBe(true);
  });
  it("ce cycle ou le suivant : le 1er et le 15 à midi", () => {
    const choix = cyclesAuChoix(new Date("2026-10-25T10:00:00Z"));
    expect(choix.map((c) => c.cle)).toEqual(["2026-11-01", "2026-11-15"]);
    expect(choix[0]!.clotureLe.toISOString()).toBe("2026-11-01T11:00:00.000Z");
    expect(cycleConseille(choix, new Date("2026-11-30"))).toBe("2026-11-01");
    expect(cycleConseille(choix, null)).toBe("2026-11-01");
  });
});

describe("gratuit et payant", () => {
  const gratuit = droitsDe({ abonne: false, essai: false, zoneOfferte: false, zoneActive: true });
  const payant = droitsDe({ abonne: true, essai: false, zoneOfferte: false, zoneActive: true });
  it("gratuit : 2 lectures, un seul négoce, pas de regroupement, 3 mois de prix", () => {
    expect(gratuit).toMatchObject({ formule: "gratuit", lecturesParMois: 2, negocesParDemande: 1, regroupements: false, historiqueMois: 3 });
    expect(verifierDroit(gratuit, { type: "envoi", negoces: 1 })).toEqual({ ok: true });
    expect(verifierDroit(gratuit, { type: "envoi", negoces: 2 })).toMatchObject({ ok: false, refus: "negoces" });
    expect(verifierDroit(gratuit, { type: "lecture", dejaCeMois: 2 })).toMatchObject({ ok: false, refus: "lectures" });
    expect(debutHistorique(gratuit, new Date("2026-10-25T00:00:00Z"))?.toISOString()).toBe("2026-07-25T00:00:00.000Z");
  });
  it("payant : 5 négoces, regroupements, tout l'historique", () => {
    expect(payant).toMatchObject({ formule: "payant", raison: "abonne", lecturesParMois: null, negocesParDemande: 5, regroupements: true, historiqueMois: null });
    expect(verifierDroit(payant, { type: "envoi", negoces: 5 })).toEqual({ ok: true });
    expect(verifierDroit(payant, { type: "envoi", negoces: 6 })).toMatchObject({ ok: false });
  });
  it("hors zone active : tout sauf les regroupements", () => {
    const hors = droitsDe({ abonne: true, essai: false, zoneOfferte: false, zoneActive: false });
    expect(hors.regroupements).toBe(false);
    expect(verifierDroit(hors, { type: "regroupement", zoneActive: false })).toMatchObject({ ok: false, refus: "zone", phrase: expect.stringContaining("arrivent bientôt dans ton département") });
  });
  it("zone sous 10 artisans : payant offert ; seuil franchi : 30 jours de préavis", () => {
    const maintenant = new Date("2026-11-10T00:00:00Z");
    expect(payantOffertDansLaZone({ artisansActifs: 9, seuilFranchiLe: null }, maintenant)).toEqual({ offert: true, preavisJusquau: null });
    expect(payantOffertDansLaZone({ artisansActifs: 10, seuilFranchiLe: new Date("2026-11-01T00:00:00Z") }, maintenant)).toEqual({ offert: true, preavisJusquau: new Date("2026-12-01T00:00:00Z") });
    expect(payantOffertDansLaZone({ artisansActifs: 12, seuilFranchiLe: new Date("2026-10-01T00:00:00Z") }, maintenant).offert).toBe(false);
    expect(droitsDe({ abonne: false, essai: false, zoneOfferte: true, zoneActive: true })).toMatchObject({ formule: "payant", raison: "zone_offerte" });
  });
  it("les zones actives : le 22 par défaut", () => {
    expect(lireZonesActives(undefined)).toEqual(["22"]);
    expect(lireZonesActives("22, 29,35")).toEqual(["22", "29", "35"]);
  });
});

describe("demande perso : relance, comparaison livrée, e-mail", () => {
  it("relance à 48 h ouvrées : un envoi du vendredi 10 h se relance le mardi 10 h", () => {
    const vendredi = new Date("2026-10-23T08:00:00Z");
    expect(plusHeuresOuvrees(vendredi, 48).toISOString()).toBe("2026-10-27T08:00:00.000Z");
    expect(relanceDue({ envoyeLe: vendredi, reponduLe: null, relanceLe: null }, new Date("2026-10-26T09:00:00Z"), null)).toBe(false);
    expect(relanceDue({ envoyeLe: vendredi, reponduLe: null, relanceLe: null }, new Date("2026-10-27T08:00:00Z"), null)).toBe(true);
    expect(relanceDue({ envoyeLe: vendredi, reponduLe: new Date(), relanceLe: null }, new Date("2026-10-28T08:00:00Z"), null)).toBe(false);
    expect(relanceDue({ envoyeLe: vendredi, reponduLe: null, relanceLe: null }, new Date("2026-10-28T08:00:00Z"), new Date("2026-10-27T00:00:00Z"))).toBe(false);
  });
  it("comparées livraison comprise : complètes d'abord, écart en €", () => {
    const lignes = [
      { cle: "a", designation: "Ardoise 32x22", quantite: 1000, unite: "pièces" },
      { cle: "b", designation: "Liteau 27x38", quantite: 100, unite: "m" },
    ];
    const depose = new Date("2026-10-25T08:00:00Z");
    const r = comparerLesReponses(
      lignes,
      [
        { negoceId: "x", nom: "X", prix: { a: 1, b: 1 }, livraisonHt: 80, delaiJours: 3, validiteJours: 7, deposeLe: depose },
        { negoceId: "y", nom: "Y", prix: { a: 1.05, b: 1 }, livraisonHt: 0, delaiJours: 2, validiteJours: 14, deposeLe: depose },
        { negoceId: "z", nom: "Z", prix: { a: 0.5 }, livraisonHt: 0, delaiJours: null, validiteJours: 7, deposeLe: depose },
      ],
      new Date("2026-10-26T08:00:00Z"),
    );
    expect(r.map((o) => [o.nom, o.totalLivreHt, o.ecartHt, o.complete])).toEqual([
      ["Y", 1150, 0, true],
      ["X", 1180, 30, true],
      ["Z", 500, null, false],
    ]);
  });
  it("le bloc ajouté au mail du négoce : vouvoiement, but, lien de chiffrage", () => {
    const b = blocLienChiffrage({ but: "commander", lien: "https://test.mobiiz.fr/chiffrer/abc", nomApp: "Mobiiz" });
    expect(b).toContain("Je compte commander");
    expect(b).toContain("https://test.mobiiz.fr/chiffrer/abc");
    expect(b).not.toMatch(/\btu\b|\bton\b|\bta\b/);
  });
});

describe("« Mes prix » : seulement les siens, dernier et meilleur prix", () => {
  const prix = [
    { designation: "Ardoise 32x22 Espagne", unite: "pièces", prixHt: 1.2, negoce: "A", date: new Date("2026-06-01"), source: "recu" as const },
    { designation: "ardoise 32 × 22 espagnole", unite: "pc", prixHt: 1.1, negoce: "B", date: new Date("2026-09-01"), source: "paye" as const },
    { designation: "Ardoise 32x22 Espagne", unite: "pièces", prixHt: 1.15, negoce: "A", date: new Date("2026-10-01"), source: "recu" as const },
  ];
  it("un article, son dernier et son meilleur prix", () => {
    const [a] = mesPrix(prix);
    expect(a).toMatchObject({ dernier: { prixHt: 1.15, negoce: "A" }, meilleur: { prixHt: 1.1, negoce: "B" }, nombre: 3 });
    expect(phraseDernierPrix(a!)).toBe("Ton dernier prix pour cet article : 1,15 € HT / pièce");
  });
  it("en gratuit, 3 mois seulement", () => {
    const [a] = mesPrix(prix, new Date("2026-07-25"));
    expect(a!.nombre).toBe(2);
    expect(a!.meilleur.prixHt).toBe(1.1);
  });
});

describe("hypothèses de lancement et résultats négoce", () => {
  it("les taux, sans jamais diviser par zéro", () => {
    const i = indicateursDuMois({ zone: "22", mois: "2026-11", envoisPerso: 10, reponsesPerso: 6, delaisPersoHeures: [10, 20], consultationsGroupe: 0, reponsesGroupe: 0, delaisGroupeHeures: [], demandes: 5, demandesCommandees: 2, artisansGratuits: 4, passagesPayant: 1, resiliations: 0, abonnesDebutDeMois: 0, regroupementsFormes: 1, regroupementsConsultes: 1, regroupementsCommandes: 0, ecartsPrixGroupe: [-0.08, -0.04] });
    expect(i).toMatchObject({ tauxReponsePerso: 0.6, tauxReponseGroupe: null, delaiMoyenPersoHeures: 15, tauxCommande: 0.4, tauxPassagePayant: 0.25, tauxResiliation: null, ecartMoyenPrixGroupe: -0.06 });
    expect(resultatsNegoce({ demandesRecues: 4, reponses: 3, commandesGagnees: 1, caHt: 1234.567 })).toEqual({ demandesRecues: 4, reponses: 3, tauxReponse: 0.75, commandesGagnees: 1, caHt: 1234.57 });
  });
});
