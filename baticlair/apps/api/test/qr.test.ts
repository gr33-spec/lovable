import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { qrCode, qrSvg, versionPour } from "../src/platform/qr/qr.js";

/**
 * LE QR CODE MAISON (Greg, 28 octobre 2026, point 3) : chaque matrice est comparée module par module à celle d'un encodeur
 * de référence (reportlab, niveau M, mode octets), avec le masque que la référence a choisi. Versions 1, 5 et 9.
 */
const reference = JSON.parse(readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures", "qr-reference.json"), "utf8")) as Record<string, { taille: number; lignes: string[] }>;

const lignes = (q: { taille: number; modules: Uint8Array }) => Array.from({ length: q.taille }, (_, y) => Array.from({ length: q.taille }, (_, x) => (q.modules[y * q.taille + x] ? "1" : "0")).join(""));

describe("le QR code sans dépendance", () => {
  for (const [texte, ref] of Object.entries(reference)) {
    it(`encode « ${texte.slice(0, 40)}… » (${ref.taille} modules) comme la référence`, () => {
      const q = qrCode(texte);
      expect(q.taille).toBe(ref.taille);
      // La référence a pu choisir un autre masque : avec le sien, les matrices sont identiques, module par module.
      const identique = [0, 1, 2, 3, 4, 5, 6, 7].some((k) => lignes(qrCode(texte, k)).join("\n") === ref.lignes.join("\n"));
      expect(identique).toBe(true);
    });
  }
  it("choisit la plus petite version qui contient le texte, et refuse au-delà de 213 octets", () => {
    expect(versionPour(5)).toBe(1);
    expect(versionPour(17)).toBe(2);
    expect(versionPour(66)).toBe(5);
    expect(versionPour(213)).toBe(10);
    expect(() => versionPour(214)).toThrow();
  });
  it("rend un SVG de rectangles, avec une marge de 4 modules", () => {
    const svg = qrSvg("Mobiiz", 100);
    expect(svg).toContain('viewBox="0 0 29 29"');
    expect(svg).toContain("<rect");
  });
});
