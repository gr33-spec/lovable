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
  argumentTarif,
  emailRenouvellementAnnuel,
  finDePeriode,
  offresAbonnement,
  prixDeFormule,
  prorataVersPro,
  formuleDe,
  prixDes,
  rappelRenouvellementDu,
  revenuMensuelRecurrent,
} from "../src/index.js";

/** L'abonnement artisan (Greg, 24 octobre 2026 ; prix du 30 octobre : Essentiel et Pro), essai jusqu'à 30 jours après les premiers résultats, 60 jours sans dépôt. */
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
    expect(phrasePaywall()).toBe("Ton essai est terminé. Continue dès 19,90 € HT par mois.");
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
    expect(m.texte).toContain("Essentiel à 19,90 € HT par mois, ou Pro à 39,90 € HT par mois, sans engagement.");
  });
});

/** LES DEUX FORMULES (RÈGLE CHANGÉE, Greg, 30 octobre 2026) : Essentiel 19,90 € HT et Pro 39,90 € HT par mois, sans engagement ; plus d'annuel. */
describe("Essentiel ou Pro", () => {
  it("les prix par défaut : 19,90 € et 39,90 € par mois ; les anciens mensuel et annuel comptent comme Essentiel", () => {
    expect(REGLAGES_ABONNEMENT_DEFAUT).toMatchObject({ prixEssentielHtCentimes: 1990, prixProHtCentimes: 3990 });
    expect(prixDeFormule("essentiel")).toBe(1990);
    expect(prixDeFormule("pro")).toBe(3990);
    expect(prixDes()).toBe("19,90 €");
    expect(["pro", "essentiel", "mensuel", "annuel", null].map(formuleDe)).toEqual(["pro", "essentiel", "essentiel", "essentiel", "essentiel"]);
  });
  it("le paywall et /tarifs : Essentiel mis en avant, puis Pro, avec leurs quotas", () => {
    const [essentiel, pro] = offresAbonnement();
    expect(essentiel).toEqual({ formule: "essentiel", titre: "Essentiel", badge: null, prix: "19,90 € HT par mois", details: ["3 analyses de devis par mois", "10 scans de liste par mois", "Sans engagement, résiliable quand tu veux"], enAvant: true });
    expect(pro).toMatchObject({ formule: "pro", titre: "Pro", prix: "39,90 € HT par mois", details: ["8 analyses de devis par mois", "30 scans de liste par mois", "Sans engagement, résiliable quand tu veux"], enAvant: false });
  });
  it("l'argument de la landing : les achats groupés gratuits, « Dès 19,90 € par mois » pour plus d'analyses", () => {
    expect(argumentTarif({ cycles: 0, parCommande: null })).toBe("Gratuit pour tes listes, tes négoces et les achats groupés. Dès 19,90 € HT par mois pour plus d'analyses de devis.");
    expect(argumentTarif({ cycles: 3, parCommande: 412 })).toBe("Gratuit, achats groupés compris : en moyenne, nos artisans ont économisé 412 € par regroupement.");
  });
  it("une période : un mois (un ancien annuel : un an)", () => {
    expect(finDePeriode(d("2027-01-31"), "annuel").toISOString().slice(0, 10)).toBe("2028-01-31");
    expect(finDePeriode(d("2027-01-15"), "pro").toISOString().slice(0, 10)).toBe("2027-02-15");
  });
  it("le passage à Pro au prorata : ce qui reste du mois d'Essentiel est déduit, le mois de Pro commence le jour même", () => {
    // Mois du 1er au 31 janvier (30 jours), passage le 16 : 15 jours sur 30 restent, 9,95 € déduits.
    const p = prorataVersPro({ debut: d("2027-01-01"), fin: d("2027-01-31") }, d("2027-01-16"));
    expect(p).toMatchObject({ creditCentimes: 995, aPayerHtCentimes: 3990 - 995 });
    expect(p.debut).toEqual(d("2027-01-16"));
    expect(p.fin.toISOString().slice(0, 10)).toBe("2027-02-16");
    expect(prorataVersPro({ debut: d("2027-01-01"), fin: d("2027-01-31") }, d("2027-02-02")).creditCentimes).toBe(0);
  });
  it("le rappel de renouvellement : 30 jours avant l'échéance de l'annuel, jamais après une résiliation", () => {
    const base = { formule: "annuel" as const, statut: "actif" as const, periodeFin: d("2028-01-16"), resiliationDemandeeLe: null };
    expect(rappelRenouvellementDu(base, d("2027-12-16"))).toBe(false);
    expect(rappelRenouvellementDu(base, d("2027-12-17"))).toBe(true);
    expect(rappelRenouvellementDu({ ...base, resiliationDemandeeLe: d("2027-06-01") }, d("2027-12-20"))).toBe(false);
    expect(rappelRenouvellementDu({ ...base, formule: "essentiel" }, d("2027-12-20"))).toBe(false);
    const m = emailRenouvellementAnnuel({ echeance: d("2028-01-16"), lien: "https://exemple.fr/abonnement", nomApp: "Mobiiz" });
    expect(m.objet).toBe("Ton abonnement annuel Mobiiz se renouvelle le 16 janvier 2028");
    expect(m.texte).toContain("348 € HT (417,60 € TTC) pour un an");
    expect(m.texte).toContain("Une année commencée n'est pas remboursée au prorata.");
  });
  it("le revenu mensuel récurrent : l'annuel divisé par 12 ; la part d'abonnés annuels", () => {
    expect(revenuMensuelRecurrent([{ formule: "mensuel", htCentimes: 4900 }, { formule: "annuel", htCentimes: 34800 }, { formule: "annuel", htCentimes: 34800 }])).toEqual({ centimes: 4900 + 5800, mensuels: 1, annuels: 2, partAnnuels: 67 });
    expect(revenuMensuelRecurrent([])).toEqual({ centimes: 0, mensuels: 0, annuels: 0, partAnnuels: null });
  });
});
