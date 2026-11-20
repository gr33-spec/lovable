/**
 * MENSUEL OU ANNUEL (Greg, 12 novembre 2026, dossier de corrections UX, point 13). L'annuel est facturé dix mois pour douze
 * mois de service : Pro 290 € HT par an (24,17 € HT par mois en équivalent arrondi), Pro Max 490 € HT par an (40,83 €)
 * (prix du 15 novembre 2026 ; avant : Essentiel 199 € et Pro 399 €).
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
  it("les montants de Greg, au centime (15 novembre 2026 : Pro 290 €, Pro Max 490 €)", () => {
    expect(MOIS_FACTURES_PAR_AN).toBe(10);
    expect(prixAnnuelDeFormule("pro")).toBe(29_000);
    expect(prixAnnuelDeFormule("promax")).toBe(49_000);
    expect(equivalentMensuelDeLAnnuel("pro")).toBe(2_417);
    expect(equivalentMensuelDeLAnnuel("promax")).toBe(4_083);
    // L'économie est exactement deux mois, rien de plus.
    expect(economieDeLAnnuel("pro")).toBe(2 * prixDeFormule("pro"));
    expect(economieDeLAnnuel("promax")).toBe(2 * prixDeFormule("promax"));
    expect(prixDeLAbonnement("pro", "mensuel")).toBe(2_900);
    expect(prixDeLAbonnement("promax", "mensuel")).toBe(4_900);
    expect(prixDeLAbonnement("pro", "annuel")).toBe(29_000);
    expect(prixDeLAbonnement("promax", "annuel")).toBe(49_000);
    // TVA à 20 % : ce qui sera réellement prélevé.
    expect(montantsFacture(29_000, 20)).toMatchObject({ ht: 29_000, tva: 5_800, ttc: 34_800 });
    expect(montantsFacture(49_000, 20)).toMatchObject({ ht: 49_000, tva: 9_800, ttc: 58_800 });
  });

  it("les libellés : le montant facturé, l'équivalent par mois, les deux mois offerts ; aucune autre promesse", () => {
    const [pro, promax] = offresAbonnement();
    expect(pro!.prix).toBe("29 € HT par mois");
    expect(pro!.annuel).toMatchObject({ prix: "290 € HT par an", equivalent: "soit 24,17 € HT par mois", economie: "2 mois offerts : 58 € HT de moins que douze mois payés au mois" });
    expect(promax!.prix).toBe("49 € HT par mois");
    expect(promax!.annuel).toMatchObject({ prix: "490 € HT par an", equivalent: "soit 40,83 € HT par mois", economie: "2 mois offerts : 98 € HT de moins que douze mois payés au mois" });
    // Aucun nombre d'analyses n'est dit (plafond caché), et l'engagement de l'annuel est dit.
    expect(pro!.annuel.details).toEqual(["Tout le Gratuit", "L'analyse de tes devis, photos et listes incluse", "Achats groupés : tu vois le négoce retenu et tu commandes", "Payé en une fois, renouvelé chaque année ; tu peux arrêter le renouvellement quand tu veux, l'année payée reste acquise."]);
    expect(JSON.stringify([pro, promax])).not.toMatch(/%|promo|offre spéciale|garanti|\d+ analyses/i);
  });

  it("les prix réglés dans l'admin suivent : toujours dix mois", () => {
    const r = { ...REGLAGES_ABONNEMENT_DEFAUT, prixMensuelProHtCentimes: 2_490 };
    expect(prixAnnuelDeFormule("pro", r)).toBe(24_900);
    expect(equivalentMensuelDeLAnnuel("pro", r)).toBe(2_075);
    expect(eurosDeCentimes(economieDeLAnnuel("pro", r))).toBe("49,80 €");
  });

  it("la période : un mois, ou un an pour l'annuel ; tout ce qui existait avant reste mensuel", () => {
    const debut = new Date("2026-11-12T10:00:00Z");
    expect(finDePeriode(debut, "pro").toISOString()).toBe("2026-12-12T10:00:00.000Z");
    expect(finDePeriode(debut, "promax", "mensuel").toISOString()).toBe("2026-12-12T10:00:00.000Z");
    expect(finDePeriode(debut, "pro", "annuel").toISOString()).toBe("2027-11-12T10:00:00.000Z");
    expect(finDePeriode(debut, "promax", "annuel").toISOString()).toBe("2027-11-12T10:00:00.000Z");
    expect([periodiciteDe("annuel"), periodiciteDe("mensuel"), periodiciteDe(null), periodiciteDe(undefined), periodiciteDe("autre")]).toEqual(["annuel", "mensuel", "mensuel", "mensuel", "mensuel"]);
  });

  it("le rappel de renouvellement dit le montant réellement prélevé", () => {
    const m = emailRenouvellementAnnuel({ echeance: new Date("2027-11-12T10:00:00Z"), lien: "https://mobiiz.fr/abonnement", nomApp: "Mobiiz", htCentimes: prixAnnuelDeFormule("pro") });
    expect(m.texte).toContain("290 € HT (348 € TTC) pour un an");
    expect(m.texte).toContain("résilie avant cette date");
  });

  it("recette du 13 novembre 2026 (G1) : la page Tarifs dit les mêmes prix à l'année que « Mon abonnement »", async () => {
    const { TARIFS, MOIS_FACTURES_A_L_ANNEE } = await import("../src/groupe/tarifs.js");
    const { offresAbonnement, MOIS_FACTURES_PAR_AN } = await import("../src/abonnement/abonnement.js");
    expect(MOIS_FACTURES_PAR_AN).toBe(MOIS_FACTURES_A_L_ANNEE);
    for (const o of offresAbonnement()) expect(TARIFS.annee.r.replace(/\s/g, " ")).toContain(`${o.titre} : ${o.annuel.prix}`.replace(/\s/g, " "));
    expect(TARIFS.annee.r).toContain("Deux mois offerts");
  });
});
