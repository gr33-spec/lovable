import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { LectureDevis } from "@baticlair/domain";
import { createTestApp, resetDatabase, signUp, type TestContext } from "./support/test-app.js";

/**
 * §51.3, §51.6 (retour du fondateur, 2026-10-12, D.2026.105) : « à la vague de questions j'ai répondu la teinte et la
 * référence de la tuile. Écran 3 : la ligne reste orange « Teinte à préciser », et la teinte/réf répondues n'apparaissent
 * ni dans la désignation ni dans la précision. » Par l'API : une tuile « à préciser » (teinte), une question de la
 * deuxième vague dans la fiche (`fiche:<donnée>`) ; répondue, la tuile passe au vert et porte la réponse.
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
});

type Takeoff = { purchase: { toBuy: { key: string; label: string; precision?: string | null }[]; screen: { groups: { rows: { itemKey?: string; status: string }[] }[] } } };

describe("§51.6 : la réponse de la deuxième vague va à sa ligne", () => {
  it("D.2026.105 : « Teinte à préciser » sur la tuile, teinte répondue → verte, « Rouge vieilli » dans sa ligne", async () => {
    const agent = await signUp(ctx.app, "greg@toitures.fr", "Greg");
    await agent.post("/v1/companies").send({ name: "Toitures Greg", trades: ["roofing"] }).expect(201);
    const q = (await agent.post("/v1/quantitatifs").send({ reference: "D.2026.105", lignes: [{ libelle: "Tuile terre cuite mécanique", quantite: "20", unite: "u" }] }).expect(201)).body;
    const row = await ctx.prisma.quantitatif.findUniqueOrThrow({ where: { id: q.id } });
    const record = await ctx.prisma.takeoff.findUniqueOrThrow({ where: { id: row.takeoffId! } });
    const lecture = record.lecture as unknown as LectureDevis;
    const f = lecture.lignes[0]!.fournitures[0]!;
    f.nom = "Tuile terre cuite mécanique, identique à l'existant";
    f.aPreciser = ["teinte"];
    // La deuxième vague (§51.2) : la relecture a ouvert une donnée, avec sa question, dans la fiche du chantier.
    const fiche = { donnees: [{ cle: "teinte_de_la_tuile", libelle: "Teinte de la tuile", valeur: null, origine: "manquante", question: "Quelle teinte pour la tuile ?" }] };
    await ctx.prisma.takeoff.update({ where: { id: record.id }, data: { lecture: lecture as unknown as object, fiche } });
    const takeoff = async () => (await agent.get(`/v1/projects/${q.projetId}/takeoff`).expect(200)).body.takeoff as Takeoff;
    const statut = (t: Takeoff, key: string) => t.purchase.screen.groups.flatMap((g) => g.rows).find((r) => r.itemKey === key)?.status;
    const avant = await takeoff();
    const tuile = avant.purchase.toBuy.find((b) => /^Tuile terre cuite/.test(b.label))!;
    expect(statut(avant, tuile.key)).toBe("check");
    await agent.post(`/v1/quantitatifs/${q.id}/reponses?ecran=1`).send({ reponses: [{ question: "fiche:teinte_de_la_tuile", valeur: "Rouge vieilli" }] }).expect(201);
    const apres = await takeoff();
    const ligne = apres.purchase.toBuy.find((b) => b.key === tuile.key)!;
    expect(statut(apres, tuile.key)).toBe("ok");
    expect(`${ligne.label} ${ligne.precision ?? ""}`).toContain("Rouge vieilli");
  });
});
