import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { LectureDevis } from "@baticlair/domain";
import { createTestApp, resetDatabase, signUp, type TestContext } from "./support/test-app.js";

/**
 * Retour du fondateur (2026-10-10, capture iPhone, D-2026-020) : « Quand je clique sur un bouton, rien ne se passe. »
 * §49.8 : une ligne orange se règle dans sa carte, d'un geste ; un tap, la ligne se recalcule. Une question du comptoir
 * (« Matière des crochets : acier galvanisé ou zinc ») répondue d'un bouton part dans la précision ET ses boutons
 * disparaissent de la ligne : jamais la même carte, inchangée, après le tap.
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

type Item = { key: string; label: string; asks?: { key: string; options: { value: string }[] }[]; precision?: string | null };

describe("§49.8 : un bouton de la ligne fait quelque chose", () => {
  it("la matière des crochets répondue d'un tap : précision écrite, boutons retirés", async () => {
    const agent = await signUp(ctx.app, "greg@toitures.fr", "Greg");
    await agent.post("/v1/companies").send({ name: "Toitures Greg", trades: ["roofing"] }).expect(201);
    const q = (
      await agent
        .post("/v1/quantitatifs")
        .send({
          reference: "D-2026-020",
          adresse: "18 rue de Siam, 29200 Brest",
          lignes: [
            { libelle: "Fourniture de gouttière Havraise en zinc", quantite: "10", unite: "m" },
            { libelle: "Fourniture de crochets de gouttière Havraise en acier galvanisé ou zinc, sur chevrons, espacement tous les 50 cm", quantite: "20", unite: "unités" },
          ],
        })
        .expect(201)
    ).body;
    // La lecture du modèle (§51.5) : une question sur la matière des crochets (acier galvanisé ou zinc), que la ligne attend.
    const row = await ctx.prisma.quantitatif.findUniqueOrThrow({ where: { id: q.id } });
    const takeoff = await ctx.prisma.takeoff.findUniqueOrThrow({ where: { id: row.takeoffId! } });
    const lecture = takeoff.lecture as unknown as LectureDevis;
    const crochetsLigne = lecture.lignes[1]!;
    lecture.questions.push({ cle: "matiere_crochets", texte: "Matière des crochets ?", boutons: [{ label: "acier galvanisé", valeur: "acier galvanisé" }, { label: "zinc", valeur: "zinc" }], unite: null, donnee: "matière des crochets", ligne: crochetsLigne.ref });
    for (const f of crochetsLigne.fournitures) f.attend.push("matiere_crochets");
    await ctx.prisma.takeoff.update({ where: { id: takeoff.id }, data: { lecture: lecture as unknown as object } });
    await agent.post(`/v1/quantitatifs/${q.id}/calcul?ecran=1`).send({ reponses: [] }).expect(200);
    const items = async () => ((await agent.get(`/v1/projects/${q.projetId}/takeoff`).expect(200)).body.takeoff.purchase.toBuy as Item[]);
    const crochets = (await items()).find((b) => /^Crochets/.test(b.label))!;
    const ask = crochets.asks?.find((a) => a.options.some((o) => o.value === "acier galvanisé"));
    expect(ask).toBeDefined();
    await agent.post(`/v1/quantitatifs/${q.id}/reponses?ecran=1`).send({ reponses: [{ question: ask!.key, valeur: "acier galvanisé" }] }).expect(201);
    const after = (await items()).find((b) => b.key === crochets.key)!;
    expect(after.precision).toContain("acier galvanisé");
    expect((after.asks ?? []).map((a) => a.key)).not.toContain(ask!.key);
  });
});
