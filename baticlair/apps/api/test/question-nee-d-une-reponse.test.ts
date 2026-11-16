import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { LectureDevis } from "@baticlair/domain";
import { makePdf, type FixtureRow } from "./support/pdf-fixtures.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * Recette en ligne du 16 novembre 2026 (zinc à joint debout, vraie lecture, petit iPhone) : Greg répond à la question du
 * modèle, touche « Calculer ma liste », et le serveur refuse (« faconnage_required ») : sa réponse venait de faire naître
 * la question de façonnage du calcul, que l'écran n'avait jamais posée. L'écran renvoyait alors ses anciennes réponses,
 * en boucle. RÈGLE : une question obligatoire NÉE des réponses tout juste données n'est pas un refus ; l'écran des
 * questions revient avec elle, avant le calcul (§49.4). Une question obligatoire déjà posée et sautée reste refusée.
 */
const ROWS: FixtureRow[] = [
  ["", "Joint debout zinc, pattes fixes et coulissantes", "91 m²", "120,00", "10 920,00"],
  ["", "Voligeage sapin traité 18 mm", "91 m²", "20,00", "1 820,00"],
];

let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
});

describe("une question obligatoire née d'une réponse revient à l'écran des questions", () => {
  it("la réponse à la question du modèle ouvre le façonnage : 200 et la question, jamais un refus ; sautée ensuite : refusée", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "n@example.fr", "Toitures Le Gall");
    const project = await agent.post("/v1/projects").send({ name: "Joint debout", address: "3 rue de Siam, 29200 Brest" });
    const doc = await agent
      .post(`/v1/projects/${project.body.id}/documents`)
      .field("purpose", "client_quote")
      .attach("file", Buffer.from(await makePdf(["devis"], ROWS)), { filename: "devis.pdf", contentType: "application/pdf" });
    await agent.post(`/v1/documents/${doc.body.id}/takeoff`);
    const q = (await agent.get(`/v1/quantitatifs?projetId=${project.body.id}&ecran=1`)).body.items[0] as { id: string };
    // Le modèle a posé SA question, sous une clé que le référentiel ne connaît pas : le façonnage du calcul n'est pas encore posé.
    const row = await ctx.prisma.quantitatif.findUniqueOrThrow({ where: { id: q.id } });
    const record = await ctx.prisma.takeoff.findUniqueOrThrow({ where: { id: row.takeoffId! } });
    const lecture = record.lecture as unknown as LectureDevis;
    lecture.questions = [{ cle: "acces_au_chantier", texte: "Accès au chantier : camion ou fourgon ?", boutons: [{ label: "Camion", valeur: "camion" }, { label: "Fourgon", valeur: "fourgon" }], unite: null, donnee: "accès au chantier", ligne: null }];
    await ctx.prisma.takeoff.update({ where: { id: record.id }, data: { lecture: lecture as unknown as object } });
    const ouvertes = async () => JSON.stringify(((await agent.get(`/v1/quantitatifs/${q.id}?ecran=1`)).body.ecran.view.decisions as { question?: { key: string } }[]).map((d) => d.question?.key));
    expect(await ouvertes()).not.toContain("param:faconnage");

    const suite = await agent.post(`/v1/quantitatifs/${q.id}/calcul?ecran=1`).send({ reponses: [{ question: "fiche:acces_au_chantier", valeur: "camion" }] });
    expect(suite.status).toBe(200);
    expect(suite.body.phase).toBe("questions");
    expect(await ouvertes()).toContain("param:faconnage");

    // Déjà posée, puis sautée : le calcul reste refusé (§49.4).
    const refuse = await agent.post(`/v1/quantitatifs/${q.id}/calcul?ecran=1`).send({ reponses: [] });
    expect(refuse.status).toBe(400);
    expect(JSON.stringify(refuse.body)).toContain("faconnage_required");

    const cle = /param:faconnage[^"]*/.exec(JSON.stringify(refuse.body))![0];
    const ok = await agent.post(`/v1/quantitatifs/${q.id}/calcul?ecran=1`).send({ reponses: [{ question: cle, valeur: "1", unite: "u" }] });
    expect(ok.status).toBe(200);
    expect(ok.body.phase).toBe("resultat");
  });
});
