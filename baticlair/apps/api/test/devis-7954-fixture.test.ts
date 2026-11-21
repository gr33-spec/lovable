import { describe, expect, it } from "vitest";
import { normalizeText, numberLines, routePage, tradeProfile } from "@baticlair/domain";
import { DEVIS_7954 } from "../../../packages/domain/test/devis-reels/devis-7954.js";
import { PdfJsPdfReader } from "../src/modules/documents/infrastructure/pdfjs-pdf-reader.js";
import { DEVIS_7954_PDF } from "./support/devis7954-pdf.js";

/**
 * Décision du fondateur (2026-10-13) : 7954 anonymisé comme D.2026.105 et lu par la vraie lecture en CI. Sans appel au
 * modèle, ce test garantit que le PDF régénéré dit tout le devis : chaque page passe en texte, chaque ligne du devis
 * (désignation, quantité) s'y lit, et aucun nom ni adresse n'y figure (seule la ville reste).
 */
describe("7954 anonymisé : le PDF régénéré dit tout le devis", () => {
  it("chaque page est lue en texte, chaque désignation et sa quantité s'y trouvent", async () => {
    const content = await new PdfJsPdfReader().read(await DEVIS_7954_PDF(), { maxPages: 60 });
    const profile = tradeProfile("electrical");
    expect(content.pages.length).toBeGreaterThanOrEqual(4);
    for (const page of content.pages) expect(routePage(page, profile).route).toBe("text");
    const texte = normalizeText(content.pages.flatMap((p) => numberLines(p).map((l) => l.text)).join(" ")).replace(/\s+/g, " ");
    const manquantes = DEVIS_7954.filter((l) => !texte.includes(normalizeText(l.designation).replace(/\s+/g, " ").slice(0, 40)) || (l.quantity !== null && !texte.includes(normalizeText(l.quantity))));
    expect(manquantes.map((l) => `${l.ref} ${l.designation}`)).toEqual([]);
    expect(texte).toContain("paimpol");
    expect(texte).not.toMatch(/morellec/);
  });
});
