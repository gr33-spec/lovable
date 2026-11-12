/**
 * LE PDF DE DEMANDE DE PRIX (Greg, 12 novembre 2026, dossier de corrections UX, point 6). La section qui s'appelait
 * « Détail du devis » recopiait les lignes du tableau « Fournitures à chiffrer ». Maintenant : jamais une ligne du
 * tableau n'y est redite ; sans contexte réel la section n'existe pas ; avec du contexte (l'ouvrage, sa mesure, ses
 * précisions, tels que fournis ou validés par l'artisan), elle s'appelle « Informations complémentaires sur le chantier »
 * et ne contient que lui. Vérifié sur le document et sur le texte du PDF, court et sur plusieurs pages.
 */
import { describe, expect, it } from "vitest";
import { packetDocument, packetMail, packetPdf, TITRE_COMPLEMENTS, type SupplierPacket } from "../src/modules/price-requests/application/supplier-packet.js";
import { pdfPageCount } from "../src/modules/documents/index.js";
import { PdfJsPdfReader } from "../src/modules/documents/infrastructure/pdfjs-pdf-reader.js";

async function pdfText(bytes: Uint8Array): Promise<string> {
  const content = await new PdfJsPdfReader().read(bytes, { maxPages: 20 });
  return content.pages.map((p) => p.lines.join("\n")).join("\n");
}

const base: SupplierPacket = {
  entreprise: "BATI INVEST",
  chantier: "Liste du 12 novembre",
  commune: null,
  date: "2026-11-12",
  articles: [],
  a_chiffrer: [],
  resume: [],
  detail: [],
  joindre_detail: true,
  question_lien: null,
  fournitures: [{ designation: "Ardoise naturelle 32×22 · Espagne 1er choix", quantite: "2000 pièces", precision: null }],
  expediteur: { nom: "Greg", adresse: null, siret: null, telephone: "06 12 34 56 78", email: null },
};
const titres = (p: SupplierPacket) => packetDocument(p).blocs.map((b) => b.titre);

describe("PDF de demande de prix : pas de redite du tableau", () => {
  it("la capture de Greg : le « détail » redit la seule ligne du tableau, la section disparaît", async () => {
    const p: SupplierPacket = { ...base, detail: [{ libelle: "Ardoise naturelle 32x22 · Espagne 1er choix", mesure: "2000 pièces", precisions: [] }] };
    expect(titres(p)).toEqual(["Fournitures à chiffrer"]);
    const texte = await pdfText(Buffer.from(await packetPdf(p)));
    expect(texte).not.toMatch(/Détail du devis|Informations complémentaires/);
    expect(texte.match(/Ardoise naturelle/g)).toHaveLength(1);
    expect(await pdfPageCount(Buffer.from(await packetPdf(p)))).toBe(1);
  });

  it("du vrai contexte : seule la ligne de contexte reste, sous son nouveau titre ; rien n'est inventé", () => {
    const p: SupplierPacket = {
      ...base,
      detail: [
        { libelle: "ARDOISE NATURELLE 32 × 22 Espagne 1er choix", mesure: "2000 pièces", precisions: [] },
        { libelle: "Réfection de la couverture d'une maison en bord de mer", mesure: "120 m²", precisions: ["pente 45°", "accès par échafaudage"] },
      ],
    };
    const doc = packetDocument(p);
    expect(doc.blocs.map((b) => b.titre)).toEqual(["Fournitures à chiffrer", TITRE_COMPLEMENTS]);
    const bloc = doc.blocs.find((b) => b.titre === TITRE_COMPLEMENTS)!;
    expect(bloc.kind === "list" ? bloc.lignes : []).toEqual(["Réfection de la couverture d'une maison en bord de mer · 120 m² · pente 45° · accès par échafaudage"]);
  });

  it("case décochée ou aucun détail : pas de section", () => {
    expect(titres({ ...base, joindre_detail: false, detail: [{ libelle: "Réfection de couverture", mesure: "120 m²", precisions: [] }] })).toEqual(["Fournitures à chiffrer"]);
    expect(titres(base)).toEqual(["Fournitures à chiffrer"]);
  });

  it("PDF sur plusieurs pages : chaque fourniture une seule fois, le contexte une seule fois", async () => {
    const fournitures = Array.from({ length: 90 }, (_, i) => ({ designation: `Fourniture numéro ${i + 1} du chantier`, quantite: `${i + 1} u`, precision: null }));
    const p: SupplierPacket = { ...base, fournitures, detail: [...fournitures.slice(0, 40).map((f) => ({ libelle: f.designation, mesure: f.quantite, precisions: [] })), { libelle: "Rénovation complète d'une longère", mesure: null, precisions: ["accès étroit"] }] };
    const pdf = Buffer.from(await packetPdf(p));
    expect(await pdfPageCount(pdf)).toBeGreaterThan(1);
    const texte = await pdfText(pdf);
    expect(texte.match(/Fourniture numéro 7 du chantier/g)).toHaveLength(1);
    expect(texte.match(/Rénovation complète d'une longère/g)).toHaveLength(1);
    expect(texte).toContain(TITRE_COMPLEMENTS);
    expect(texte).not.toContain("Détail du devis");
  });

  it("le mail ne parle plus de « détail du devis sans prix »", () => {
    expect(packetMail({ ...base, detail: [{ libelle: "Réfection", mesure: null, precisions: [] }] }, { lien: "https://exemple.fr/chiffrer/abc" })).not.toMatch(/détail du devis/i);
  });
});
