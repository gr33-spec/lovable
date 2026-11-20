import { describe, expect, it } from "vitest";
import { communeDe, dateLimiteNegociation, joursAvant, memeJourParis, negocesAAppeler, pastilleRegroupement, phraseFormation, phraseNouveauTotal, rappelDu } from "../src/groupe/alertes-chasseur.js";

/** Business model final, point 4 bis (Greg, 25 octobre 2026) : les alertes du chasseur d'opportunités. */
describe("alertes du chasseur", () => {
  it("la date butoir : date de besoin la plus proche moins le délai de livraison (10 jours par défaut)", () => {
    expect(dateLimiteNegociation(new Date("2026-11-28")).toISOString().slice(0, 10)).toBe("2026-11-18");
    expect(dateLimiteNegociation(new Date("2026-11-28"), 7).toISOString().slice(0, 10)).toBe("2026-11-21");
    expect(joursAvant(new Date("2026-11-18"), new Date("2026-11-13T17:00:00Z"))).toBe(5);
  });
  it("les rappels J-5 puis J-2, une fois chacun, et plus rien dès qu'une offre est saisie", () => {
    const base = { offreSaisie: false, rappelJ5Le: null, rappelJ2Le: null };
    expect(rappelDu({ ...base, joursRestants: 6 })).toBeNull();
    expect(rappelDu({ ...base, joursRestants: 5 })).toBe("J-5");
    expect(rappelDu({ ...base, joursRestants: 5, rappelJ5Le: new Date() })).toBeNull();
    expect(rappelDu({ ...base, joursRestants: 2, rappelJ5Le: new Date() })).toBe("J-2");
    expect(rappelDu({ ...base, joursRestants: 1, rappelJ5Le: new Date(), rappelJ2Le: new Date() })).toBeNull();
    expect(rappelDu({ ...base, joursRestants: 1, offreSaisie: true })).toBeNull();
  });
  it("la pastille : rouge sous J-5 sans offre, verte dès qu'une offre est saisie", () => {
    expect(pastilleRegroupement({ offreSaisie: false, joursRestants: 4 })).toBe("rouge");
    expect(pastilleRegroupement({ offreSaisie: false, joursRestants: 5 })).toBe("neutre");
    expect(pastilleRegroupement({ offreSaisie: true, joursRestants: 1 })).toBe("verte");
  });
  it("les phrases des e-mails", () => {
    expect(phraseFormation({ libelle: "Ardoise 32×22", entreprises: 2, volume: 18, unite: "palettes", dateBesoinMin: new Date("2026-11-28T12:00:00Z") })).toBe("Nouveau regroupement : Ardoise 32×22, 2 entreprises, 18 palettes, besoin au plus tôt le 28 nov.");
    expect(phraseNouveauTotal({ libelle: "Ardoise 32×22", entreprises: 3, volume: 2600, unite: "pièces" })).toBe("Ardoise 32×22 : nouveau total 2 600 pièces d'ardoise 32×22, 3 entreprises.");
  });
  it("le digest : un ajout du même jour (à Paris) attend 18 h", () => {
    expect(memeJourParis(new Date("2026-11-13T08:00:00Z"), new Date("2026-11-13T16:00:00Z"))).toBe(true);
    expect(memeJourParis(new Date("2026-11-13T23:30:00Z"), new Date("2026-11-13T21:00:00Z"))).toBe(false);
  });
  it("les négoces à appeler : déjà répondu, puis utilisés en perso, puis les autres ; jamais un bloqué", () => {
    const n = (nom: string, aRepondu: boolean, utiliseEnPerso: boolean, verification: string | null = "valide") => ({ nom, aRepondu, utiliseEnPerso, verification });
    expect(negocesAAppeler([n("Zeta", false, false), n("Alpha", false, true), n("Bloqué", true, true, "bloque"), n("Beta", true, false)]).map((x) => x.nom)).toEqual(["Beta", "Alpha", "Zeta"]);
  });
  it("la commune de livraison, jamais la rue", () => {
    expect(communeDe("8 rue de Kerampont, 22300 Lannion")).toBe("Lannion");
    expect(communeDe("sans code postal")).toBeNull();
  });
});
