import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { pdfPageCount } from "../src/modules/documents/index.js";
import { packetLines, packetPdf, packetText, priceLeak, type SupplierPacket } from "../src/modules/price-requests/application/supplier-packet.js";
import { createTestApp, resetDatabase, signUpWithCompany, type Agent, type TestContext } from "./support/test-app.js";

/**
 * L'ENVOI AU FOURNISSEUR (référentiel §42, §43) : un seul contenu en trois blocs, assemblé sans IA ;
 * le corps du mail et le PDF joint en sont deux rendus. Aucun prix n'y apparaît, même quand le
 * devis en contient (lignes Rappidos avec leurs prix). Le test refuse tout prix.
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

/** Un devis Rappidos AVEC prix, validé jusqu'à la liste d'achats. */
async function chantierPret(agent: Agent) {
  const q = (
    await agent.post("/v1/quantitatifs").send({
      reference: "Dupont — réfection toiture",
      adresse: "12 rue de Siam, 29200 Brest",
      lignes: [
        { libelle: "Couverture en ardoises naturelles 30x22 posées au crochet", quantite: "200", unite: "m²", prix: "85,00" },
        { libelle: "Gouttière zinc demi-ronde 25", quantite: 24, unite: "ml", prix: "42" },
        { libelle: "Chatière de ventilation", quantite: "4", unite: "u", prix: "19,90" },
      ],
    })
  ).body;
  await agent.post(`/v1/quantitatifs/${q.id}/reponses`).send({ reponses: [{ question: "engine:param:nb_descentes", valeur: "2" }] });
  let current = (await agent.get(`/v1/quantitatifs/${q.id}`)).body;
  for (let i = 0; i < 10 && current.questions.length > 0; i++) {
    const question = current.questions[0];
    current = (await agent.post(`/v1/quantitatifs/${q.id}/reponses`).send({ reponses: [{ question: question.id, valeur: question.boutons[0]?.valeur ?? "ok" }] })).body;
  }
  expect((await agent.post(`/v1/quantitatifs/${q.id}/validation`)).status).toBe(200);
  const supplier = (await agent.post("/v1/suppliers").send({ name: "Point.P", email: "devis@pointp.fr", contactName: "Paul" })).body;
  return { projectId: q.projetId as string, supplierId: supplier.id as string };
}

describe("envoi fournisseur : un contenu, trois blocs, aucun prix", () => {
  it("la demande porte les trois blocs ; le mail prêt en est le texte, et il ne contient aucun prix", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const { projectId, supplierId } = await chantierPret(agent);
    const res = await agent.post(`/v1/projects/${projectId}/price-requests`).send({ supplierIds: [supplierId], message: "Livraison sur chantier possible ?", dueDate: "2026-10-15" });
    expect(res.status).toBe(201);
    const { packet } = res.body;
    expect(packet).toMatchObject({ entreprise: "Toitures Martin", chantier: "Dupont — réfection toiture", joindre_detail: true });
    // Bloc 1 : les lignes prêtes à charger (ardoises, crochets, liteaux, gouttière…), jamais une mesure en m².
    expect(packet.articles).toEqual(
      expect.arrayContaining([expect.stringMatching(/^Ardoises 30×22 : 9 200 pièces/), expect.stringMatching(/^Crochets d'ardoise : 9 384 pièces/), expect.stringMatching(/^Chatière de ventilation : 4 u/)]),
    );
    for (const a of packet.articles) expect(a).not.toMatch(/ : [\d\s,.]+ m²/);
    // Bloc 2 : le chantier en bref, avec les réponses de l'artisan, en 5 lignes au plus.
    expect(packet.resume.length).toBeLessThanOrEqual(7);
    expect(packet.resume.join(" ")).toMatch(/pente du toit 45°/);
    expect(packet.resume.join(" ")).toMatch(/nombre de descentes 2/);
    expect(packet.resume).toContain("Réponse souhaitée avant le 15 octobre 2026");
    expect(packet.resume).toContain("Livraison sur chantier possible ?");

    const email = res.body.recipients[0].email;
    expect(email.subject).toBe("Commande – Dupont — réfection toiture – Toitures Martin");
    expect(email.body).toMatch(/^COMMANDE : Toitures Martin · chantier Dupont — réfection toiture · Brest · \d+ \S+ 2026\n\nÀ COMMANDER\n/);
    expect(email.body).toMatch(/\nLE CHANTIER EN BREF\n/);
    expect(email.body).toMatch(/\nDÉTAIL DU DEVIS \(sans prix\)\nCouverture en ardoises naturelles 30x22 posées au crochet · 200 m²\n/);
    // Le test du §42.2 et du §43.5 : rien du devis chiffré ne passe (85,00 €, 42, 19,90…).
    expect(priceLeak(email.body)).toBeNull();
    expect(email.body).not.toMatch(/85,00|19,90/);
  });

  it("le serveur envoie le mail avec le PDF joint, puis la demande est « envoyée » ; mail et PDF ont le même contenu", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const { projectId, supplierId } = await chantierPret(agent);
    const created = (await agent.post(`/v1/projects/${projectId}/price-requests`).send({ supplierIds: [supplierId] })).body;
    const recipient = created.recipients[0];

    const sent = await agent.post(`/v1/price-request-recipients/${recipient.id}/send`);
    expect(sent.status).toBe(200);
    expect(sent.body.recipients[0]).toMatchObject({ status: "sent" });
    expect(sent.body.recipients[0].sentAt).not.toBeNull();

    const mail = ctx.emails.lastTo("devis@pointp.fr")!;
    expect(mail.subject).toBe(recipient.email.subject);
    expect(mail.text).toBe(recipient.email.body);
    expect(mail.attachments).toHaveLength(1);
    expect(mail.attachments![0]).toMatchObject({ filename: "commande-dupont-refection-toiture.pdf", contentType: "application/pdf" });
    const pdf = Buffer.from(mail.attachments![0]!.contentBase64, "base64");
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(await pdfPageCount(pdf)).toBeGreaterThanOrEqual(1);

    // Le même PDF se télécharge depuis l'app (pour imprimer ou transmettre au magasin).
    const download = await agent.get(`/v1/price-requests/${created.id}/commande.pdf`);
    expect(download.status).toBe(200);
    expect(download.headers["content-type"]).toMatch(/application\/pdf/);
    expect(download.headers["content-disposition"]).toContain("commande-dupont-refection-toiture.pdf");
  });

  it("« Exporter PDF » (§21.3) : la liste validée, avant tout envoi, rendue par le même générateur, sans prix ; refusé avant validation et pour une autre entreprise", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "export@example.fr", "Toitures Martin");
    const { projectId, supplierId } = await chantierPret(agent);
    const pdf = await agent.get(`/v1/projects/${projectId}/commande.pdf`).buffer(true);
    expect(pdf.status).toBe(200);
    expect(pdf.headers["content-type"]).toMatch(/application\/pdf/);
    expect(pdf.headers["content-disposition"]).toContain("commande-dupont-refection-toiture.pdf");
    expect((pdf.body as Buffer).subarray(0, 5).toString()).toBe("%PDF-");
    // Même contenu que le PDF joint à la demande (un seul générateur) : même taille à la date près.
    const created = (await agent.post(`/v1/projects/${projectId}/price-requests`).send({ supplierIds: [supplierId] })).body;
    const sent = await agent.get(`/v1/price-requests/${created.id}/commande.pdf`).buffer(true);
    expect(Math.abs((sent.body as Buffer).length - (pdf.body as Buffer).length)).toBeLessThan(64);
    // Une autre entreprise ne lit pas ce chantier.
    const other = await signUpWithCompany(ctx.app, "intrus@example.fr", "Toitures Le Gall");
    expect((await other.agent.get(`/v1/projects/${projectId}/commande.pdf`)).status).not.toBe(200);
    // Un chantier sans liste validée : refus clair, pas un PDF vide.
    const vide = (await agent.post("/v1/projects").send({ name: "Chantier vide" })).body;
    const refused = await agent.get(`/v1/projects/${vide.id}/commande.pdf`);
    expect(refused.status).toBe(400);
    expect(JSON.stringify(refused.body)).toContain("takeoff_not_validated");
  });

  it("case « Joindre le détail du chantier » : cochée par défaut, mémorisée par entreprise, et le bloc 3 disparaît si elle est décochée", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    expect((await agent.get("/v1/price-requests/settings")).body).toEqual({ attachQuoteDetail: true, deliversEmail: true });
    expect((await agent.patch("/v1/price-requests/settings").send({ attachQuoteDetail: false })).body.attachQuoteDetail).toBe(false);
    expect((await agent.get("/v1/price-requests/settings")).body.attachQuoteDetail).toBe(false);
    const { projectId, supplierId } = await chantierPret(agent);
    const created = (await agent.post(`/v1/projects/${projectId}/price-requests`).send({ supplierIds: [supplierId] })).body;
    expect(created.packet.joindre_detail).toBe(false);
    expect(created.recipients[0].email.body).not.toMatch(/DÉTAIL DU DEVIS/);
    // L'autre entreprise garde la valeur par défaut.
    const other = await signUpWithCompany(ctx.app, "b@example.fr", "Toitures Le Gall");
    expect((await other.agent.get("/v1/price-requests/settings")).body.attachQuoteDetail).toBe(true);
  });

  it("le générateur refuse les prix : le test du §42.2 attrape €, HT, TVA, un montant suivi d'une devise, mais pas « sans prix »", () => {
    expect(priceLeak("DÉTAIL DU DEVIS (sans prix)\nCouverture ardoises · 200 m²")).toBeNull();
    expect(priceLeak("Ardoises : 9 200 pièces, soit 12 palettes")).toBeNull();
    expect(priceLeak("Ardoises 85,00 €")).toBe("€");
    expect(priceLeak("Total HT 2 805,30")).toMatch(/HT|Total/);
    expect(priceLeak("remise 10 %")).toBe("remise");
    expect(priceLeak("1 400,00 EUR")).toMatch(/EUR/);
    expect(priceLeak("prix unitaire 1,12")).toMatch(/prix/i);
  });

  it("le PDF est produit depuis les mêmes lignes que le mail, même avec des caractères que la police ne connaît pas", async () => {
    const packet: SupplierPacket = {
      entreprise: "Toitures Martin",
      chantier: "Toiture Dupont",
      commune: "Brest",
      date: "2026-10-03",
      articles: ["Ardoises 30×22 : 9 200 pièces, soit ≈ 12 palettes", "Zinc naturel en bobine : 501 kg"],
      a_chiffrer: [],
      resume: ["pente du toit 45° · région ardoise III · je façonne"],
      detail: [{ libelle: "Couverture ardoises", mesure: "200 m²", precisions: ["ardoise 30×22"] }],
      joindre_detail: true,
      question_lien: null,
    };
    const lines = packetLines(packet).map((l) => l.text);
    expect(packetText(packet)).toBe(lines.join("\n"));
    const pdf = await packetPdf(packet);
    expect(Buffer.from(pdf.subarray(0, 5)).toString()).toBe("%PDF-");
    expect(await pdfPageCount(pdf)).toBe(1);
    // Un long contenu passe sur plusieurs pages sans erreur.
    const long = { ...packet, articles: Array.from({ length: 120 }, (_, i) => `Article ${i + 1} : ${i + 1} pièces`) };
    expect(await pdfPageCount(await packetPdf(long))).toBeGreaterThan(1);
  });
});
