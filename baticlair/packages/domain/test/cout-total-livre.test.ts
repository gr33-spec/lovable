/**
 * Greg, 6 novembre 2026 (prompt maître, points 11 et 12) : la comparaison au coût total livré, pour les mêmes lignes ; jamais
 * une économie promise ; la reconfirmation avant la clôture.
 */
import { describe, expect, it } from "vitest";
import { comparerCoutLivre, reconfirmationDue, totalIndividuel } from "../src/index.js";

const LIGNES = [
  { designation: "Ardoise naturelle 32×22 Espagne 1er choix", quantite: 900, unite: "pièces" },
  { designation: "Liteaux 27×38", quantite: 100, unite: "ml" },
];

describe("le coût total livré", () => {
  it("le total individuel prend les prix des mêmes lignes et la livraison entière ; une ligne absente rend l'offre incomplète", () => {
    const o = { nom: "Kerbrat", prix: [{ designation: "ardoise naturelle 32x22 espagne 1er choix", unite: "pièces", prixHt: 1.1 }, { designation: "Liteaux 27×38", unite: "m", prixHt: 0.9 }], livraisonHt: 60 };
    expect(totalIndividuel(LIGNES, o)).toEqual({ totalLivreHt: 1140, complet: true });
    expect(totalIndividuel(LIGNES, { ...o, prix: o.prix.slice(0, 1) })).toEqual({ totalLivreHt: 1050, complet: false });
  });

  it("deux offres complètes : les deux totaux et l'écart, sans promesse", () => {
    const c = comparerCoutLivre(LIGNES, { totalLivreHt: 1080, complet: true }, [
      { nom: "Kerbrat", prix: [{ designation: LIGNES[0]!.designation, unite: "pièces", prixHt: 1.1 }, { designation: "Liteaux 27×38", unite: "ml", prixHt: 0.9 }], livraisonHt: 60 },
      { nom: "Point P", prix: [{ designation: LIGNES[0]!.designation, unite: "pièces", prixHt: 1.2 }], livraisonHt: 0 },
    ]);
    expect(c.individuelle).toEqual({ nom: "Kerbrat", totalLivreHt: 1140, complet: true });
    expect(c.ecartHt).toBe(-60);
    expect(c.phrase).toBe("Pour ces 2 lignes, livré : achat groupé 1 080,00 € HT ; ta meilleure offre individuelle (Kerbrat) 1 140,00 € HT. Écart : 60,00 € HT de moins en groupe.");
    expect(c.phrase).not.toMatch(/économis|garanti/i);
  });

  it("une offre incomplète : pas d'écart calculé ; aucune offre : on le dit", () => {
    const c = comparerCoutLivre(LIGNES, { totalLivreHt: 1080, complet: false }, [{ nom: "Kerbrat", prix: [{ designation: LIGNES[0]!.designation, unite: "pièces", prixHt: 1 }], livraisonHt: 0 }]);
    expect(c.ecartHt).toBeNull();
    expect(c.phrase).toMatch(/Écart non calculé/);
    expect(comparerCoutLivre(LIGNES, { totalLivreHt: 1080, complet: true }, []).phrase).toBe("Pour ces 2 lignes, livré : achat groupé 1 080,00 € HT. Aucune offre individuelle chiffrée à comparer.");
  });

  it("la reconfirmation : dans les 48 h avant la clôture, pour un engagement de plus de 3 jours, une seule fois", () => {
    const cloture = new Date("2026-11-20T18:00:00Z");
    const engage = new Date("2026-11-10T10:00:00Z");
    expect(reconfirmationDue({ engageLe: engage, clotureLe: cloture, demandeeLe: null }, new Date("2026-11-18T17:00:00Z"))).toBe(false);
    expect(reconfirmationDue({ engageLe: engage, clotureLe: cloture, demandeeLe: null }, new Date("2026-11-18T19:00:00Z"))).toBe(true);
    expect(reconfirmationDue({ engageLe: engage, clotureLe: cloture, demandeeLe: new Date("2026-11-18T19:00:00Z") }, new Date("2026-11-19T10:00:00Z"))).toBe(false);
    expect(reconfirmationDue({ engageLe: new Date("2026-11-18T10:00:00Z"), clotureLe: cloture, demandeeLe: null }, new Date("2026-11-19T10:00:00Z"))).toBe(false);
    expect(reconfirmationDue({ engageLe: engage, clotureLe: cloture, demandeeLe: null }, new Date("2026-11-20T18:00:01Z"))).toBe(false);
  });
});

describe("le minimum de commande (Greg, 7 novembre 2026)", () => {
  it("une offre sous son minimum de commande n'est pas comparée telle quelle, et le dit", () => {
    const c = comparerCoutLivre(LIGNES, { totalLivreHt: 1080, complet: true }, [
      { nom: "Kerbrat", prix: [{ designation: LIGNES[0]!.designation, unite: "pièces", prixHt: 1.1 }, { designation: "Liteaux 27×38", unite: "ml", prixHt: 0.9 }], livraisonHt: 60, minimumCommandeHt: 1500 },
    ]);
    expect(c.individuelle).toMatchObject({ nom: "Kerbrat", totalLivreHt: 1140, sousMinimum: 1500, complet: false });
    expect(c.ecartHt).toBeNull();
    expect(c.phrase).toContain("(Kerbrat) 1 140,00 € HT (sous son minimum de commande de 1 500,00 € HT).");
  });
});
