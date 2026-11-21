import { describe, expect, it } from "vitest";
import { ANALYSES_OFFERTES, droitCommandeGroupee, formuleAuDessus, formuleDuCompte, LIGNES_PAR_ANALYSE, moisDAbonnement, OFFRES, PAGES_MAX_PAR_DEVIS, phrasePlafondAtteint, PHRASE_ANALYSES_OFFERTES_UTILISEES, PLAFOND_IA_EUR_DEFAUT, poidsAnalyse, prixAnnuelDeLOffre, prixDeLOffre, TARIFS } from "../src/index.js";

/**
 * LES TROIS FORMULES (RÈGLE CHANGÉE, Greg, 15 novembre 2026) : Gratuit (3 analyses offertes en tout, première commande
 * groupée offerte), Pro 29 € HT par mois ou 290 € HT par an, Pro Max 49 € ou 490 € ; plafond caché en euros par mois
 * (5 € et 20 € pour commencer) ; 20 pages au plus par devis. Avant : Découverte, Essentiel 19,90 €, Pro 39,90 €.
 */
describe("les offres", () => {
  it("la grille de Greg : Gratuit, Pro 29 €, Pro Max 49 € ; à l'année 290 € et 490 €", () => {
    expect(Object.values(OFFRES).map((o) => [o.formule, o.nom, o.prixHt])).toEqual([
      ["gratuit", "Gratuit", 0],
      ["pro", "Pro", 29],
      ["promax", "Pro Max", 49],
    ]);
    expect(prixDeLOffre(OFFRES.gratuit)).toBe("Gratuit");
    expect(prixDeLOffre(OFFRES.pro)).toBe("29 € HT par mois");
    expect(prixDeLOffre(OFFRES.promax)).toBe("49 € HT par mois");
    expect(prixAnnuelDeLOffre(OFFRES.pro)).toBe("290 € HT par an");
    expect(prixAnnuelDeLOffre(OFFRES.promax)).toBe("490 € HT par an");
    expect([formuleAuDessus("gratuit"), formuleAuDessus("pro"), formuleAuDessus("promax")]).toEqual(["pro", "promax", null]);
  });

  it("les garde-fous : 3 analyses offertes, plafond caché de 5 € et 20 € par mois, 20 pages par devis", () => {
    expect(ANALYSES_OFFERTES).toBe(3);
    expect(PLAFOND_IA_EUR_DEFAUT).toEqual({ pro: 5, promax: 20 });
    expect(PAGES_MAX_PAR_DEVIS).toBe(20);
  });

  it("150 lignes par analyse ; au-delà, un devis compte pour 2", () => {
    expect(LIGNES_PAR_ANALYSE).toBe(150);
    expect([1, 150, 151, 324].map(poidsAnalyse)).toEqual([1, 1, 2, 2]);
  });

  it("la formule d'un compte : promax, sinon pro pour tout abonnement en cours (anciens essentiel, mensuel et annuel compris)", () => {
    expect(formuleDuCompte({ actif: false, formule: "pro" })).toBe("gratuit");
    expect(formuleDuCompte({ actif: true, formule: "promax" })).toBe("promax");
    for (const f of ["pro", "essentiel", "mensuel", "annuel", null]) expect(formuleDuCompte({ actif: true, formule: f })).toBe("pro");
  });

  it("le mois d'un abonné va d'un jour anniversaire au suivant ; sans date, le mois civil", () => {
    const d = (s: string) => new Date(`${s}T10:00:00Z`);
    expect(moisDAbonnement(d("2026-11-12"), d("2026-11-20"))).toEqual({ debut: d("2026-11-12"), fin: d("2026-12-12") });
    expect(moisDAbonnement(d("2026-11-12"), new Date("2026-12-12T09:59:00Z"))).toEqual({ debut: d("2026-11-12"), fin: d("2026-12-12") });
    expect(moisDAbonnement(d("2026-11-12"), d("2026-12-12"))).toEqual({ debut: d("2026-12-12"), fin: d("2027-01-12") });
    // Un abonnement annuel : le plafond repart quand même chaque mois.
    expect(moisDAbonnement(d("2026-11-12"), d("2027-05-30"))).toEqual({ debut: d("2027-05-12"), fin: d("2027-06-12") });
    // Pris un 31 : ramené au dernier jour des mois plus courts.
    expect(moisDAbonnement(d("2027-01-31"), d("2027-03-01"))).toEqual({ debut: d("2027-02-28"), fin: d("2027-03-31") });
    expect(moisDAbonnement(null, d("2026-11-20"))).toEqual({ debut: new Date("2026-11-01T00:00:00Z"), fin: new Date("2026-12-01T00:00:00Z") });
  });

  it("le plafond atteint : le message de Greg, avec la date du renouvellement ; aucun montant, aucun compteur", () => {
    const le = new Date("2026-12-12T10:00:00Z");
    expect(phrasePlafondAtteint("pro", le)).toBe("Tu as atteint la limite d'analyses de ton mois. Passe au Pro Max ou attends le renouvellement le 12 décembre.");
    expect(phrasePlafondAtteint("promax", le)).toBe("Tu as atteint la limite d'analyses de ton mois. Attends le renouvellement le 12 décembre ; d'ici là, note ta liste à la main.");
    expect(phrasePlafondAtteint("pro", le) + phrasePlafondAtteint("promax", le)).not.toMatch(/€|\d+ %|sur \d/);
    expect(PHRASE_ANALYSES_OFFERTES_UTILISEES).toBe("Tes 3 analyses offertes sont utilisées. Note ta liste à la main, c'est gratuit, ou passe à Pro : les analyses sont incluses.");
  });

  it("achats groupés : la première commande est offerte, ensuite voir le négoce et commander demande Pro", () => {
    expect(droitCommandeGroupee({ abonne: false, commandesPassees: 0 })).toEqual({ ok: true, offerte: true, phrase: null });
    expect(droitCommandeGroupee({ abonne: false, commandesPassees: 1 })).toEqual({ ok: false, offerte: false, phrase: "Ta première commande groupée était offerte. Pour voir le négoce retenu et commander, passe à Pro." });
    expect(droitCommandeGroupee({ abonne: true, commandesPassees: 7 })).toEqual({ ok: true, offerte: false, phrase: null });
  });

  it("TARIFS dit ce que le code applique, et les prix viennent de la grille", () => {
    expect(TARIFS.enUneLigne).toMatch(/^Gratuit : tes listes, tes négoces, la comparaison et les achats groupés\./);
    expect(TARIFS.gratuit.points).toContain("3 analyses offertes (devis, photo ou liste)");
    expect(TARIFS.gratuit.points).toContain("Ta première commande groupée offerte");
    expect(TARIFS.pro.sous).toBe("29 € HT par mois");
    expect(TARIFS.promax.sous).toBe("49 € HT par mois");
    expect(TARIFS.annee.r).toContain("Pro : 290 € HT par an ; Pro Max : 490 € HT par an");
    // La limite d'usage existe et se dit, sans chiffre.
    expect(TARIFS.limite.q).toBe("Y a-t-il une limite d'analyses ?");
    expect(TARIFS.limite.r).toMatch(/^Oui, mais tu n'as rien à compter : /);
    expect(JSON.stringify(TARIFS)).not.toMatch(/illimit/i);
    // Plus aucun ancien prix ni ancienne formule ; jamais les mots interdits de la page publique.
    expect(JSON.stringify(TARIFS)).not.toMatch(/19,90|39,90|199 €|399 €|348 €|Essentiel|Découverte|\bIA\b|automatique|précis|exact/);
  });
});
