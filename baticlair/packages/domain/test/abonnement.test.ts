import { describe, expect, it } from "vitest";
import {
  PAIEMENT_AUCUN,
  REGLAGES_ABONNEMENT_DEFAUT,
  actionPermise,
  bandeauEssai,
  bandeauGrace,
  ecartDuCycle,
  emailRappelEssai,
  etatAbonnement,
  finDEssai,
  montantsFacture,
  numeroFacture,
  phraseEconomiePremierCycle,
  phrasePaywall,
  rappelEssaiDu,
} from "../src/index.js";

/** L'abonnement artisan (Greg, 24 octobre 2026) : 29 € HT par mois, essai jusqu'à 30 jours après les premiers résultats, 60 jours sans dépôt. */
const d = (s: string) => new Date(`${s}T10:00:00Z`);
const inscrit = d("2026-11-01");

describe("l'essai", () => {
  it("sans dépôt : 60 jours après l'inscription, puis le paywall", () => {
    const dates = { inscritLe: inscrit, premierDepotLe: null, premiersResultatsLe: null };
    expect(finDEssai(dates)).toEqual(d("2026-12-31"));
    expect(etatAbonnement(dates, PAIEMENT_AUCUN, d("2026-12-19"))).toMatchObject({ acces: "essai", joursEssai: 12 });
    expect(bandeauEssai(etatAbonnement(dates, PAIEMENT_AUCUN, d("2026-12-19")))).toBe("Essai gratuit : encore 12 jours");
    expect(etatAbonnement(dates, PAIEMENT_AUCUN, d("2027-01-01")).acces).toBe("bloque");
  });

  it("un dépôt prolonge l'essai jusqu'aux résultats + 30 jours, même au-delà des 60 jours", () => {
    const enCours = { inscritLe: inscrit, premierDepotLe: d("2026-12-20"), premiersResultatsLe: null };
    expect(finDEssai(enCours)).toBeNull();
    expect(etatAbonnement(enCours, PAIEMENT_AUCUN, d("2027-01-10"))).toMatchObject({ acces: "essai", joursEssai: null });
    const publie = { ...enCours, premiersResultatsLe: d("2027-01-15") };
    expect(finDEssai(publie)).toEqual(d("2027-02-14"));
    expect(etatAbonnement(publie, PAIEMENT_AUCUN, d("2027-02-13")).acces).toBe("essai");
    expect(etatAbonnement(publie, PAIEMENT_AUCUN, d("2027-02-15")).acces).toBe("bloque");
  });

  it("les durées se règlent", () => {
    expect(finDEssai({ inscritLe: inscrit, premierDepotLe: null, premiersResultatsLe: null }, { ...REGLAGES_ABONNEMENT_DEFAUT, joursEssaiSansDepot: 10 })).toEqual(d("2026-11-11"));
  });
});

describe("le paiement", () => {
  const fini = { inscritLe: inscrit, premierDepotLe: null, premiersResultatsLe: null };
  it("abonné jusqu'à la fin de la période payée, résiliation comprise", () => {
    expect(etatAbonnement(fini, { statut: "actif", periodeFin: d("2027-02-01"), echecLe: null, resiliationDemandeeLe: null }, d("2027-01-20")).acces).toBe("abonne");
    const resilie = etatAbonnement(fini, { statut: "actif", periodeFin: d("2027-02-01"), echecLe: null, resiliationDemandeeLe: d("2027-01-10") }, d("2027-01-20"));
    expect(resilie).toMatchObject({ acces: "abonne", resiliationProgrammee: true });
    expect(etatAbonnement(fini, { statut: "resilie", periodeFin: d("2027-02-01"), echecLe: null, resiliationDemandeeLe: d("2027-01-10") }, d("2027-02-02")).acces).toBe("bloque");
  });

  it("paiement refusé : 7 jours de grâce avec bandeau, puis le paywall", () => {
    const echec = { statut: "echec" as const, periodeFin: d("2027-02-01"), echecLe: d("2027-02-01"), resiliationDemandeeLe: null };
    const grace = etatAbonnement(fini, echec, d("2027-02-03"));
    expect(grace).toMatchObject({ acces: "grace", joursGrace: 5 });
    expect(bandeauGrace(grace)).toBe("Ton paiement n'est pas passé. Mets à jour ta carte avant le 08/02 pour garder l'accès.");
    expect(etatAbonnement(fini, echec, d("2027-02-09")).acces).toBe("bloque");
  });
});

describe("le paywall", () => {
  const bloque = etatAbonnement({ inscritLe: inscrit, premierDepotLe: null, premiersResultatsLe: null }, PAIEMENT_AUCUN, d("2027-01-05"));
  it("bloque déposer, voir les résultats, commander, recommander", () => {
    for (const a of ["deposer", "voir_resultats", "commander", "recommander"] as const) expect(actionPermise(bloque, a)).toBe(false);
  });
  it("une liste déposée pendant l'essai garde ses résultats visibles", () => {
    expect(actionPermise(bloque, "voir_resultats", d("2026-12-20"))).toBe(true);
    expect(actionPermise(bloque, "commander", d("2026-12-20"))).toBe(false);
    expect(actionPermise(bloque, "voir_resultats", d("2027-01-02"))).toBe(false);
  });
  it("l'écran dit le prix et l'économie réelle du premier cycle", () => {
    expect(phrasePaywall()).toBe("Ton essai est terminé. Continue pour 29 € HT par mois, sans engagement.");
    expect(phraseEconomiePremierCycle(ecartDuCycle([1200, 1540, 1310], 1200))).toBe("Sur ton premier cycle : 340 € d'écart avec le prix le plus cher reçu");
    expect(ecartDuCycle([1200], null)).toBeNull();
  });
});

describe("les factures et les rappels", () => {
  it("HT, TVA 20 %, TTC ; numéros continus, série TEST à part", () => {
    expect(montantsFacture(2900, 20)).toEqual({ ht: 2900, tva: 580, ttc: 3480 });
    expect(numeroFacture("F", 1)).toBe("F-000001");
    expect(numeroFacture("TEST", 12)).toBe("TEST-000012");
  });
  it("7 jours avant, la veille, le jour même", () => {
    const fin = d("2027-01-15");
    expect(rappelEssaiDu(fin, d("2027-01-07"))).toBeNull();
    expect(rappelEssaiDu(fin, d("2027-01-08"))).toBe("j7");
    expect(rappelEssaiDu(fin, d("2027-01-14"))).toBe("j1");
    expect(rappelEssaiDu(fin, new Date("2027-01-15T12:00:00Z"))).toBe("j0");
    expect(rappelEssaiDu(fin, d("2027-01-17"))).toBeNull();
    const m = emailRappelEssai("j7", { ecart: 340, lien: "https://exemple.fr/abonnement", nomApp: "Mobiiz" });
    expect(m.objet).toBe("Ton essai Mobiiz se termine dans 7 jours");
    expect(m.texte).toContain("Sur ton premier cycle : 340 € d'écart avec le prix le plus cher reçu.");
  });
});
