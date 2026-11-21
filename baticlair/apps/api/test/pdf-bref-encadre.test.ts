/**
 * Retour du fondateur (2026-10-11), sur le PDF joint : « Le chantier en bref doit venir en petit dans un cadre, car c'est
 * la liste de matériaux qui doit être mise en avant. » Le bref : un cadre, en petit, sans numéro ; « 1. Fournitures à
 * chiffrer » est le premier bloc numéroté, son titre le plus grand de la page.
 */
import { decodePDFRawStream, PDFArray, PDFDocument, PDFRawStream } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { packetDocument, packetDocumentLines, packetPdf, type SupplierPacket } from "../src/modules/price-requests/application/supplier-packet.js";

const PACKET: SupplierPacket = {
  entreprise: "Bati invest",
  chantier: "Test",
  commune: "Perros-Guirec",
  date: "2026-10-11",
  articles: [],
  a_chiffrer: [],
  resume: ["Couverture en tuiles canal, 100 m². Tuiles canal couleur sablée, liteaunage bois traité. Chantier à Perros-Guirec, bord de mer."],
  detail: [],
  joindre_detail: false,
  question_lien: null,
  fournitures: [
    { designation: "Tuiles Canal Charentaise sable traité", quantite: "3 340 pièces", precision: null },
    { designation: "Liteaux 27×40", quantite: "405 ml (env. 9 bottes de 50 ml)", precision: null },
  ],
};

/** Chaque texte du PDF et sa taille de police (pdf.js). */
async function sized(bytes: Uint8Array): Promise<{ str: string; size: number }[]> {
  const worker = await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
  (globalThis as { pdfjsWorker?: unknown }).pdfjsWorker = worker;
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes), useSystemFonts: false }).promise;
  const page = await doc.getPage(1);
  const content = await page.getTextContent();
  return content.items.flatMap((i) => ("str" in i && i.str.trim() ? [{ str: i.str, size: Math.round(Math.hypot(i.transform[0], i.transform[1]) * 10) / 10 }] : []));
}

describe("le PDF met la liste en avant : le bref en petit dans un cadre (fondateur, 2026-10-11)", () => {
  it("le bref n'a plus de numéro ; les fournitures sont le bloc 1", () => {
    const lines = packetDocumentLines(packetDocument(PACKET));
    expect(lines).toContain("Le chantier en bref");
    expect(lines).not.toContain("1. Le chantier en bref");
    expect(lines).toContain("1. Fournitures à chiffrer");
  });

  it("le bref est écrit plus petit que la liste, et son titre plus petit que celui des fournitures", async () => {
    const items = await sized(await packetPdf(PACKET));
    const size = (re: RegExp) => items.find((i) => re.test(i.str))?.size ?? Number.NaN;
    const bref = size(/^Couverture en tuiles canal/);
    const brefTitre = size(/Le chantier en bref/);
    const listeTitre = size(/Fournitures à chiffrer/);
    const ligne = size(/^Tuiles Canal Charentaise/);
    expect(bref).toBeLessThan(ligne);
    expect(brefTitre).toBeLessThan(listeTitre);
    expect(listeTitre).toBeGreaterThanOrEqual(14);
  });

  it("le bref est dans un cadre (un rectangle tracé autour du texte)", async () => {
    const pdf = await packetPdf(PACKET);
    const page = (await PDFDocument.load(pdf)).getPage(0);
    const contents = page.node.Contents();
    const streams = contents instanceof PDFArray ? contents.asArray().map((r) => page.doc.context.lookup(r)) : [contents];
    const raw = streams.map((st) => (st instanceof PDFRawStream ? Buffer.from(decodePDFRawStream(st).decode()).toString("latin1") : "")).join("\n");
    // Un tracé fermé, fond et trait (« B »), juste avant le titre du bref (7,5 pt) : le cadre.
    expect(raw).toMatch(/\nB\n[^]*?7\.5 Tf/);
  });
});
