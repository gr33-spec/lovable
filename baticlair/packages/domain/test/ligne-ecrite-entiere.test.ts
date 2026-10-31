import { describe, expect, it } from "vitest";
import { ecranDeLecture, lectureDepuisLignes, ROOFING_REFERENTIAL } from "../src/index.js";

/**
 * UNE LIGNE ÉCRITE N'EST JAMAIS COUPÉE (catalogue métier, Greg, 31 octobre 2026 : « conserve sa désignation originale ») :
 * dans une liste sans lecture, ce qui suit « - » partait à la poubelle ; il devient la précision de la ligne.
 */
describe("une ligne écrite à la main garde tout ce qui est écrit", () => {
  it("« Tuile Zéphyr terre cuite - modèle ZX 12 » : le nom, puis la précision", () => {
    const lecture = lectureDepuisLignes([{ id: "l1", designation: "Tuile Zéphyr terre cuite - modèle ZX 12", quantity: "40", unit: "u" }]);
    expect(lecture.lignes[0]!.fournitures[0]).toMatchObject({ nom: "Tuile Zéphyr terre cuite", precision: "modèle ZX 12" });
    const e = ecranDeLecture({ ref: ROOFING_REFERENTIAL, lecture, answers: {} as never });
    const item = e.purchase.toBuy[0]!;
    expect(`${item.label} ${item.precision ?? ""}`).toContain("modèle ZX 12");
  });

  it("sans « - », rien ne change", () => {
    const lecture = lectureDepuisLignes([{ id: "l1", designation: "Liteau 18×40 · sapin traité classe 2", quantity: "200", unit: "m" }]);
    expect(lecture.lignes[0]!.fournitures[0]).toMatchObject({ nom: "Liteau 18×40 · sapin traité classe 2", precision: null });
  });
});
