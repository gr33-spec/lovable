import { describe, expect, it } from "vitest";
import {
  adresseReponseArtisan,
  candidatsAdresse,
  etiquetteDansObjet,
  etiquetteDepuis,
  expediteurVia,
  fauteAdresse,
  lireAdresseMobiiz,
  cleAdresse,
  nomAdresse,
  nomExpediteur,
  objetAvecRepere,
  PHRASES_ADRESSE,
} from "../src/index.js";

/**
 * R7 (Greg, 26 et 27 octobre 2026) : l'adresse Mobiiz par artisan. Le nom vient du nom de l'entreprise, jamais un nom
 * réservé, une collision prend la commune puis un numéro ; la réponse du négoce porte l'étiquette de sa demande dans
 * l'adresse (« Répondre ») ou dans l'objet (autre outil).
 */
describe("l'adresse Mobiiz de l'artisan", () => {
  it("le nom d'adresse : minuscules sans accent, tirets, jamais vide", () => {
    expect(nomAdresse("BATI INVEST")).toBe("bati-invest");
    expect(nomAdresse("Toitures Martin & Fils (SARL)")).toBe("toitures-martin-et-fils-sarl");
    expect(nomAdresse("  Électricité Générale -- Léon ")).toBe("electricite-generale-leon");
    expect(nomAdresse("x".repeat(60))).toHaveLength(40);
  });

  it("ce que l'artisan peut choisir", () => {
    expect(fauteAdresse("bati-invest")).toBeNull();
    expect(fauteAdresse("ab")).toBe("trop_courte");
    expect(fauteAdresse("Bati Invest")).toBe("caracteres");
    expect(fauteAdresse("-bati")).toBe("caracteres");
    expect(fauteAdresse("contact")).toBe("reservee");
    expect(fauteAdresse("lot-12")).toBe("reservee");
    expect(fauteAdresse("a".repeat(41))).toBe("trop_longue");
  });

  it("les candidats : le nom, puis le nom et la commune, puis numérotés ; un nom réservé prend « artisan »", () => {
    expect(candidatsAdresse("BATI INVEST", "Lannion").slice(0, 4)).toEqual(["bati-invest", "bati-invest-lannion", "bati-invest-2", "bati-invest-3"]);
    expect(candidatsAdresse("Contact", null)[0]).toBe("artisan-contact");
    expect(candidatsAdresse("", null)[0]).toBe("artisan");
    expect(candidatsAdresse("Ab", "22300 Lannion").slice(0, 2)).toEqual(["artisan-ab", "artisan-ab-22300-lannion"]);
    // Cinquante homonymes passés (les parcours de test en créent des centaines) : un suffixe tiré au sort, jamais à court.
    const tous = candidatsAdresse("Toitures Martin", null, () => 0.5);
    expect(tous.length).toBeGreaterThan(55);
    expect(tous[tous.length - 1]).toMatch(/^toitures-martin-[a-z2-9]{5}$/);
    expect(new Set(candidatsAdresse("Toitures Martin", null)).size).toBe(tous.length);
  });

  it("l'étiquette, l'adresse de réponse, l'expéditeur et le repère de l'objet", () => {
    const e = etiquetteDepuis(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]));
    expect(e).toMatch(/^[a-z2-9]{8}$/);
    expect(adresseReponseArtisan("bati-invest", e, "mobiiz.fr")).toBe(`bati-invest+r${e}@mobiiz.fr`);
    expect(expediteurVia("BATI <INVEST>", "bati-invest", "mobiiz.fr")).toBe("BATI INVEST via Mobiiz <bati-invest@mobiiz.fr>");
    expect(objetAvecRepere("Demande de devis : chantier Lannion", "ab23cd45")).toBe("Demande de devis : chantier Lannion [réf. ab23cd45]");
    expect(etiquetteDansObjet("RE: Demande de devis : chantier Lannion [réf. ab23cd45]")).toBe("ab23cd45");
    expect(etiquetteDansObjet("Re: [REF ab23cd45] devis")).toBe("ab23cd45");
    expect(etiquetteDansObjet("Demande de devis")).toBeNull();
  });

  it("l'adresse visée par un e-mail reçu : le nom et l'étiquette, seulement sur le domaine", () => {
    expect(lireAdresseMobiiz(["Toitures Martin via Mobiiz <toitures-martin+rab23cd45@mobiiz.fr>"], "mobiiz.fr")).toEqual({ adresse: "toitures-martin", etiquette: "ab23cd45" });
    expect(lireAdresseMobiiz(["toitures-martin@mobiiz.fr"], "mobiiz.fr")).toEqual({ adresse: "toitures-martin", etiquette: null });
    expect(lireAdresseMobiiz(["toitures-martin@autre.fr", "x@mobiiz.fr"], "mobiiz.fr")).toEqual({ adresse: "x", etiquette: null });
    expect(lireAdresseMobiiz(["toitures-martin@autre.fr"], "mobiiz.fr")).toBeNull();
    // Correction après test de Greg (30 octobre 2026) : les variantes sont lues, la clé les réunit.
    expect(lireAdresseMobiiz(["BATI.Invest@Mobiiz.fr"], "mobiiz.fr")).toEqual({ adresse: "bati.invest", etiquette: null });
    expect(lireAdresseMobiiz(["bati_invest+devis@mobiiz.fr"], "mobiiz.fr")).toEqual({ adresse: "bati_invest", etiquette: null });
    expect(new Set(["bati-invest", "batiinvest", "BATI-INVEST", "bati.invest", "Bati_Invest"].map(cleAdresse))).toEqual(new Set(["batiinvest"]));
    expect(nomExpediteur("Négoce Dupont <ventes@dupont.fr>")).toBe("Négoce Dupont");
    expect(nomExpediteur("ventes@dupont.fr")).toBe("ventes@dupont.fr");
  });

  it("les phrases de Greg, mot pour mot", () => {
    expect(PHRASES_ADRESSE.titre).toBe("Voici ton adresse Mobiiz :");
    expect(PHRASES_ADRESSE.envoie).toBe("C'est elle qui envoie tes demandes de prix.");
    expect(PHRASES_ADRESSE.recoit).toBe("Les réponses des négoces arrivent ici, dans Mobiiz.");
  });
});

describe("relecture du 30 octobre 2026", () => {
  it("une adresse de réponse de lot (« lot-12@ ») n'est jamais lue comme celle d'un artisan", () => {
    expect(lireAdresseMobiiz(["lot-12@mobiiz.fr"], "mobiiz.fr")).toBeNull();
    expect(lireAdresseMobiiz(["Négoce <lot-12@mobiiz.fr>", "bati-invest@mobiiz.fr"], "mobiiz.fr")).toEqual({ adresse: "bati-invest", etiquette: null });
    expect(lireAdresseMobiiz(["lotissement@mobiiz.fr"], "mobiiz.fr")).toEqual({ adresse: "lotissement", etiquette: null });
  });
});
