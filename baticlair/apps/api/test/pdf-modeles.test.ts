/**
 * ASSISTANT MOBIIZ (Greg, 31 octobre 2026, points 8 à 12) : trois modèles du PDF « Demande de prix — Matériaux »
 * (Essentiel, Classique par défaut, Détaillé) rendus par LE MÊME générateur depuis les mêmes données ; une couleur
 * principale ; le tableau désignation · caractéristiques · quantité · unité ; l'adresse de réponse seulement quand elle
 * existe (jamais inventée) ; l'adresse du chantier et la livraison seulement quand l'artisan les a données.
 */
import { describe, expect, it } from "vitest";
import { packetDocument, packetDocumentLines, packetPdf, type SupplierPacket, type ZonePdf } from "../src/modules/price-requests/application/supplier-packet.js";

const PACKET: SupplierPacket = {
  entreprise: "Toitures Exemple",
  chantier: "Lannion",
  commune: "Lannion",
  date: "2026-10-31",
  articles: [],
  a_chiffrer: [],
  resume: ["Couverture en ardoise naturelle, 120 m². Chantier à Lannion."],
  detail: [],
  joindre_detail: false,
  question_lien: null,
  fournitures: [
    { designation: "Ardoise naturelle 32×22", quantite: "1 200 pièces", precision: "Espagne, 1er choix", cle: "a1" },
    { designation: "Liteau 18×40", quantite: "180 m", precision: null, cle: "a2" },
    { designation: "Crochet ardoise inox", quantite: "à préciser", precision: null, cle: "a3" },
  ],
};

async function items(bytes: Uint8Array): Promise<string[]> {
  const worker = await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
  (globalThis as { pdfjsWorker?: unknown }).pdfjsWorker = worker;
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes), useSystemFonts: false }).promise;
  const out: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) out.push(...(await (await doc.getPage(i)).getTextContent()).items.flatMap((x) => ("str" in x && x.str.trim() ? [x.str] : [])));
  return out;
}

describe("le PDF « Demande de prix — Matériaux » en trois modèles", () => {
  it("le titre, le tableau quantité et unité séparées, dans chaque modèle ; rien d'inventé sans adresse de réponse", async () => {
    for (const modele of ["essentiel", "classique", "detaille"] as const) {
      const t = await items(await packetPdf(PACKET, [], { modele }));
      expect(t, modele).toContain("Demande de prix — Matériaux");
      expect(t, modele).toContain("Ardoise naturelle 32×22");
      expect(t, modele).toContain("1 200");
      expect(t, modele).toContain("pièces");
      expect(t, modele).toContain("à préciser");
      expect(t.join(" "), modele).not.toMatch(/proposition commerciale/);
      expect(t, modele).toContain("Unité");
    }
  });

  it("Essentiel n'a pas le bref ; Classique l'encadre ; Détaillé le donne en description et numérote les lignes", async () => {
    const essentiel = await items(await packetPdf(PACKET, [], { modele: "essentiel" }));
    expect(essentiel.join(" ")).not.toMatch(/Couverture en ardoise/);
    const classique = await items(await packetPdf(PACKET, []));
    expect(classique).toContain("Le chantier en bref");
    expect(classique).toContain("Caractéristiques");
    const detaille = await items(await packetPdf(PACKET, [], { modele: "detaille" }));
    expect(detaille).toContain("Description du chantier");
    expect(detaille).toContain("N°");
    expect(detaille).toContain("3");
  });

  it("le bloc de réponse : la phrase du brief, l'adresse donnée, les conditions (frais de livraison à part)", async () => {
    const d = packetDocument(PACKET, { reponse: "toitures-exemple+rabcdefgh@mobiiz.fr" });
    expect(d.reponse?.phrase).toBe("Merci d'envoyer votre proposition commerciale à l'adresse suivante :");
    expect(packetDocumentLines(d)).toContain("toitures-exemple+rabcdefgh@mobiiz.fr");
    const t = await items(await packetPdf(PACKET, [], { reponse: "toitures-exemple+rabcdefgh@mobiiz.fr", couleur: "bleu" }));
    expect(t).toContain("Merci d'envoyer votre proposition commerciale à l'adresse suivante :");
    expect(t).toContain("toitures-exemple+rabcdefgh@mobiiz.fr");
    expect(t.join(" ")).toMatch(/frais de livraison à part/);
    expect(packetDocument(PACKET).reponse).toBeNull();
  });

  it("l'adresse du chantier et la livraison seulement quand elles sont données", async () => {
    expect(packetDocument(PACKET).chantierInfos).toEqual([]);
    const avec = { ...PACKET, adresse_chantier: "3 rue du Port, 22300 Lannion", livraison: "sur chantier le 12 novembre" };
    expect(packetDocument(avec).chantierInfos).toEqual(["Adresse du chantier : 3 rue du Port, 22300 Lannion", "Livraison : sur chantier le 12 novembre"]);
    expect(await items(await packetPdf(avec))).toContain("Livraison : sur chantier le 12 novembre");
  });

  it("chaque ligne du tableau a sa zone (pour toucher la ligne dans l'aperçu), sur plusieurs pages", async () => {
    const long = { ...PACKET, fournitures: Array.from({ length: 70 }, (_, i) => ({ designation: `Article ${i + 1}`, quantite: `${i + 1} pièces`, precision: null, cle: `k${i}` })) };
    const zones: ZonePdf[] = [];
    await packetPdf(long, [], { zones });
    expect(zones).toHaveLength(70);
    expect(new Set(zones.map((z) => z.page)).size).toBeGreaterThan(1);
    for (const z of zones) expect(z.hauteur).toBeGreaterThan(0);
  });
});
