import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { PdfJsPdfReader } from "../src/modules/documents/infrastructure/pdfjs-pdf-reader.js";
import { forbiddenWord, priceLeak } from "../src/modules/price-requests/application/supplier-packet.js";
import { createTestApp, resetDatabase, signUp, type Agent, type TestContext } from "./support/test-app.js";

/**
 * §45 — LA DEMANDE DE DEVIS : un mail court (45.2), un PDF structuré avec le logo et les coordonnées du compte (45.3),
 * le vocabulaire du 45.4. Tests permanents du §45.7, sur le chantier Test (zinc joint debout 91 m², Brest).
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

/** PNG 1 × 1 px : le logo du compte. */
const LOGO = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
export const CHANTIER_TEST = [
  { libelle: "Couverture zinc à joint debout prépatiné gris quartz 0,65 mm, monopente, rampant 7 m, largeur 13 m", quantite: "91", unite: "m²", prix: "142,00" },
  { libelle: "Voligeage en sapin traité 18×200 mm", quantite: "91", unite: "m²", prix: "38,00" },
  { libelle: "Bande zinc d'égout", quantite: "13", unite: "ml", prix: "45,00" },
  { libelle: "Gouttière zinc demi-ronde", quantite: "13", unite: "ml", prix: "52,00" },
];
/**
 * Les réponses de Greg sur le chantier Test (les questions du comptoir, §47.8) : il façonne, 2 descentes en Ø 80,
 * développé 33 cm (bande et gouttière), crochets de gouttière en façade (bandeau).
 */
const REPONSES: Record<string, string> = {
  "engine:param:faconnage": "1",
  "engine:param:nb_descentes": "2",
  "engine:param:developpe_gouttiere": "33",
  "engine:param:fixation_crochet": "2",
  "engine:param:diametre_descente": "80",
  "engine:param:developpe": "330",
};

export async function compteBatiInvest(): Promise<Agent> {
  const agent = await signUp(ctx.app, "greg@batiinvest.fr", "Greg");
  await agent.post("/v1/companies").send({ name: "Bati invest", trades: ["roofing"] }).expect(201);
  await agent
    .patch("/v1/company/profile")
    .send({ address: "4 rue de Siam, 29200 Brest", siret: "123 456 789 00012", phone: "06 12 34 56 78", email: "greg@batiinvest.fr" })
    .expect(200);
  await agent.put("/v1/company/logo").attach("file", LOGO, { filename: "logo.png", contentType: "image/png" }).expect(200);
  return agent;
}

async function chantierTest(agent: Agent, reponses: Record<string, string> = REPONSES) {
  const q = (await agent.post("/v1/quantitatifs").send({ reference: "Test", adresse: "18 rue de Siam, 29200 Brest", lignes: CHANTIER_TEST })).body;
  await agent.post(`/v1/quantitatifs/${q.id}/reponses`).send({ reponses: Object.entries(reponses).map(([question, valeur]) => ({ question, valeur })) });
  let current = (await agent.get(`/v1/quantitatifs/${q.id}`)).body;
  for (let i = 0; i < 10 && current.questions.length > 0; i++) {
    const question = current.questions[0];
    current = (await agent.post(`/v1/quantitatifs/${q.id}/reponses`).send({ reponses: [{ question: question.id, valeur: question.boutons[0]?.valeur ?? "ok" }] })).body;
  }
  expect((await agent.post(`/v1/quantitatifs/${q.id}/validation`)).status).toBe(200);
  const supplier = (await agent.post("/v1/suppliers").send({ name: "Point.P Brest", email: "devis@pointp-brest.fr" })).body;
  return { projectId: q.projetId as string, supplierId: supplier.id as string, quantitatifId: q.id as string };
}

/** Le texte du PDF, page par page (pdf.js, comme pour un devis reçu). */
async function pdfText(bytes: Uint8Array): Promise<string> {
  const content = await new PdfJsPdfReader().read(bytes, { maxPages: 20 });
  return content.pages.map((p) => p.lines.join("\n")).join("\n");
}

describe("§45.7 — la demande de devis du chantier Test", () => {
  it("1. le mail sort avec la structure du 45.2 ; ni « commande », ni « référentiel », ni « BatiClair » dans le corps", async () => {
    const agent = await compteBatiInvest();
    const { projectId, supplierId } = await chantierTest(agent);
    const created = (await agent.post(`/v1/projects/${projectId}/price-requests`).send({ supplierIds: [supplierId] }).expect(201)).body;
    const email = created.recipients[0].email;
    expect(email.subject).toBe("Demande de devis · Bati invest · chantier Test (Brest)");
    expect(email.body).toBe(
      [
        "Bonjour,",
        "Je vous envoie la liste des fournitures pour un chantier de couverture zinc à joint debout à Brest : 91 m² en monopente, rampant 7 m, largeur 13 m, zinc prépatiné gris quartz 0,65 mm, pose sur voligeage.",
        "Pouvez-vous me chiffrer l'ensemble ? PS : si besoin, le détail du devis est en pièce jointe.",
        "Merci d'avance, bonne journée,",
        "Greg Bati invest · 06 12 34 56 78 · greg@batiinvest.fr",
      ].join("\n\n"),
    );
    expect(email.body).not.toMatch(/command|référentiel|BatiClair/i);
    expect(forbiddenWord(`${email.subject}\n${email.body}`)).toBeNull();
    expect(priceLeak(email.body)).toBeNull();
    // Le mail qui part est celui-là, avec le PDF joint.
    await agent.post(`/v1/price-request-recipients/${created.recipients[0].id}/send`).expect(200);
    const mail = ctx.emails.lastTo("devis@pointp-brest.fr")!;
    expect([mail.subject, mail.text]).toEqual([email.subject, email.body]);
    expect(mail.attachments![0]).toMatchObject({ filename: "demande-de-devis-test.pdf", contentType: "application/pdf" });
  });

  it("2. le PDF contient les quatre blocs dans l'ordre, le logo et les coordonnées du compte, et aucun prix", async () => {
    const agent = await compteBatiInvest();
    const { projectId, supplierId } = await chantierTest(agent);
    const created = (await agent.post(`/v1/projects/${projectId}/price-requests`).send({ supplierIds: [supplierId] }).expect(201)).body;
    const pdf = (await agent.get(`/v1/price-requests/${created.id}/demande-de-devis.pdf?destinataire=${created.recipients[0].id}`).buffer(true)).body as Buffer;
    const text = await pdfText(pdf);
    if (process.env.SHOW_PDF) console.log(text);
    const order = ["Demande de devis", "Point.P Brest", "1. Le chantier en bref", "2. Fournitures à chiffrer", "3. Détail du devis (sans prix)"].map((t) => text.indexOf(t));
    for (const i of order) expect(i).toBeGreaterThanOrEqual(0);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    // Rien à préciser sur ce chantier : le bloc « À préciser avec vous » est absent, les suivants se renumérotent.
    expect(text).not.toMatch(/À préciser avec vous/);
    // Coordonnées du compte, en-tête et pied.
    for (const t of ["Bati invest", "4 rue de Siam, 29200 Brest", "SIRET 12345678900012", "06 12 34 56 78 · greg@batiinvest.fr", "chantier Test", "Brest", "Une question sur ce chantier ? 06 12 34 56 78 · greg@batiinvest.fr", "Page 1 / ", "Généré avec BatiClair"])
      expect(text).toContain(t);
    expect(text).toMatch(/Réf\. CH-[0-9A-F]{6}/);
    // Le logo est une image dans le PDF.
    expect(pdf.includes(Buffer.from("/Subtype /Image"))).toBe(true);
    // Aucun prix, et jamais « commande ».
    expect(priceLeak(text.replace("Détail du devis (sans prix)", ""))).toBeNull();
    expect(text).not.toMatch(/142|38,00|45,00|52,00/);
    expect(text).not.toMatch(/command/i);
    // Les lignes du chantier Test (§45.5).
    expect(text).toMatch(/Gouttière zinc demi-ronde dév\. 33\s+4 longueurs de 4 m \(13\s+ml à couvrir\)/);
    // RÈGLE NUMÉRO UN : ni pattes ni pointes, le devis n'en écrit pas. Bande de 13 ml façonnée sur place : des feuilles
    // 2 × 1 m estimées d'après le développé (§48.6), jamais un bobineau.
    expect(text).not.toMatch(/Pattes|Pointes|Bobineau/);
    expect(text).toMatch(/Feuilles Quartz-Zinc 2 × 1 m, 0,65 mm\s+\d+ pièces?\s+pour 13 ml de bande/);
  });

  it("3. un chantier sans ligne « à préciser » n'a pas de bloc 3 ; un chantier qui en a une le montre, avec « merci de proposer ce que vous avez »", async () => {
    const agent = await compteBatiInvest();
    const { projectId } = await chantierTest(agent);
    const sans = (await agent.post(`/v1/projects/${projectId}/price-requests/preview`).send({}).expect(200)).body;
    expect(sans.document.blocs.map((b: { titre: string }) => b.titre)).toEqual(["Le chantier en bref", "Fournitures à chiffrer", "Détail du devis (sans prix)"]);
    const q = (await agent.post("/v1/quantitatifs").send({ reference: "Lucarnes", adresse: "29200 Brest", lignes: [...CHANTIER_TEST, { libelle: "Jouées de lucarnes en zinc", quantite: "2", unite: "u" }] })).body;
    await agent.post(`/v1/quantitatifs/${q.id}/reponses`).send({ reponses: Object.entries(REPONSES).map(([question, valeur]) => ({ question, valeur })) });
    let current = (await agent.get(`/v1/quantitatifs/${q.id}`)).body;
    for (let i = 0; i < 10 && current.questions.length > 0; i++) {
      const question = current.questions[0];
      current = (await agent.post(`/v1/quantitatifs/${q.id}/reponses`).send({ reponses: [{ question: question.id, valeur: question.boutons[0]?.valeur ?? "ok" }] })).body;
    }
    await agent.post(`/v1/quantitatifs/${q.id}/validation`).expect(200);
    const avec = (await agent.post(`/v1/projects/${q.projetId}/price-requests/preview`).send({}).expect(200)).body;
    const bloc = avec.document.blocs.find((b: { titre: string }) => b.titre === "À préciser avec vous");
    expect(bloc.lignes).toEqual(["Jouées de lucarnes en zinc · 2 u : merci de proposer ce que vous avez"]);
    expect(JSON.stringify(avec.document)).not.toMatch(/Pas encore de règle|BatiClair ne sait|référentiel/);
  });

  it("4. case du 42 décochée : pas de bloc 4, pas de PS dans le mail", async () => {
    const agent = await compteBatiInvest();
    await agent.patch("/v1/price-requests/settings").send({ attachQuoteDetail: false }).expect(200);
    const { projectId, supplierId } = await chantierTest(agent);
    const created = (await agent.post(`/v1/projects/${projectId}/price-requests`).send({ supplierIds: [supplierId] }).expect(201)).body;
    expect(created.recipients[0].email.body).not.toMatch(/PS/);
    expect(created.recipients[0].email.body).toContain("Pouvez-vous me chiffrer l'ensemble ?\n\nMerci d'avance");
    const text = await pdfText((await agent.get(`/v1/price-requests/${created.id}/demande-de-devis.pdf`).buffer(true)).body as Buffer);
    expect(text).not.toMatch(/Détail du devis/);
  });

  it("5. gouttière 13 ml : « 4 longueurs de 4 m (13 ml à couvrir) », jamais « soit 13 ml »", async () => {
    const agent = await compteBatiInvest();
    const { projectId, supplierId } = await chantierTest(agent);
    const created = (await agent.post(`/v1/projects/${projectId}/price-requests`).send({ supplierIds: [supplierId] }).expect(201)).body;
    const gouttiere = created.packet.fournitures.find((f: { designation: string }) => f.designation.startsWith("Gouttière"));
    expect(gouttiere.quantite).toBe("4 longueurs de 4 m (13 ml à couvrir)");
    expect(JSON.stringify(created.packet)).not.toMatch(/soit 13 ml/);
  });

  it("6. une hypothèse non confirmée (descentes absentes du devis) n'est pas dans « Le chantier en bref » ; répondue, elle y est", async () => {
    const agent = await compteBatiInvest();
    const { projectId } = await chantierTest(agent);
    const preview = (await agent.post(`/v1/projects/${projectId}/price-requests/preview`).send({}).expect(200)).body;
    // Greg a répondu « 2 descentes » : c'est un fait. (Sans réponse, la liste ne se valide pas ; le domaine le teste aussi.)
    expect(preview.document.blocs[0].lignes).toContain("2 descentes");
    // La pente n'est ni dans le devis ni répondue : jamais dans le bloc 1, ni dans le mail.
    expect(preview.document.blocs[0].lignes.join(" ")).not.toMatch(/\bpente \d/);
    expect(preview.mail).not.toMatch(/\bpente \d|45°/);
    expect(preview.document.blocs[0].lignes).toEqual([
      "Couverture zinc à joint debout",
      "91 m² en monopente",
      "rampant 7 m",
      "largeur 13 m",
      "zinc prépatiné gris quartz 0,65 mm",
      "pose sur voligeage",
      "2 descentes",
      "Brest, bord de mer",
    ]);
  });
});

/** Le chantier Test avant validation (réponses données), avec son quantitatif côté écran. */
async function chantierOuvert(agent: Agent, reference = "Test") {
  const q = (await agent.post("/v1/quantitatifs").send({ reference, adresse: "18 rue de Siam, 29200 Brest", lignes: CHANTIER_TEST })).body;
  await agent.post(`/v1/quantitatifs/${q.id}/reponses`).send({ reponses: Object.entries(REPONSES).map(([question, valeur]) => ({ question, valeur })) });
  const takeoff = (await agent.get(`/v1/projects/${q.projetId}/takeoff`)).body.takeoff;
  return { quantitatifId: q.id as string, projectId: q.projetId as string, takeoff };
}

describe("§45.6 — journal des corrections", () => {
  it("7. une correction d'un tap crée une entrée de journal avec les sept champs", async () => {
    const agent = await compteBatiInvest();
    const { takeoff, projectId } = await chantierOuvert(agent);
    const gouttiere = takeoff.purchase.toBuy.find((b: { label: string }) => b.label.startsWith("Gouttière zinc demi-ronde"));
    expect(gouttiere.quantity).toBe("4 longueurs de 4 m");
    const after = (await agent.post(`/v1/takeoffs/${takeoff.id}/answers`).send({ key: `quantite:${gouttiere.key}`, value: { value: "5", unit: "longueurs de 4 m" } }).expect(200)).body;
    expect(after.purchase.toBuy.find((b: { key: string }) => b.key === gouttiere.key).quantity).toBe("5 longueurs de 4 m");
    const events = await ctx.prisma.correctionEvent.findMany({ where: { projectId, action: "correct" } });
    expect(events).toHaveLength(1);
    expect(events[0]!.context).toMatchObject({
      metier: "couverture",
      departement: "29",
      materiau: gouttiere.label,
      quantite_calculee: "4 longueurs de 4 m",
      quantite_corrigee: "5 longueurs de 4 m",
      regle: "profil",
      version_referentiel: expect.stringMatching(/^roofing-/),
    });
    // Une deuxième correction garde la quantité CALCULÉE par le moteur, pas la précédente correction.
    await agent.post(`/v1/takeoffs/${takeoff.id}/answers`).send({ key: `quantite:${gouttiere.key}`, value: { value: "6", unit: "longueurs de 4 m" } }).expect(200);
    const second = await ctx.prisma.correctionEvent.findMany({ where: { projectId, action: "correct" }, orderBy: { createdAt: "asc" } });
    expect(second[1]!.context).toMatchObject({ quantite_calculee: "4 longueurs de 4 m", quantite_corrigee: "6 longueurs de 4 m" });
  });

  it("une ligne tombée en « à préciser avec vous » est journalisée avec sa raison ; l'export mensuel par règle est réservé au fondateur", async () => {
    const agent = await compteBatiInvest();
    const q = (await agent.post("/v1/quantitatifs").send({ reference: "Lucarnes", adresse: "29200 Brest", lignes: [...CHANTIER_TEST, { libelle: "Jouées de lucarnes en zinc", quantite: "2", unite: "u" }] })).body;
    await agent.post(`/v1/quantitatifs/${q.id}/reponses`).send({ reponses: Object.entries(REPONSES).map(([question, valeur]) => ({ question, valeur })) });
    let current = (await agent.get(`/v1/quantitatifs/${q.id}`)).body;
    for (let i = 0; i < 10 && current.questions.length > 0; i++) {
      const question = current.questions[0];
      current = (await agent.post(`/v1/quantitatifs/${q.id}/reponses`).send({ reponses: [{ question: question.id, valeur: question.boutons[0]?.valeur ?? "ok" }] })).body;
    }
    await agent.post(`/v1/quantitatifs/${q.id}/validation`).expect(200);
    const events = await ctx.prisma.correctionEvent.findMany({ where: { projectId: q.projetId, action: "to_quote" } });
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0]!.reason).toBeTruthy();
    expect(Object.keys(events[0]!.context as object)).toEqual(expect.arrayContaining(["metier", "departement", "materiau", "quantite_calculee", "quantite_corrigee", "regle", "version_referentiel"]));
    // L'export : refusé à un artisan qui n'est pas validateur du référentiel.
    expect((await agent.get("/v1/corrections/export.csv?mois=2026-10")).status).toBe(403);
  });
});

describe("§45.8 remplacé par la RÈGLE NUMÉRO UN (fondateur, 2026-10-06) : rien d'absent du devis, pas même en suggestion", () => {
  it("8. sur le chantier Test, aucune suggestion (ni silicone, ni vis, ni faîtage) et rien d'absent du devis dans la liste", async () => {
    const agent = await compteBatiInvest();
    const { takeoff } = await chantierOuvert(agent);
    expect(takeoff.purchase.suggestions).toEqual([]);
    expect(takeoff.aiSuggestions).toEqual([]);
    expect((takeoff.purchase.toBuy as { label: string }[]).map((b) => b.label).filter((l) => /silicone|vis inox|faîtage|pattes|pointes/i.test(l))).toEqual([]);
  });

  it("9. une ligne ajoutée à la main sur deux chantiers ne devient jamais une suggestion d'office", async () => {
    const agent = await compteBatiInvest();
    for (const n of [1, 2]) {
      const { takeoff } = await chantierOuvert(agent, `Bâche ${n}`);
      await agent.post(`/v1/takeoffs/${takeoff.id}/lines`).send({ designation: "Bâche de protection 4 × 5 m", quantity: "1", unit: "u" }).expect(201);
    }
    const { takeoff } = await chantierOuvert(agent, "Troisième");
    expect(takeoff.purchase.suggestions).toEqual([]);
  });
});

describe("§45.9 — l'aperçu avant envoi", () => {
  it("10. l'aperçu est identique, ligne pour ligne, au PDF reçu par le fournisseur", async () => {
    const agent = await compteBatiInvest();
    const { projectId, supplierId } = await chantierTest(agent);
    const preview = (await agent.post(`/v1/projects/${projectId}/price-requests/preview`).send({ destinataire: "Point.P Brest" }).expect(200)).body;
    const created = (await agent.post(`/v1/projects/${projectId}/price-requests`).send({ supplierIds: [supplierId] }).expect(201)).body;
    await agent.post(`/v1/price-request-recipients/${created.recipients[0].id}/send`).expect(200);
    const mail = ctx.emails.lastTo("devis@pointp-brest.fr")!;
    // Le même mail, le même document.
    expect([mail.subject, mail.text]).toEqual([preview.subject, preview.mail]);
    expect(created.document.blocs).toEqual(preview.document.blocs);
    // Chaque ligne de l'aperçu est dans le PDF joint, dans le même ordre (le PDF coupe les longues lignes : espaces réunis).
    const pdf = (await pdfText(Buffer.from(mail.attachments![0]!.contentBase64, "base64"))).replace(/\s+/g, " ");
    let at = 0;
    for (const b of preview.document.blocs as { titre: string; numero: number; kind: string; lignes: (string | { designation: string; quantite: string; precision: string | null })[] }[]) {
      const texts = [`${b.numero}. ${b.titre}`, ...b.lignes.flatMap((l) => (typeof l === "string" ? [l] : [l.designation, l.quantite, ...(l.precision ? [l.precision] : [])]))];
      for (const t of texts) {
        const i = pdf.indexOf(t.replace(/\s+/g, " "), at);
        expect(i, t).toBeGreaterThanOrEqual(0);
        at = i;
      }
    }
    for (const t of [...preview.document.entete.coordonnees, preview.document.entete.chantier, "Point.P Brest"]) expect(pdf).toContain(t);
  });

  it("11. une ligne modifiée dans l'aperçu est modifiée dans la liste, une entrée de journal est créée, et la liste reste validée", async () => {
    const agent = await compteBatiInvest();
    const { projectId } = await chantierTest(agent);
    const takeoff = (await agent.get(`/v1/projects/${projectId}/takeoff`)).body.takeoff;
    expect(takeoff.status).toBe("validated");
    const gouttiere = takeoff.purchase.toBuy.find((b: { label: string }) => b.label.startsWith("Gouttière"));
    // L'aperçu passe par le même chemin que la correction d'un tap : quantité, désignation, précision, croix.
    await agent.post(`/v1/takeoffs/${takeoff.id}/answers`).send({ key: `quantite:${gouttiere.key}`, value: { value: "5", unit: "longueurs de 4 m" } }).expect(200);
    await agent.post(`/v1/takeoffs/${takeoff.id}/answers`).send({ key: `precision:${gouttiere.key}`, value: "demi-ronde 33, naissances à souder" }).expect(200);
    const voliges = takeoff.purchase.toBuy.find((b: { label: string }) => b.label.startsWith("Voliges"));
    await agent.post(`/v1/takeoffs/${takeoff.id}/answers`).send({ key: `retire:${voliges.key}`, value: "oui" }).expect(200);
    const added = (await agent.post(`/v1/takeoffs/${takeoff.id}/lines`).send({ designation: "Chevilles à frapper 6 × 40 mm", quantity: "2", unit: "u", depuisApercu: true }).expect(201)).body;
    expect(added.status).toBe("validated");
    // La liste elle-même a changé…
    const list = (await agent.get(`/v1/projects/${projectId}/takeoff`)).body.takeoff;
    expect(list.status).toBe("validated");
    expect(list.purchase.toBuy.find((b: { key: string }) => b.key === gouttiere.key)).toMatchObject({ quantity: "5 longueurs de 4 m", precision: "demi-ronde 33, naissances à souder" });
    expect(list.purchase.toBuy.map((b: { key: string }) => b.key)).not.toContain(voliges.key);
    // … et l'aperçu la montre telle quelle.
    const preview = (await agent.post(`/v1/projects/${projectId}/price-requests/preview`).send({}).expect(200)).body;
    const rows = preview.document.blocs.find((b: { titre: string }) => b.titre === "Fournitures à chiffrer").lignes;
    expect(rows).toContainEqual({ designation: "Gouttière zinc demi-ronde dév. 33", quantite: "5 longueurs de 4 m", precision: "demi-ronde 33, naissances à souder", cle: gouttiere.key });
    expect(rows.map((r: { designation: string }) => r.designation)).not.toContain(voliges.label);
    expect(rows.map((r: { designation: string }) => r.designation)).toContain("Chevilles à frapper 6 × 40 mm");
    // Le journal : une entrée par correction, avec les sept champs.
    const events = await ctx.prisma.correctionEvent.findMany({ where: { projectId, action: "correct" }, orderBy: { createdAt: "asc" } });
    expect(events.map((e) => (e.context as Record<string, unknown>).quantite_corrigee)).toEqual(["5 longueurs de 4 m", "5 longueurs de 4 m", "0"]);
    expect(events[0]!.context).toMatchObject({ materiau: "Gouttière zinc demi-ronde dév. 33", quantite_calculee: "4 longueurs de 4 m", regle: "profil" });
  });
});

describe("compte de l'entreprise (§45.2, §45.3)", () => {
  it("coordonnées et logo : un SIRET a 14 chiffres, le logo est un PNG ou un JPEG, rien n'est obligatoire", async () => {
    const agent = await signUp(ctx.app, "c@example.fr", "Claire");
    await agent.post("/v1/companies").send({ name: "Zinc & Co", trades: ["roofing"] }).expect(201);
    expect((await agent.get("/v1/company/profile")).body).toEqual({ name: "Zinc & Co", address: null, siret: null, phone: null, email: null, hasLogo: false });
    expect((await agent.patch("/v1/company/profile").send({ siret: "123" })).status).toBe(400);
    expect((await agent.patch("/v1/company/profile").send({ email: "pas-un-mail" })).status).toBe(400);
    expect((await agent.patch("/v1/company/profile").send({ phone: "02 98 00 00 00" })).body).toMatchObject({ phone: "02 98 00 00 00", siret: null });
    expect((await agent.put("/v1/company/logo").attach("file", Buffer.from("%PDF-1.4"), { filename: "logo.png", contentType: "image/png" })).status).toBe(400);
    expect((await agent.put("/v1/company/logo").attach("file", LOGO, { filename: "logo.png", contentType: "image/png" })).body.hasLogo).toBe(true);
    const logo = await agent.get("/v1/company/logo").buffer(true);
    expect(logo.headers["content-type"]).toBe("image/png");
    expect((await agent.delete("/v1/company/logo")).body.hasLogo).toBe(false);
  });
});
