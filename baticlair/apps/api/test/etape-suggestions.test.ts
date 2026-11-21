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
  it("après la lecture : naissances, talons, angles et consommables sont proposés (pas les crochets, écrits) ; cinq au plus ; rien n'est dans la liste", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "BATI INVEST");
    const { projetId } = await chantier(agent);
    const e = await ecran(agent, projetId);
    expect(e.suggestions).toEqual([
      { key: "gouttiere/naissance", label: "Naissances de gouttière" },
      { key: "gouttiere/talon", label: "Talons de gouttière (si tu ne les fabriques pas)" },
      { key: "gouttiere/angle", label: "Angles de gouttière (si tu ne les fabriques pas)" },
      // Greg, 18 novembre 2026 : les consommables en cases (plus jamais d'office, plus de question oui / non).
      { key: "bandes-zinc/mastic+bande-porte-solin/mastic", label: "Cartouches de silicone zinc" },
      { key: "bandes-zinc/vis", label: "Vis inox 4 × 40" },
    ]);
    expect(e.purchase.toBuy.map((b) => b.label).join(" | ")).not.toMatch(/naissance|talon|angle|silicone|vis inox|pattes/i);
    // Plus de question oui / non sur les consommables.
    const q = (await agent.get(`/v1/quantitatifs/${(await chantier(agent)).id}`)).body as { questions: { id: string; texte: string }[] };
    expect(q.questions.map((x) => `${x.id} ${x.texte}`).join(" | ")).not.toMatch(/consommables/i);
  });

  it("une case qui n'a pas été proposée est refusée ; rien ne change", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "BATI INVEST");
    const { id, projetId } = await chantier(agent);
    expect((await repondre(agent, id, "gouttiere/etain")).status).toBe(400);
    expect((await repondre(agent, id, "couverture-ardoise/liteau")).status).toBe(400);
    expect((await ecran(agent, projetId)).suggestions).toHaveLength(5);
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

  it("le silicone coché (une case pour deux pièces) entre dans la liste, sur une ligne ; les vis, non cochées, n'existent pas", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "BATI INVEST");
    const { id, projetId } = await chantier(agent);
    expect((await repondre(agent, id, "gouttiere/naissance,bandes-zinc/mastic+bande-porte-solin/mastic")).status).toBeLessThan(300);
    const e = await ecran(agent, projetId);
    expect(e.suggestions).toEqual([]);
    const noms = e.purchase.toBuy.map((b) => b.label);
    expect(noms.filter((n) => /silicone/i.test(n))).toHaveLength(1);
    expect(noms.join(" | ")).toMatch(/Naissances/);
    expect(noms.join(" | ")).not.toMatch(/vis inox|pattes/i);
  });

  it("« aucune » : la liste reste telle que le devis la dit, et l'étape est close", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "BATI INVEST");
    const { id, projetId } = await chantier(agent);
    expect((await repondre(agent, id, "aucune")).status).toBeLessThan(300);
    const e = await ecran(agent, projetId);
    expect(e.suggestions).toEqual([]);
    expect(e.purchase.toBuy.map((b) => b.label).join(" | ")).not.toMatch(/naissance|talon|angle/i);
  });

  it("naissance cochée, puis « je ne sais pas » au nombre de descentes : la ligne garde ses boutons, jamais orange sans réglage (§51.6)", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const q = (await agent.post("/v1/quantitatifs").send({ reference: "Maison", adresse: "29200 Brest", lignes: [{ libelle: "Couverture ardoise naturelle 32x22", quantite: "120", unite: "m²" }, { libelle: "Gouttière zinc demi-ronde", quantite: "18", unite: "ml" }] })).body as { id: string; projetId: string };
    expect((await repondre(agent, q.id, "gouttiere/naissance")).status).toBeLessThan(300);
    // Point 16 : la question de l'article coché se pose avec les premières.
    const avant = (await agent.get(`/v1/quantitatifs/${q.id}`)).body as { questions: { id: string }[] };
    expect(avant.questions.map((x) => x.id)).toContain("engine:param:nb_descentes");
    expect((await agent.post(`/v1/quantitatifs/${q.id}/reponses`).send({ reponses: [{ question: "engine:param:nb_descentes", valeur: null }] })).status).toBeLessThan(300);
    const t = (await agent.get(`/v1/projects/${q.projetId}/takeoff`).expect(200)).body.takeoff as { purchase: { toBuy: { label: string; asks?: { key: string; options: unknown[] }[] }[] } };
    const naissances = t.purchase.toBuy.find((b) => /^Naissances/.test(b.label))!;
    expect(naissances).toBeDefined();
    expect((naissances.asks ?? []).map((a) => a.key)).toContain("param:nb_descentes");
    expect(naissances.asks![0]!.options.length).toBeGreaterThan(0);
  });

  it("une autre entreprise ne répond pas à la place : introuvable", async () => {
    const a = await signUpWithCompany(ctx.app, "a@example.fr", "BATI INVEST");
    const b = await signUpWithCompany(ctx.app, "b@example.fr", "Toitures Martin");
    const { id } = await chantier(a.agent);
    expect((await repondre(b.agent, id, "gouttiere/naissance")).status).toBe(404);
  });
});
