import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { cocherLesNaissances } from "./support/suggestions.js";
import { mkdirSync, writeFileSync } from "node:fs";
import { initiales, packetDocument, packetDocumentLines, packetPdf, type SupplierPacket } from "../src/modules/price-requests/application/supplier-packet.js";
import { D2026_020_PDF } from "./support/d2026-020-pdf.js";
import { PdfJsPdfReader } from "../src/modules/documents/infrastructure/pdfjs-pdf-reader.js";
import { createTestApp, resetDatabase, signUpWithCompany, type Agent, type TestContext } from "./support/test-app.js";

/**
 * DROIT AU BUT : CE QUI PART CHEZ LE NÉGOCE (Greg, 17 novembre 2026, après son test d'un chantier de couverture ardoise
 * avec zinguerie, le devis D-2026-020) : « Le négoce reçoit une commande claire, rien d'autre. Il n'a pas à savoir à quoi
 * servent les articles. Les explications, le détail par usage et les calculs restent pour moi, dans l'app. »
 */
let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
  ctx.emails.clear();
});

/** Le texte du PDF (pdf.js, comme pour un devis reçu). */
async function pdfText(bytes: Uint8Array): Promise<string> {
  const content = await new PdfJsPdfReader().read(bytes, { maxPages: 20 });
  return content.pages.map((p) => p.lines.join("\n")).join("\n");
}

type Question = { id: string; texte: string; boutons: { label: string; valeur: string }[] };

/** Le chantier de Greg, déposé en PDF, lu (lecture réelle enregistrée), puis répondu comme lui : « je plie », gouttière de 25. */
async function chantierDeGreg(agent: Agent) {
  const res = await agent.post("/v1/quantitatifs").field("reference", "Extension ardoise").field("adresse", "3 rue du Port, 22620 Ploubazlanec").attach("file", Buffer.from(await D2026_020_PDF()), { filename: "devis.pdf", contentType: "application/pdf" });
  expect(res.status).toBe(201);
  const id = res.body.id as string;
  await cocherLesNaissances(agent, id);
  let current = (await agent.get(`/v1/quantitatifs/${id}`)).body as { questions: Question[]; projetId: string };
  const posees: string[] = [];
  if (!Array.isArray(current.questions)) console.log("ETAT0", JSON.stringify(current).slice(0, 600));
  for (let i = 0; i < 20 && (current.questions?.length ?? 0) > 0; i++) {
    const question = current.questions[0]!;
    posees.push(question.texte);
    const valeur = /faconnage/.test(question.id) ? "1" : (question.boutons[0]?.valeur ?? "ok");
    const r = await agent.post(`/v1/quantitatifs/${id}/calcul?ecran=1`).send({ reponses: [{ question: question.id, valeur }] });
    if (r.status !== 200) console.log("CALCUL", r.status, JSON.stringify(r.body).slice(0, 300));
    current = (await agent.get(`/v1/quantitatifs/${id}`)).body;
    if (!Array.isArray(current.questions)) { console.log("ETAT", JSON.stringify(current).slice(0, 400)); break; }
  }
  current = (await agent.get(`/v1/quantitatifs/${id}`)).body;
  return { q: current as never as Record<string, unknown>, posees, projectId: current.projetId, id };
}

describe("ce qui part chez le négoce : une commande claire, rien d'autre", () => {
  it("le chantier ardoise et zinguerie de Greg : la liste de l'app, le PDF et l'e-mail disent la même commande, et rien d'autre", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "BATI INVEST");
    const { q, posees, projectId, id } = await chantierDeGreg(agent);
    // Point 12 : le pureau ne se demande jamais ; les ardoises et les crochets sont chiffrés d'après le format et les crochets.
    expect(posees.join(" | ")).not.toMatch(/pureau/i);
    const liste = (q.lignes as { libelle: string; texte: string | null }[]).map((l) => [l.libelle, l.texte]);
    expect(liste).toEqual([
      // Règle changée (Greg, 21 novembre 2026) : un rang d'ardoises au faîtage (8 m, la bande de faîtage du devis) et à l'égout (10 m, la
      // gouttière du devis), compté avant la perte : (8 + 10) ÷ 0,22 m de large = 81,82 ardoises, × 1,05 = 85,91 de plus.
      // Avant : 2 106 (soit entre 2 105 et 2 106 avant l'arrondi) ; + 85,91 = entre 2 190,91 et 2 191,91 → 2 192. Avant 2 106 → 2 192.
      // Crochets : 2 192 ÷ 500 = 4,4 → 5 boîtes (inchangé).
      ["Ardoises naturelles Espagne 1er choix 32×22", "2 192 pièces"],
      ["Crochets d'ardoise inox Ø 2,7, longueur 11 cm", "5 boîtes de 500"],
      ["Gouttière havraise zinc dév. 25", "3 longueurs de 4 m"],
      ["Naissances dév. 25 Ø80", "2 pièces"],
      ["Crochets de gouttière havraise, acier galvanisé ou zinc", "20 pièces"],
      // Point 3 : une seule ligne par article identique, avec le total (rive, faîtage et porte-solin : 1 + 1 + 1 feuille).
      ["Feuilles zinc naturel 2 × 1 m, 0,65 mm", "3 pièces"],
      // Point 7 : « mortier de ciment » reste « mortier de ciment ».
      ["Mortier de ciment pour solin", "1 sac de 25 kg"],
      // Point 8 : l'unité de vente, la même dans l'app et dans le document.
      ["Tuyaux de descente zinc Ø 80", "2 tubes de 3 m"],
      ["Coudes zinc Ø 80", "4 pièces"],
    ]);
    expect(q.a_chiffrer).toEqual([]);
    // Greg, 17 novembre 2026 : le nombre de feuilles est une estimation, il s'ajuste d'un toucher. L'écran reçoit le repère
    // « estimation » pour cette ligne seulement, et une quantité ajustée reste dans la liste.
    const ecran = async () => ((await agent.get(`/v1/quantitatifs/${id}?ecran=1`)).body.ecran.purchase.toBuy as { key: string; label: string; quantity: string | null; estimation: boolean }[]);
    const estimees = (await ecran()).filter((i) => i.estimation);
    expect(estimees.map((i) => i.label)).toEqual(["Feuilles zinc naturel 2 × 1 m, 0,65 mm"]);
    expect((await agent.post(`/v1/quantitatifs/${id}/corrections`).send({ action: "fixer_quantite", id: estimees[0]!.key, quantite: "4", unite: "pièces" })).status).toBeLessThan(300);
    expect((await ecran()).find((i) => i.estimation)?.quantity).toBe("4 pièces");
    expect((await agent.post(`/v1/quantitatifs/${id}/corrections`).send({ action: "fixer_quantite", id: estimees[0]!.key, quantite: "3", unite: "pièces" })).status).toBeLessThan(300);
    expect((await agent.post(`/v1/quantitatifs/${id}/validation`)).status).toBe(200);
    const supplier = (await agent.post("/v1/suppliers").send({ name: "Point.P", email: "devis@pointp.fr", contactName: "Paul" })).body;
    const res = await agent.post(`/v1/projects/${projectId}/price-requests`).send({ supplierIds: [supplier.id] });
    expect(res.status).toBe(201);
    const packet = { ...(res.body.packet as SupplierPacket), date: (res.body.packet as SupplierPacket).date ?? "2026-11-17" };

    // POINT 9 : le document reflète exactement la liste validée dans l'app, mêmes lignes, mêmes quantités, même ordre.
    const table = packetDocument(packet).blocs.find((b) => b.kind === "table");
    expect(table?.kind === "table" ? table.lignes.map((r) => [r.designation, r.quantite, r.precision]) : null).toEqual(liste.map(([libelle, texte]) => [libelle, texte, null]));
    const pdf = await packetPdf(packet, [], { reponse: "extension-ardoise@reponse.mobiiz.fr" });
    const texte = (await pdfText(Buffer.from(pdf))).replace(/\s+/g, " ");
    for (const [libelle, quantite] of liste) expect(texte, libelle!).toContain(`${libelle} ${quantite!.replace(/^(\d[\d\s]*) /, "$1 ")}`.replace(/\s+/g, " "));

    // Points 3, 4, 5, 6, 8, 10 : ni usage, ni « ? », ni hypothèse, ni note pour l'artisan, ni doublon, ni section 3.
    const document = packetDocumentLines(packetDocument(packet, { reponse: "extension-ardoise@reponse.mobiiz.fr" })).join("\n");
    for (const interdit of [/\?/, /\bpour \d/i, /estimation|ajuste|hypoth[èe]se|à confirmer/i, /au choix du fournisseur/i, /à couvrir/i, /\(Ø ?80\)/, /Informations complémentaires/i, /d'étanchéité/i, /Ratios en cours/i, /a@example\.fr/])
      expect(document, String(interdit)).not.toMatch(interdit);
    expect(texte).not.toMatch(/\?|au choix du fournisseur|ajuste|a@example\.fr/i);
    // Point 6 : l'épaisseur du zinc reste sur le zinc.
    expect(document).not.toMatch(/Ardoises[^\n]*0,65/);
    // Point 10 : l'en-tête, deux lignes de description au plus, le tableau ; les initiales de l'entreprise, jamais le logo Mobiiz.
    const d = packetDocument(packet, { reponse: "extension-ardoise@reponse.mobiiz.fr" });
    expect(d.blocs.map((b) => b.titre)).toEqual(["Le chantier en bref", "Fournitures à chiffrer"]);
    expect(d.blocs[0]!.kind === "list" ? d.blocs[0]!.lignes.length : 99).toBeLessThanOrEqual(2);
    expect(initiales(d.entete.entreprise)).toBe("BI");
    expect(texte).toMatch(/\bBI\b/);
    expect(texte).toContain("BATI INVEST");
    expect(texte).not.toMatch(/logo/i);

    // Point 11 : l'e-mail court et neutre, « Bonjour, » sans prénom, sans paragraphe sur la création d'un compte.
    const mail = res.body.recipients[0].email.body as string;
    expect(mail.split("\n")).toEqual([
      "Bonjour,",
      expect.stringMatching(/^Voici une demande de prix pour un chantier .*\(liste en pièce jointe, 9 articles\)\.$/),
      "Pour répondre : répondez simplement à cet e-mail avec votre devis, ou chiffrez en ligne en 2 minutes :",
      "(votre lien personnel)",
      "Merci d'avance,",
      expect.stringMatching(/BATI INVEST$/),
    ]);
    expect(mail).not.toMatch(/Paul|accès négoce|créer votre accès|a@example\.fr/);
    if (process.env.APERCU_DIR) {
      mkdirSync(process.env.APERCU_DIR, { recursive: true });
      writeFileSync(`${process.env.APERCU_DIR}/demande.pdf`, pdf);
      writeFileSync(`${process.env.APERCU_DIR}/mail.txt`, mail);
    }
  }, 60000);
});
