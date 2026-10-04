import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { TAKEOFF_EXTRACTOR } from "../src/modules/takeoff/application/takeoff-extractor.js";
import { FakeTakeoffExtractor } from "../src/modules/takeoff/infrastructure/fake-takeoff-extractor.js";
import { makePdf, type FixtureRow } from "./support/pdf-fixtures.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * INFOS CHANTIER FACULTATIVES (docs/infos-chantier-facultatives.md) : le devis suffit ; une note tapée par l'artisan
 * (au dépôt, dans le chat) ou le commentaire d'un croquis apportent des mesures nommées qui passent devant le devis.
 * Deux documents qui se contredisent font une question avec les deux valeurs. Aucun appel IA de plus.
 */
let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestApp((b) => b.overrideProvider(TAKEOFF_EXTRACTOR).useValue(new FakeTakeoffExtractor()));
});
afterAll(async () => {
  await ctx.app.close();
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
});

const BREST = { adresse: "12 rue de Siam, 29200 Brest", lignes: [{ libelle: "Couverture en ardoises naturelles d'Espagne 1er choix 30x22 posées au crochet", quantite: "200", unite: "m²" }] };
type Ligne = { libelle: string; quantite: number | null; explication: { morceaux: { texte: string; cle?: string; valeur?: string; confiance: string }[] } };
type Q = { id: string; projetId: string; questions: { id: string; texte: string; boutons: { label: string; valeur: string }[] }[]; lignes: Ligne[]; hypotheses: { cle: string }[]; infos: { texte: string | null; croquis: { id: string; nom: string }[] } };
const ardoises = (q: Q) => q.lignes.find((l) => l.libelle === "Ardoises naturelles Espagne 1er choix 30×22")!;
// PNG minimal (1 × 1 pixel) : reconnu à ses octets, jamais à son nom.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");

describe("la note de l'artisan entre dans le calcul", () => {
  it("« Pente 35°, rampant 6 m » envoyé avec le devis : plus d'hypothèse de pente ni de rampant, origine artisan, 200 m² à Brest = 10 478 ardoises", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const res = await agent.post("/v1/quantitatifs").send({ ...BREST, infos: "Rénovation complète. Pente 35°. Rampant 6 m. Les Velux sont conservés." });
    expect(res.status).toBe(201);
    const q = res.body as Q;
    expect(q.infos.texte).toBe("Rénovation complète. Pente 35°. Rampant 6 m. Les Velux sont conservés.");
    // Sans note : 45° et rampant 5,5 m par défaut, 9 200 ardoises (test de la porte). À 35° et 6 m de rampant, le
    // recouvrement Cupa (§34) monte à 110 mm : 10 478 ardoises.
    expect(ardoises(q).quantite).toBe(10478);
    expect(ardoises(q).explication.morceaux).toContainEqual({ texte: "pente du toit 35°", cle: "param:pente", valeur: "35", unite: "°", confiance: "artisan" });
    expect(ardoises(q).explication.morceaux).toContainEqual(expect.objectContaining({ cle: "param:longueur_rampant", valeur: "6", confiance: "artisan" }));
    expect(q.hypotheses.map((h) => h.cle)).not.toContain("param:pente");
    expect(q.hypotheses.map((h) => h.cle)).not.toContain("param:longueur_rampant");
    expect(q.questions).toEqual([]);
  });

  it("la note se change après coup (chat) : le quantitatif se recalcule au prochain chargement ; vide → l'hypothèse revient", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const q = (await agent.post("/v1/quantitatifs").send(BREST)).body as Q;
    expect(ardoises(q).quantite).toBe(9200);
    expect((await agent.put(`/v1/projects/${q.projetId}/infos`).send({ texte: "Pente 35°" })).status).toBe(204);
    const after = (await agent.get(`/v1/quantitatifs/${q.id}`)).body as Q;
    expect(ardoises(after).quantite).toBe(9927);
    expect(after.infos.texte).toBe("Pente 35°");
    expect((await agent.put(`/v1/projects/${q.projetId}/infos`).send({ texte: null })).status).toBe(204);
    const back = (await agent.get(`/v1/quantitatifs/${q.id}`)).body as Q;
    expect(ardoises(back).quantite).toBe(9200);
    expect(back.hypotheses.map((h) => h.cle)).toContain("param:pente");
    // Une quantité d'article dans la note n'est jamais lue comme une donnée.
    await agent.put(`/v1/projects/${q.projetId}/infos`).send({ texte: "Prévoir 9 000 ardoises" });
    expect(ardoises((await agent.get(`/v1/quantitatifs/${q.id}`)).body as Q).quantite).toBe(9200);
  });

  it("un croquis avec commentaire : la photo est gardée (jamais lue par l'IA), le commentaire rejoint la note et compte", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const q = (await agent.post("/v1/quantitatifs").send(BREST)).body as Q;
    const res = await agent
      .post(`/v1/projects/${q.projetId}/infos/croquis`)
      .field("commentaire", "Les deux traits rouges sont les rampants : 6,50 m chacun. Noue : 8 m.")
      .attach("file", PNG, { filename: "croquis.png", contentType: "image/png" });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: expect.any(String), nom: "croquis.png" });
    const after = (await agent.get(`/v1/quantitatifs/${q.id}`)).body as Q;
    expect(after.infos).toEqual({ texte: "Croquis (croquis.png) : Les deux traits rouges sont les rampants : 6,50 m chacun. Noue : 8 m.", croquis: [{ id: res.body.id, nom: "croquis.png" }] });
    expect(ardoises(after).explication.morceaux).toContainEqual(expect.objectContaining({ cle: "param:longueur_rampant", valeur: "6,50", confiance: "artisan" }));
    // Le fichier se relit tel quel, avec son vrai type ; aucune analyse IA n'a été lancée pour lui.
    const file = await agent.get(`/v1/documents/${res.body.id}/file`);
    expect(file.headers["content-type"]).toMatch(/^image\/png/);
    expect(await ctx.prisma.aiAnalysis.count({ where: { documentId: res.body.id } })).toBe(0);
    // Un texte qui n'est ni image ni PDF est refusé.
    expect((await agent.post(`/v1/projects/${q.projetId}/infos/croquis`).attach("file", Buffer.from("bonjour"), { filename: "x.txt", contentType: "text/plain" })).status).toBe(422);
  });
});

describe("deux documents qui se contredisent : une question avec les deux valeurs", () => {
  it("la ligne dit « pente 40° », l'en-tête lu par l'IA dit « Pente 35° » : question à deux boutons, ardoises en attente ; la note de l'artisan tranche", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const rows: FixtureRow[] = [["ARD", "Ardoises Espagne 30x22, pente 40°", "200 m²", "85,00", "17 000,00"]];
    const pdf = await makePdf(["devis"], rows, "Total HT 17 000,00", "DEVIS N° 2026-120 – Toitures Martin  ·  Pente 35°");
    const res = await agent.post("/v1/quantitatifs").field("adresse", "29200 Brest").attach("file", Buffer.from(pdf), { filename: "devis.pdf", contentType: "application/pdf" });
    expect(res.status).toBe(201);
    const q = res.body as Q;
    const question = q.questions.find((x) => x.id === "engine:param:pente")!;
    expect(question.boutons.map((b) => b.valeur)).toEqual(["40", "35"]);
    expect(question.texte).toMatch(/^Pente du toit : 40 ° \(Devis, .*\), ou 35 ° \(Devis, en-tête .*\) \?$/);
    expect(q.lignes.find((l) => l.libelle === "Ardoises naturelles Espagne 1er choix 30×22")).toBeUndefined();
    // L'artisan écrit la pente : sa note passe devant les deux, l'explication cite ce que disait le devis.
    await agent.put(`/v1/projects/${q.projetId}/infos`).send({ texte: "Pente 42°" });
    const after = (await agent.get(`/v1/quantitatifs/${q.id}`)).body as Q;
    expect(after.questions.find((x) => x.id === "engine:param:pente")).toBeUndefined();
    expect(ardoises(after).explication.morceaux).toContainEqual(expect.objectContaining({ cle: "param:pente", valeur: "42", confiance: "artisan" }));
  });
});
