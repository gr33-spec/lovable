import { describe, expect, it } from "vitest";
import { decodeLignes, titresEtSuites } from "../src/modules/takeoff/application/lecture-reader.js";

/**
 * Décision du fondateur (24 octobre 2026, vraie lecture du 7954) : une tranche rendait « R+1 », « N°4 TYPE T3 »,
 * « DEGAGEMENT » comme des lignes, et la désignation du tableau coupée en morceaux. Le modèle marque un titre (« titre »)
 * ou la suite de la ligne d'avant (« suite ») ; le code écarte les titres et recolle les suites. Une vraie ligne sans
 * quantité (« CHAPEAU PREVU PAR LE COUVREUR ») reste.
 */
const ligne = (ref: string, designation: string, role: string, quantite = "", fournitures: { nom: string }[] = []) => ({
  ref,
  designation,
  quantite,
  unite: quantite ? "U" : "",
  role,
  fournitures: fournitures.map((f) => ({ nom: f.nom, quantite, unite: "u", ouvrage: "", emplacement: "", donnees: [], attend: [], a_preciser: [], precision: "" })),
});

describe("tranches : titres écartés, suites recollées", () => {
  it("un titre disparaît, une suite rejoint la ligne d'avant, une vraie ligne sans quantité reste", () => {
    const lignes = [
      ligne("3:001", "R+1", "titre"),
      ligne("3:002", "N°4 TYPE T3", "titre"),
      ligne("3:003", "TABLEAU GENERAL ELECTRIQUE HAGER", "fourniture", "1", [{ nom: "Tableau Hager" }]),
      ligne("3:004", "SENSIBILITE 30 MA DISJONCTEURS 2A 10A 16A", "suite"),
      ligne("3:005", "CHAPEAU PREVU PAR LE COUVREUR", "hors_quantitatif"),
    ] as Parameters<typeof titresEtSuites>[0];
    const out = titresEtSuites(lignes);
    expect(out.map((l) => l.ref)).toEqual(["3:003", "3:005"]);
    expect(out[0]!.designation).toBe("TABLEAU GENERAL ELECTRIQUE HAGER SENSIBILITE 30 MA DISJONCTEURS 2A 10A 16A");
    expect(out[0]!.fournitures).toHaveLength(1);
    const lecture = decodeLignes({ lignes: [...lignes] });
    expect(lecture?.lignes.map((l) => l.designation)).toEqual(["TABLEAU GENERAL ELECTRIQUE HAGER SENSIBILITE 30 MA DISJONCTEURS 2A 10A 16A", "CHAPEAU PREVU PAR LE COUVREUR"]);
  });

  it("une suite en tête de tranche (rien avant) est gardée comme ligne sans fourniture", () => {
    const out = titresEtSuites([ligne("4:001", "FILS BARETTE MONTAGE", "suite")] as Parameters<typeof titresEtSuites>[0]);
    expect(out).toEqual([expect.objectContaining({ ref: "4:001", role: "hors_quantitatif" })]);
  });

  // Vraie lecture du 24 octobre 2026 : 315 lignes pour 324. Un « titre » qui porte une quantité ou une fourniture est une
  // vraie ligne du devis, et une « suite » qui a sa propre quantité aussi : elles restent (§49.1).
  it("garde-fou : un titre avec une quantité ou une fourniture, une suite avec sa quantité, restent des lignes", () => {
    const out = titresEtSuites([
      ligne("5:001", "PRISE DE TERRE", "titre", "1", [{ nom: "Piquet de terre" }]),
      ligne("5:002", "BARETTE DE TERRE", "titre", "1"),
      ligne("5:003", "LIAISON EQUIPOTENTIEL", "suite", "1"),
      ligne("5:004", "CHAMBRE 1", "titre"),
    ] as Parameters<typeof titresEtSuites>[0]);
    expect(out.map((l) => [l.ref, l.role])).toEqual([
      ["5:001", "fourniture"],
      ["5:002", "hors_quantitatif"],
      ["5:003", "hors_quantitatif"],
    ]);
  });
});
