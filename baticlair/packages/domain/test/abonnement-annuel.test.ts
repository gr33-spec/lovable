/**
 * MENSUEL OU ANNUEL (Greg, 12 novembre 2026, dossier de corrections UX, point 13). L'annuel est facturé dix mois pour douze
 * mois de service : Essentiel 199 € HT par an (16,58 € HT par mois en équivalent arrondi), Pro 399 € HT par an (33,25 €).
 * Deux mois offerts, aucune autre remise. Le mensuel ne change pas.
 */
import { describe, expect, it } from "vitest";
import {
  economieDeLAnnuel,
  emailRenouvellementAnnuel,
  equivalentMensuelDeLAnnuel,
  eurosDeCentimes,
  finDePeriode,
  MOIS_FACTURES_PAR_AN,
  montantsFacture,
  offresAbonnement,
  periodiciteDe,
  prixAnnuelDeFormule,
  prixDeFormule,
  prixDeLAbonnement,
  REGLAGES_ABONNEMENT_DEFAUT,
} from "../src/abonnement/abonnement.js";

describe("abonnement annuel : dix mois facturés pour douze", () => {
  it("les montants de Greg, au centime", () => {
    expect(MOIS_FACTURES_PAR_AN).toBe(10);
    expect(prixAnnuelDeFormule("essentiel")).toBe(19_900);
    expect(prixAnnuelDeFormule("pro")).toBe(39_900);
    expect(equivalentMensuelDeLAnnuel("essentiel")).toBe(1_658);
    expect(equivalentMensuelDeLAnnuel("pro")).toBe(3_325);
    // L'économie est exactement deux mois, rien de plus.
    expect(economieDeLAnnuel("essentiel")).toBe(2 * prixDeFormule("essentiel"));
    expect(economieDeLAnnuel("pro")).toBe(2 * prixDeFormule("pro"));
    // Le mensuel est inchangé.
    expect(prixDeLAbonnement("essentiel", "mensuel")).toBe(1_990);
    expect(prixDeLAbonnement("pro", "mensuel")).toBe(3_990);
    expect(prixDeLAbonnement("essentiel", "annuel")).toBe(19_900);
    expect(prixDeLAbonnement("pro", "annuel")).toBe(39_900);
    // TVA à 20 % : ce qui sera réellement prélevé.
    expect(montantsFacture(19_900, 20)).toMatchObject({ ht: 19_900, tva: 3_980, ttc: 23_880 });
    expect(montantsFacture(39_900, 20)).toMatchObject({ ht: 39_900, tva: 7_980, ttc: 47_880 });
  });

  it("les libellés : le montant facturé, l'équivalent par mois, les deux mois offerts ; aucune autre promesse", () => {
    const [essentiel, pro] = offresAbonnement();
    expect(essentiel!.prix).toBe("19,90 € HT par mois");
    expect(essentiel!.annuel).toMatchObject({ prix: "199 € HT par an", equivalent: "soit 16,58 € HT par mois", economie: "2 mois offerts : 39,80 € HT de moins que douze mois payés au mois" });
    expect(pro!.prix).toBe("39,90 € HT par mois");
    expect(pro!.annuel).toMatchObject({ prix: "399 € HT par an", equivalent: "soit 33,25 € HT par mois", economie: "2 mois offerts : 79,80 € HT de moins que douze mois payés au mois" });
    // Les quotas restent mensuels, et l'engagement de l'annuel est dit.
    expect(essentiel!.annuel.details).toEqual(["3 analyses de devis par mois", "10 scans de liste par mois", "Payé en une fois, renouvelé chaque année ; tu peux arrêter le renouvellement quand tu veux, l'année payée reste acquise."]);
    expect(JSON.stringify([essentiel, pro])).not.toMatch(/%|promo|offre spéciale|garanti/i);
  });

  it("les prix réglés dans l'admin suivent : toujours dix mois", () => {
    const r = { ...REGLAGES_ABONNEMENT_DEFAUT, prixEssentielHtCentimes: 2_490 };
    expect(prixAnnuelDeFormule("essentiel", r)).toBe(24_900);
    expect(equivalentMensuelDeLAnnuel("essentiel", r)).toBe(2_075);
    expect(eurosDeCentimes(economieDeLAnnuel("essentiel", r))).toBe("49,80 €");
  });

  it("la période : un mois, ou un an pour l'annuel ; tout ce qui existait avant reste mensuel", () => {
    const debut = new Date("2026-11-12T10:00:00Z");
    expect(finDePeriode(debut, "essentiel").toISOString()).toBe("2026-12-12T10:00:00.000Z");
    expect(finDePeriode(debut, "pro", "mensuel").toISOString()).toBe("2026-12-12T10:00:00.000Z");
    expect(finDePeriode(debut, "essentiel", "annuel").toISOString()).toBe("2027-11-12T10:00:00.000Z");
    expect(finDePeriode(debut, "pro", "annuel").toISOString()).toBe("2027-11-12T10:00:00.000Z");
    expect([periodiciteDe("annuel"), periodiciteDe("mensuel"), periodiciteDe(null), periodiciteDe(undefined), periodiciteDe("autre")]).toEqual(["annuel", "mensuel", "mensuel", "mensuel", "mensuel"]);
  });

  it("le rappel de renouvellement dit le montant réellement prélevé", () => {
    const m = emailRenouvellementAnnuel({ echeance: new Date("2027-11-12T10:00:00Z"), lien: "https://mobiiz.fr/abonnement", nomApp: "Mobiiz", htCentimes: prixAnnuelDeFormule("pro") });
    expect(m.texte).toContain("399 € HT (478,80 € TTC) pour un an");
    expect(m.texte).toContain("résilie avant cette date");
  });
});
