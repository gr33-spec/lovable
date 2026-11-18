import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { D2026_020_PDF } from "./support/d2026-020-pdf.js";
import { createTestApp, resetDatabase, signUpWithCompany, type Agent, type TestContext } from "./support/test-app.js";

/**
 * ÉTAPE « SUGGESTIONS », PAR L'API (Greg, 17 novembre 2026, points 13 à 17 ; règle changée : §49.1 points 3 et 5).
 * Après la lecture, l'écran reçoit les cases à proposer (la fiche du métier, jamais l'IA). L'artisan répond une fois :
 * les cases cochées, parmi celles proposées, ou « aucune ». Coché : l'article entre dans la liste ; le reste n'existe pas.
 * Le devis : le chantier ardoise et zinguerie de Greg (D-2026-020, lecture réelle enregistrée).
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

type Ecran = { suggestions: { key: string; label: string }[]; purchase: { toBuy: { label: string }[] } };
async function chantier(agent: Agent) {
  const res = await agent.post("/v1/quantitatifs").field("reference", "Extension ardoise").field("adresse", "3 rue du Port, 22620 Ploubazlanec").attach("file", Buffer.from(await D2026_020_PDF()), { filename: "devis.pdf", contentType: "application/pdf" });
  expect(res.status, JSON.stringify(res.body).slice(0, 300)).toBe(201);
  return { id: res.body.id as string, projetId: res.body.projetId as string };
}
const ecran = async (agent: Agent, projetId: string) => (await agent.get(`/v1/projects/${projetId}/takeoff`).expect(200)).body.takeoff as Ecran;
const repondre = (agent: Agent, id: string, valeur: string) => agent.post(`/v1/quantitatifs/${id}/reponses`).send({ reponses: [{ question: "suggestions:choisies", valeur }] });

describe("l'étape « Suggestions » : proposée par la fiche, répondue une fois", () => {
  it("après la lecture : naissances, talons et angles sont proposés (pas les crochets, écrits) ; rien n'est dans la liste", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "BATI INVEST");
    const { projetId } = await chantier(agent);
    const e = await ecran(agent, projetId);
    expect(e.suggestions).toEqual([
      { key: "gouttiere/naissance", label: "Naissances de gouttière" },
      { key: "gouttiere/talon", label: "Talons de gouttière (si tu ne les fabriques pas)" },
      { key: "gouttiere/angle", label: "Angles de gouttière (si tu ne les fabriques pas)" },
    ]);
    expect(e.purchase.toBuy.map((b) => b.label).join(" | ")).not.toMatch(/naissance|talon|angle/i);
  });

  it("une case qui n'a pas été proposée est refusée ; rien ne change", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "BATI INVEST");
    const { id, projetId } = await chantier(agent);
    expect((await repondre(agent, id, "gouttiere/etain")).status).toBe(400);
    expect((await repondre(agent, id, "couverture-ardoise/liteau")).status).toBe(400);
    expect((await ecran(agent, projetId)).suggestions).toHaveLength(3);
  });

  it("naissances cochées : elles entrent dans la liste, l'étape est close ; talons et angles n'existent pas", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "BATI INVEST");
    const { id, projetId } = await chantier(agent);
    expect((await repondre(agent, id, "gouttiere/naissance")).status).toBeLessThan(300);
    const e = await ecran(agent, projetId);
    expect(e.suggestions).toEqual([]);
    const noms = e.purchase.toBuy.map((b) => b.label).join(" | ");
    expect(noms).toMatch(/Naissances/);
    expect(noms).not.toMatch(/talon|angle/i);
    // Répondue une fois : l'étape ne se rouvre pas.
    expect((await repondre(agent, id, "gouttiere/talon")).status).toBe(400);
  });

  it("« aucune » : la liste reste telle que le devis la dit, et l'étape est close", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "BATI INVEST");
    const { id, projetId } = await chantier(agent);
    expect((await repondre(agent, id, "aucune")).status).toBeLessThan(300);
    const e = await ecran(agent, projetId);
    expect(e.suggestions).toEqual([]);
    expect(e.purchase.toBuy.map((b) => b.label).join(" | ")).not.toMatch(/naissance|talon|angle/i);
  });

  it("une autre entreprise ne répond pas à la place : introuvable", async () => {
    const a = await signUpWithCompany(ctx.app, "a@example.fr", "BATI INVEST");
    const b = await signUpWithCompany(ctx.app, "b@example.fr", "Toitures Martin");
    const { id } = await chantier(a.agent);
    expect((await repondre(b.agent, id, "gouttiere/naissance")).status).toBe(404);
  });
});
