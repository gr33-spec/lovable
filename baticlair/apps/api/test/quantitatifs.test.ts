import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { ExtractionAttempt, ExtractionRequest, TakeoffExtractor } from "../src/modules/takeoff/application/takeoff-extractor.js";
import { TAKEOFF_EXTRACTOR } from "../src/modules/takeoff/application/takeoff-extractor.js";
import { FakeTakeoffExtractor } from "../src/modules/takeoff/infrastructure/fake-takeoff-extractor.js";
import { loadConfig, type AppConfig } from "../src/platform/config/config.js";
import { CONFIG } from "../src/platform/tokens.js";
import { makePdf } from "./support/pdf-fixtures.js";
import { createTestApp, resetDatabase, signUpWithCompany, type Agent, type TestContext } from "./support/test-app.js";

/**
 * LA PORTE D'ENTRÉE /v1/quantitatifs (§38) : l'app et les partenaires (Rappidos d'abord) y
 * déposent un devis, en PDF ou en lignes { libelle, quantite, unite, prix }, et reçoivent le
 * même quantitatif : état, questions à boutons, lignes à commander expliquées (§39).
 */
class GatedExtractor implements TakeoffExtractor {
  readonly provider = "fake";
  private inner = new FakeTakeoffExtractor();
  private release: () => void = () => {};
  private gate: Promise<void> = Promise.resolve();
  close() {
    this.gate = new Promise<void>((r) => (this.release = r));
  }
  open() {
    this.release();
    this.gate = Promise.resolve();
  }
  async extract(request: ExtractionRequest): Promise<ExtractionAttempt> {
    await this.gate;
    return this.inner.extract(request);
  }
}

const extractor = new GatedExtractor();
let ctx: TestContext;
beforeAll(async () => {
  const config: AppConfig = { ...loadConfig(), ai: { ...loadConfig().ai, answerWithinMs: 1500 } };
  ctx = await createTestApp((b) => b.overrideProvider(CONFIG).useValue(config).overrideProvider(TAKEOFF_EXTRACTOR).useValue(extractor));
});
afterAll(async () => {
  await ctx.app.close();
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
  extractor.open();
});

/** Ce qu'enverrait Rappidos : le devis déjà découpé en lignes. */
const RAPPIDOS = {
  reference: "Dupont — réfection toiture",
  adresse: "12 rue de Siam, 29200 Brest",
  lignes: [
    { libelle: "Couverture en ardoises naturelles 30x22 posées au crochet", quantite: "200", unite: "m²", prix: "85,00" },
    { libelle: "Gouttière zinc demi-ronde 25", quantite: 24, unite: "ml", prix: "42" },
  ],
};

type Ligne = { id: string; libelle: string; quantite: number | null; unite: string | null; prix?: string; estimation?: string; explication: { phrase: string; morceaux: { cle?: string; valeur?: string; confiance: string }[] } };
const ligne = (body: { lignes: Ligne[] }, libelle: string) => body.lignes.find((l) => l.libelle === libelle)!;

async function pdfQuote(agent: Agent, extra: Record<string, string> = {}) {
  let req = agent.post("/v1/quantitatifs");
  for (const [k, v] of Object.entries(extra)) req = req.field(k, v);
  return req.attach("file", Buffer.from(await makePdf(["devis"])), { filename: "devis.pdf", contentType: "application/pdf" });
}

describe("POST /v1/quantitatifs en lignes (Rappidos)", () => {
  it("rend le quantitatif tout de suite : ardoises calculées, version du référentiel, prix du devis gardé", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const res = await agent.post("/v1/quantitatifs").send(RAPPIDOS);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ source: "lignes", metier: "couverture", reference: "Dupont — réfection toiture" });
    expect(res.body.version_referentiel).toMatch(/^roofing-/);
    expect(res.body.compris).toEqual(["Couverture en ardoises au crochet sur liteaux : 200 m²", "Gouttière : 24 ml"]);

    // 200 m² en 30×22, 45° par défaut, région ardoise III, Brest = département littoral → crochet inox 2,7 mm :
    // formule Cupa (§34) 200 / (0,1025 × 0,2227) = 8 761,65 + 5 % = 9 200 ardoises.
    const ardoises = ligne(res.body, "Ardoises 30×22");
    expect(ardoises).toMatchObject({ quantite: 9200, unite: "pièces", origine: "calcul" });
    // Jamais moins de crochets que d'ardoises : 9 200 commandées × 1,02 = 9 384.
    const crochets = ligne(res.body, "Crochets d'ardoise");
    expect(crochets.quantite).toBe(9384);
    expect(crochets.quantite!).toBeGreaterThanOrEqual(ardoises.quantite!);
    expect(crochets.explication.phrase).toMatch(/^9 384 pièces = ardoises après marge 9 200 · marge recommandée 2 %$/);
    // Le prix de la ligne de devis (85 €/m² de couverture) n'est pas celui d'une ardoise.
    expect(ardoises.prix).toBeUndefined();
    expect(res.body.devis).toEqual([
      expect.objectContaining({ libelle: RAPPIDOS.lignes[0]!.libelle, quantite: "200", unite: "m²", prix: "85,00" }),
      expect.objectContaining({ libelle: "Gouttière zinc demi-ronde 25", quantite: "24", unite: "ml", prix: "42" }),
    ]);

    // §39 : une phrase, chaque hypothèse modifiable porte sa clé.
    expect(ardoises.explication.phrase).toBe(
      "9 200 pièces = surface de toiture 200 m² · pente du toit 45° · région ardoise III (estimation) · longueur du rampant 5,5 m · recouvrement 95 mm · pureau 10,25 cm · diamètre du crochet 2,7 mm · ardoises au m² (formule Cupa Pizarras, hors table) 43,81 /m² · marge recommandée 5 %",
    );
    expect(ardoises.explication.phrase).not.toMatch(/zone climatique/);
    expect(ardoises.explication.morceaux).toContainEqual({ texte: "région ardoise III (estimation)", cle: "param:zone", valeur: "3", confiance: "estimation" });
    expect(ardoises.explication.morceaux).toContainEqual(expect.objectContaining({ texte: "diamètre du crochet 2,7 mm", cle: "param:diametre_crochet", valeur: "2,7" }));
    expect(ardoises.explication.morceaux).toContainEqual({ texte: "pente du toit 45°", cle: "param:pente", valeur: "45", unite: "°", confiance: "hypothese" });
    expect(ardoises.explication.morceaux).toContainEqual(expect.objectContaining({ texte: "surface de toiture 200 m²", confiance: "devis" }));
    expect(res.body.hypotheses).toContainEqual(expect.objectContaining({ cle: "param:pente", valeur: "45" }));

    // Aucune IA appelée, aucune analyse décomptée ; un chantier créé avec la référence.
    expect(await ctx.prisma.aiExecution.count()).toBe(0);
    const projects = (await agent.get("/v1/projects")).body.items;
    expect(projects).toEqual([expect.objectContaining({ id: res.body.projetId, name: "Dupont — réfection toiture" })]);
    expect((await agent.get(`/v1/quantitatifs/${res.body.id}`)).body).toEqual(res.body);
  });

  it("ne demande jamais une quantité : une question à boutons, avec « je ne sais pas »", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const res = await agent.post("/v1/quantitatifs").send(RAPPIDOS);
    expect(res.body.etat).toBe("questions");
    expect(res.body.questions.length).toBeGreaterThan(0);
    expect(res.body.questions.length).toBeLessThanOrEqual(4);
    for (const q of res.body.questions) expect(q.texte).not.toMatch(/quelle quantité/i);
    const descentes = res.body.questions.find((q: { id: string }) => q.id === "engine:param:nb_descentes");
    expect(descentes).toMatchObject({ texte: "Combien de descentes pour cette gouttière ?", je_ne_sais_pas: true, saisie_libre: false });
    expect(descentes.boutons.map((b: { valeur: string }) => b.valeur)).toEqual(["1", "2", "3", "4"]);

    const answered = await agent.post(`/v1/quantitatifs/${res.body.id}/reponses`).send({ reponses: [{ question: "engine:param:nb_descentes", valeur: "2" }] });
    expect(answered.status).toBe(201);
    expect(answered.body.questions.find((q: { id: string }) => q.id === "engine:param:nb_descentes")).toBeUndefined();
    // Une question inconnue est refusée, rien n'est changé.
    const wrong = await agent.post(`/v1/quantitatifs/${res.body.id}/reponses`).send({ reponses: [{ question: "engine:param:nimporte", valeur: "2" }] });
    expect(wrong.status).toBe(400);
  });

  it("corrige la pente d'un tap : seules les lignes qui en dépendent changent", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const before = (await agent.post("/v1/quantitatifs").send(RAPPIDOS)).body;
    const res = await agent.post(`/v1/quantitatifs/${before.id}/corrections`).send({ action: "modifier", cle: "param:pente", valeur: "40" });
    expect(res.status).toBe(201);
    const ardoises = ligne(res.body, "Ardoises 30×22");
    expect(ardoises.quantite).not.toBe(9200);
    expect(ardoises.explication.morceaux).toContainEqual(expect.objectContaining({ cle: "param:pente", valeur: "40", confiance: "artisan" }));
    expect(ligne(res.body, "Ardoises 30×22").id).toBe(ligne(before, "Ardoises 30×22").id);
    // La gouttière ne dépend pas de la pente.
    const gouttiere = (b: { lignes: Ligne[] }) => b.lignes.find((l) => l.libelle.toLowerCase().includes("gouttière"));
    expect(gouttiere(res.body)?.quantite).toBe(gouttiere(before)?.quantite);
    // 30° en région III : recouvrement 120 mm, au-delà du maximum Cupa du 30×22 (100 mm). Le devis fait foi
    // sur le format : calcul par la formule, ligne marquée « estimation », le 40×22 proposé en conseil, pas en question.
    const steep = await agent.post(`/v1/quantitatifs/${before.id}/corrections`).send({ action: "modifier", cle: "param:pente", valeur: "30" });
    const estimated = ligne(steep.body, "Ardoises 30×22");
    expect(estimated.quantite).toBeGreaterThan(9200);
    expect(estimated.estimation).toBe("Recouvrement posé 120 mm hors table Cupa Pizarras (au-delà du maximum de 100 mm pour ce format). Format conseillé : Ardoises 40×22.");
    expect(estimated.explication.morceaux).toContainEqual({ texte: "estimation : recouvrement posé 120 mm hors table Cupa Pizarras (au-delà du maximum de 100 mm pour ce format). Format conseillé : Ardoises 40×22.", confiance: "estimation" });
    expect(steep.body.questions.some((q: { texte: string }) => /non admis|Quel format/.test(q.texte))).toBe(false);
    const conseil = steep.body.hypotheses.find((h: { cle: string }) => h.cle === "product:ardoise");
    expect(conseil.choix.slice(0, 2)).toEqual([
      { label: "Ardoises 30×22 (devis)", value: "ardoise-30x22" },
      { label: "Ardoises 40×22 (conseillé)", value: "ardoise-40x22" },
    ]);
    // Un tap sur le conseil : le format change, plus d'estimation.
    const switched = await agent.post(`/v1/quantitatifs/${before.id}/reponses`).send({ reponses: [{ question: "product:ardoise", valeur: "ardoise-40x22" }] });
    expect(ligne(switched.body, "Ardoises 40×22").estimation).toBeUndefined();
    await agent.post(`/v1/quantitatifs/${before.id}/reponses`).send({ reponses: [{ question: "product:ardoise", valeur: "ardoise-30x22" }] });
    // 40° en région III : recouvrement 100 mm, ligne de la table Cupa (44,8/m²), qui fait foi.
    const table = await agent.post(`/v1/quantitatifs/${before.id}/corrections`).send({ action: "modifier", cle: "param:pente", valeur: "40" });
    expect(ligne(table.body, "Ardoises 30×22").quantite).toBe(9408);
    expect(ligne(table.body, "Ardoises 30×22").explication.phrase).toMatch(/ardoises au m² \(table Cupa Pizarras\) 44,8 \/m²/);
    // Une valeur choisie reste modifiable : retour à 45°, retour aux 9 200 ardoises.
    const back = await agent.post(`/v1/quantitatifs/${before.id}/corrections`).send({ action: "modifier", cle: "param:pente", valeur: "45" });
    expect(ligne(back.body, "Ardoises 30×22").quantite).toBe(9200);
    // Les crochets suivent toujours les ardoises corrigées.
    for (const b of [res.body, table.body, back.body]) expect(ligne(b, "Crochets d'ardoise").quantite!).toBeGreaterThanOrEqual(ligne(b, "Ardoises 30×22").quantite!);
    // Une valeur qui n'existe pas n'est pas modifiable.
    expect((await agent.post(`/v1/quantitatifs/${before.id}/corrections`).send({ action: "modifier", cle: "param:inconnu", valeur: "3" })).status).toBe(400);
  });

  it("ajoute une ligne libre", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const before = (await agent.post("/v1/quantitatifs").send(RAPPIDOS)).body;
    const res = await agent
      .post(`/v1/quantitatifs/${before.id}/corrections`)
      .send({ action: "ajouter", ligne: { libelle: "Chatière ardoise", quantite: "4", unite: "u", prix: null } });
    expect(res.status).toBe(201);
    expect(res.body.devis).toHaveLength(3);
  });

  it("refuse une entrée vide, trop longue ou mal formée", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    expect((await agent.post("/v1/quantitatifs").send({})).status).toBe(400);
    expect((await agent.post("/v1/quantitatifs").send({ lignes: [] })).status).toBe(400);
    expect((await agent.post("/v1/quantitatifs").send({ lignes: [{ libelle: "", quantite: "2", unite: "u", prix: null }] })).status).toBe(400);
    expect((await agent.post("/v1/quantitatifs").send({ lignes: Array(501).fill(RAPPIDOS.lignes[0]) })).status).toBe(400);
    expect((await agent.post("/v1/quantitatifs").send({ ...RAPPIDOS, projetId: "pas-un-id" })).status).toBe(400);
    expect((await agent.get("/v1/projects")).body.items).toHaveLength(0);
  });

  it("hors littoral (Grenoble) : crochet courant 1 mm, 9 271 ardoises, toujours au moins autant de crochets", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const res = await agent.post("/v1/quantitatifs").send({ ...RAPPIDOS, adresse: "38000 Grenoble" });
    const ardoises = ligne(res.body, "Ardoises 30×22");
    expect(ardoises.quantite).toBe(9271);
    expect(ardoises.explication.phrase).toMatch(/diamètre du crochet 1 mm/);
    expect(ligne(res.body, "Crochets d'ardoise").quantite).toBe(9457);
  });

  it("range le quantitatif dans un chantier existant", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const project = (await agent.post("/v1/projects").send({ name: "Toiture Dupont" })).body;
    const res = await agent.post("/v1/quantitatifs").send({ ...RAPPIDOS, projetId: project.id });
    expect(res.body.projetId).toBe(project.id);
    expect((await agent.get("/v1/projects")).body.items).toHaveLength(1);
  });
});

describe("POST /v1/quantitatifs en PDF", () => {
  it("lit le devis et rend le même objet qu'en lignes", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const res = await pdfQuote(agent, { reference: "Chantier Le Gall", adresse: "29200 Brest" });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ source: "pdf", metier: "couverture", reference: "Chantier Le Gall" });
    expect(["questions", "pret"]).toContain(res.body.etat);
    expect(res.body.version_referentiel).toMatch(/^roofing-/);
    expect(res.body.devis).toContainEqual(expect.objectContaining({ libelle: "Gouttière zinc demi-ronde dév. 33", quantite: "36" }));
    expect(res.body.lignes.length).toBeGreaterThan(0);
    for (const l of res.body.lignes as Ligne[]) expect(l.explication.phrase).toMatch(/ = /);
    expect((await agent.get(`/v1/quantitatifs/${res.body.id}`)).body).toEqual(res.body);
  });

  it("lecture longue : 202 « en_cours », puis le quantitatif quand la lecture finit", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    extractor.close();
    const res = await pdfQuote(agent);
    expect(res.status).toBe(202);
    expect(res.body).toEqual({ id: expect.any(String), reference: null, projetId: expect.any(String), source: "pdf", etat: "en_cours" });
    const waiting = await agent.get(`/v1/quantitatifs/${res.body.id}`);
    expect(waiting.body.etat).toBe("en_cours");
    expect(waiting.headers["retry-after"]).toBe("3");
    // Pas de réponse possible tant que la lecture n'est pas finie.
    expect((await agent.post(`/v1/quantitatifs/${res.body.id}/reponses`).send({ reponses: [{ question: "x", valeur: "1" }] })).status).toBe(409);

    extractor.open();
    let body = waiting.body;
    for (let i = 0; i < 50 && body.etat === "en_cours"; i++) {
      await new Promise((r) => setTimeout(r, 100));
      body = (await agent.get(`/v1/quantitatifs/${res.body.id}`)).body;
    }
    expect(["questions", "pret"]).toContain(body.etat);
    expect(body.lignes.length).toBeGreaterThan(0);
  });

  it("PDF abîmé : erreur tout de suite, sans lecture IA", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const broken = Buffer.from("%PDF-1.4\n1 0 obj << /Type /Catalog >> garbage");
    const res = await agent.post("/v1/quantitatifs").attach("file", broken, { filename: "devis.pdf", contentType: "application/pdf" });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ etat: "erreur", erreur: { raison: "corrupted" } });
    expect(await ctx.prisma.aiExecution.count()).toBe(0);
  });

  it("pas un PDF : refusé, et aucun chantier vide ne reste", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const res = await agent.post("/v1/quantitatifs").attach("file", Buffer.from("<html>pas un pdf</html>"), { filename: "devis.pdf", contentType: "application/pdf" });
    expect(res.status).toBe(422);
    expect((await agent.get("/v1/projects")).body.items).toHaveLength(0);
  });

  it("refuse un PDF et des lignes en même temps", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const res = await agent
      .post("/v1/quantitatifs")
      .field("lignes[0][libelle]", "Ardoises")
      .attach("file", Buffer.from(await makePdf(["devis"])), { filename: "devis.pdf", contentType: "application/pdf" });
    expect(res.status).toBe(400);
  });
});

describe("accès", () => {
  it("un quantitatif est invisible pour une autre entreprise, et la porte exige une session", async () => {
    const a = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const b = await signUpWithCompany(ctx.app, "b@example.fr", "Toitures Le Gall");
    const created = (await a.agent.post("/v1/quantitatifs").send(RAPPIDOS)).body;
    expect((await b.agent.get(`/v1/quantitatifs/${created.id}`)).status).toBe(404);
    expect((await b.agent.post(`/v1/quantitatifs/${created.id}/corrections`).send({ action: "modifier", cle: "param:pente", valeur: "30" })).status).toBe(404);
    expect((await b.agent.post("/v1/quantitatifs").send({ ...RAPPIDOS, projetId: created.projetId })).status).toBe(404);
    expect((await b.agent.get("/v1/quantitatifs/pas-un-id")).status).toBe(404);
    const { default: request } = await import("supertest");
    expect((await request(ctx.app.getHttpServer()).post("/v1/quantitatifs").send(RAPPIDOS)).status).toBe(401);
  });
});

describe("le chat de l'appli passe par la porte", () => {
  async function chantierAvecDevis(agent: Agent) {
    const project = (await agent.post("/v1/projects").send({ name: "Toiture Dupont" })).body;
    const doc = await agent
      .post(`/v1/projects/${project.id}/documents`)
      .field("purpose", "client_quote")
      .attach("file", Buffer.from(await makePdf(["devis"])), { filename: "devis.pdf", contentType: "application/pdf" });
    return { projectId: project.id as string, documentId: doc.body.id as string };
  }

  it("devis déjà déposé (documentId) : la porte le lit une fois, puis le retrouve par chantier, avec le détail de l'écran", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const { projectId, documentId } = await chantierAvecDevis(agent);
    expect((await agent.get(`/v1/quantitatifs?projetId=${projectId}`)).body).toEqual({ items: [], ia_disponible: true });

    const res = await agent.post("/v1/quantitatifs?ecran=1").send({ documentId });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ projetId: projectId, source: "pdf", valide: false, ecran: { documentId, status: "draft" } });
    const lectures = await ctx.prisma.aiExecution.count();

    // Relancer sur le même devis ne relit rien et ne crée pas de second quantitatif.
    const again = await agent.post("/v1/quantitatifs").send({ documentId });
    expect(again.body.id).toBe(res.body.id);
    expect(again.body.ecran).toBeUndefined();
    expect(await ctx.prisma.aiExecution.count()).toBe(lectures);

    const list = await agent.get(`/v1/quantitatifs?projetId=${projectId}&ecran=1`);
    expect(list.body.items.map((q: { id: string }) => q.id)).toEqual([res.body.id]);
    expect(list.body.items[0].ecran.lines.length).toBeGreaterThan(0);
  });

  it("une liste préparée avant la porte reçoit son quantitatif à la première lecture", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const { projectId, documentId } = await chantierAvecDevis(agent);
    const old = (await agent.post(`/v1/documents/${documentId}/takeoff`)).body;
    const list = await agent.get(`/v1/quantitatifs?projetId=${projectId}&ecran=1`);
    expect(list.body.items).toHaveLength(1);
    expect(list.body.items[0].ecran.id).toBe(old.id);
    // Une seule fois : la lecture suivante retrouve le même.
    expect((await agent.get(`/v1/quantitatifs?projetId=${projectId}`)).body.items[0].id).toBe(list.body.items[0].id);
  });

  it("lignes du devis : modifier, confirmer, retirer, puis valider pour la demande de prix", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const { documentId } = await chantierAvecDevis(agent);
    const q = (await agent.post("/v1/quantitatifs?ecran=1").send({ documentId })).body;
    const crochets = q.devis.find((l: { libelle: string }) => /Crochet/.test(l.libelle));

    const edited = await agent
      .post(`/v1/quantitatifs/${q.id}/corrections?ecran=1`)
      .send({ action: "modifier_ligne", id: crochets.id, ligne: { libelle: "Crochet inox ardoise 100 mm", quantite: "200", unite: "u", reference: "CRO-INOX" } });
    expect(edited.status).toBe(201);
    expect(edited.body.devis.find((l: { id: string }) => l.id === crochets.id)).toMatchObject({ quantite: "200", unite: "u" });
    expect(edited.body.ecran.lines.find((l: { id: string }) => l.id === crochets.id)).toMatchObject({ reference: "CRO-INOX", edited: true });

    const doubtful = edited.body.ecran.lines.filter((l: { status: string }) => l.status === "to_verify");
    let current = edited.body;
    for (const l of doubtful) current = (await agent.post(`/v1/quantitatifs/${q.id}/corrections?ecran=1`).send({ action: "confirmer", id: l.id })).body;

    const removed = await agent.post(`/v1/quantitatifs/${q.id}/corrections`).send({ action: "retirer", id: crochets.id });
    expect(removed.body.devis.some((l: { id: string }) => l.id === crochets.id)).toBe(false);

    // Questions réglées (« ok » à chaque décision, ou la première valeur proposée), puis validation.
    current = removed.body;
    for (let i = 0; i < 10 && current.questions.length > 0; i++) {
      const question = current.questions[0];
      const valeur = question.boutons[0]?.valeur ?? "ok";
      current = (await agent.post(`/v1/quantitatifs/${q.id}/reponses`).send({ reponses: [{ question: question.id, valeur }] })).body;
    }
    const validated = await agent.post(`/v1/quantitatifs/${q.id}/validation?ecran=1`);
    expect(validated.status).toBe(200);
    expect(validated.body).toMatchObject({ valide: true, ecran: { status: "validated" } });
  });

  it("une réponse peut régler directement une valeur du calcul (« param:pente »), avec son unité", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const q = (await agent.post("/v1/quantitatifs").send(RAPPIDOS)).body;
    const res = await agent.post(`/v1/quantitatifs/${q.id}/reponses`).send({ reponses: [{ question: "param:pente", valeur: "40", unite: "°" }] });
    expect(res.status).toBe(201);
    expect(ligne(res.body, "Ardoises 30×22").quantite).toBe(9408);
    expect((await agent.post(`/v1/quantitatifs/${q.id}/reponses`).send({ reponses: [{ question: "param:pente", valeur: "beaucoup", unite: "°" }] })).status).toBe(400);
    expect((await agent.post(`/v1/quantitatifs/${q.id}/reponses`).send({ reponses: [{ question: "DROP TABLE", valeur: "1" }] })).status).toBe(400);
  });

  it("une ligne ou un devis d'une autre entreprise n'existe pas pour la porte", async () => {
    const a = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const b = await signUpWithCompany(ctx.app, "b@example.fr", "Toitures Le Gall");
    const qa = (await a.agent.post("/v1/quantitatifs").send(RAPPIDOS)).body;
    const qb = (await b.agent.post("/v1/quantitatifs").send(RAPPIDOS)).body;
    // La ligne de B, retirée depuis le quantitatif de A : refusée, rien n'est touché.
    expect((await a.agent.post(`/v1/quantitatifs/${qa.id}/corrections`).send({ action: "retirer", id: qb.devis[0].id })).status).toBe(404);
    expect((await b.agent.get(`/v1/quantitatifs/${qb.id}`)).body.devis).toHaveLength(2);
    const { documentId, projectId } = await chantierAvecDevis(b.agent);
    expect((await a.agent.post("/v1/quantitatifs").send({ documentId })).status).toBe(404);
    expect((await a.agent.get(`/v1/quantitatifs?projetId=${projectId}`)).status).toBe(404);
    expect((await a.agent.post("/v1/quantitatifs").send({ documentId, lignes: RAPPIDOS.lignes })).status).toBe(400);
  });
});
