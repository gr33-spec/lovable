import { describe, expect, it } from "vitest";
import { natureDuDocument } from "../src/index.js";

describe("Importer un document : le type se détermine sans le demander (Greg, 31 octobre 2026)", () => {
  it("une photo ou une capture : la lecture de liste", () => {
    expect(natureDuDocument({ type: "image/jpeg", nom: "IMG_2031.jpg" }, null)).toBe("liste");
    expect(natureDuDocument({ type: "image/png", nom: "Capture d'écran.png" }, null)).toBe("liste");
    expect(natureDuDocument({ type: "", nom: "photo.HEIC" }, null)).toBe("liste");
  });
  it("un PDF de devis (montants, total, TVA) : le devis", () => {
    const devis = "DEVIS N° D-2026-018 Couverture ardoise 120 m² Prix unitaire 45,00 € Total HT 5 400,00 € TVA 10 % 540,00 € Total TTC 5 940,00 €";
    expect(natureDuDocument({ type: "application/pdf", nom: "devis.pdf" }, devis)).toBe("devis");
  });
  it("un PDF de liste (des matériaux, des quantités, aucun prix) : la liste", () => {
    const liste = "Ma liste chantier Lannion\\nArdoise naturelle 32x22 1200 pièces\\nLiteau 18x40 180 m\\nCrochet inox 1250\\nÉcran HPV 3 rouleaux";
    expect(natureDuDocument({ type: "application/pdf", nom: "liste.pdf" }, liste)).toBe("liste");
  });
  it("un PDF sans texte (scanné) : le devis, comme avant", () => {
    expect(natureDuDocument({ type: "application/pdf", nom: "scan.pdf" }, "")).toBe("devis");
    expect(natureDuDocument({ type: "application/pdf", nom: "scan.pdf" }, null)).toBe("devis");
  });
  it("un devis sans prix, reconnu à son titre", () => {
    expect(natureDuDocument({ type: "application/pdf", nom: "d.pdf" }, "DEVIS D-TEST-CANAL Ref Designation Qte Unite 1 Tuiles canal 100 m2")).toBe("devis");
    expect(natureDuDocument({ type: "application/pdf", nom: "d.pdf" }, "Devis n° 2026-018 — Couverture ardoise, 120 m², liteaux 180 m")).toBe("devis");
  });
  it("un seul indice ne suffit pas (le mot « devis » dans une liste)", () => {
    expect(natureDuDocument({ type: "application/pdf", nom: "l.pdf" }, "Liste pour le devis du client : ardoises 1200 pièces, liteaux 180 m, crochets 1250")).toBe("liste");
  });
  it("une photo dont le nom dit un devis (1er novembre 2026) : le devis ; une photo sans nom parlant : la liste", () => {
    expect(natureDuDocument({ type: "image/jpeg", nom: "Devis Martin.jpg" }, null)).toBe("devis");
    expect(natureDuDocument({ type: "image/png", nom: "facture_2026.png" }, null)).toBe("devis");
    expect(natureDuDocument({ type: "image/jpeg", nom: "IMG_2041.jpg" }, null)).toBe("liste");
    // WebP ou HEIC : la lecture de devis ne prend que JPEG et PNG ; la liste lit tout.
    expect(natureDuDocument({ type: "image/webp", nom: "devis.webp" }, null)).toBe("liste");
  });
});
