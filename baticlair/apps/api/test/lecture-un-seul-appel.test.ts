import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { LectureDevis } from "@baticlair/domain";
import { FakeLectureReader } from "../src/modules/takeoff/infrastructure/fake-lecture-reader.js";
import { LECTURE_READER, type LectureRequest } from "../src/modules/takeoff/application/lecture-reader.js";
import type { ReadAttempt } from "../src/platform/ai/document-reader.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * Retour du fondateur (2026-10-13, « Je lis ton devis » longtemps, puis « c'est bon mais ça a mis du temps ») : un devis
 * d'un autre métier ou à plusieurs lots était lu DEUX fois par le modèle le plus capable (le métier du compte, puis les
 * bons référentiels). Les métiers sont maintenant REPÉRÉS d'abord (modèle rapide, texte seul) et la lecture part UNE fois
 * avec le ou les bons référentiels. Un repérage en panne ne bloque rien : on retombe sur l'ancien chemin.
 */
const appels: string[] = [];
let reperes: string[] | "panne" = [];
class LecteurAvecReperage extends FakeLectureReader {
  override async lire(request: LectureRequest) {
    appels.push(request.referentiel.includes("=== Référentiel") ? `lots:${[...request.referentiel.matchAll(/\(([a-z_]+)\) ===/g)].map((m) => m[1]).join("+")}` : (request.trade ?? ""));
    const r = await super.lire(request);
    const l = r?.output as LectureDevis | undefined;
    if (l && /prise/i.test(request.document.numberedText)) {
      l.metier = "electrical";
      const refs = l.lignes.map((x) => x.ref);
      if (/mitigeur/i.test(request.document.numberedText))
        l.lots = [
          { metier: "electrical", libelle: "Électricité", lignes: refs.filter((_, i) => /prise/i.test(l.lignes[i]!.designation)) },
          { metier: "plumbing", libelle: "Sanitaire", lignes: refs.filter((_, i) => !/prise/i.test(l.lignes[i]!.designation)) },
        ];
    }
    return r;
  }
  async reperer(): Promise<ReadAttempt<string[]> | null> {
    appels.push("reperage");
    if (reperes === "panne") throw new Error("panne");
    return { status: "success", output: reperes, provider: "fake", model: "fake-rapide", usage: { inputTokens: 100, outputTokens: 5 }, errorCode: null, durationMs: 1 } as unknown as ReadAttempt<string[]>;
  }
}

let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestApp((b) => b.overrideProvider(LECTURE_READER).useValue(new LecteurAvecReperage()));
});
afterAll(async () => {
  await ctx.app.close();
});
beforeEach(async () => {
  appels.length = 0;
  await resetDatabase(ctx.prisma);
});

const prise = { libelle: "Prise de courant 16A 2P+T", quantite: "9", unite: "u" };
const mitigeur = { libelle: "Mitigeur lavabo chromé", quantite: "4", unite: "u" };

describe("le repérage des métiers fait partir la lecture une seule fois", () => {
  it("un devis d'électricien chez un couvreur : repéré, puis UNE lecture avec l'électricité", async () => {
    reperes = ["electrical"];
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures A", ["roofing"]);
    const q = (await agent.post("/v1/quantitatifs").send({ lignes: [prise] }).expect(201)).body as { metier: string };
    expect(appels).toEqual(["reperage", "electrical"]);
    expect(q.metier).toBe("electricite");
  });

  it("un devis électricité + sanitaire : repéré, puis UNE lecture avec les deux référentiels, deux sections", async () => {
    reperes = ["electrical", "plumbing"];
    const { agent } = await signUpWithCompany(ctx.app, "b@example.fr", "Toitures B", ["roofing"]);
    const q = (await agent.post("/v1/quantitatifs").send({ lignes: [prise, mitigeur] }).expect(201)).body as { projetId: string };
    expect(appels).toEqual(["reperage", "lots:electrical+plumbing"]);
    const t = (await agent.get(`/v1/projects/${q.projetId}/takeoff`).expect(200)).body.takeoff as { purchase: { screen: { groups: { label: string }[] } } };
    expect(t.purchase.screen.groups.map((g) => g.label)).toEqual(["Électricité", "Sanitaire"]);
  });

  it("un devis de couverture chez un couvreur : repéré, une lecture", async () => {
    reperes = ["roofing"];
    const { agent } = await signUpWithCompany(ctx.app, "c@example.fr", "Toitures C", ["roofing"]);
    await agent.post("/v1/quantitatifs").send({ lignes: [{ libelle: "Gouttière zinc demi-ronde dév. 33", quantite: "12", unite: "ml" }] }).expect(201);
    expect(appels).toEqual(["reperage", "roofing"]);
  });

  it("un repérage en panne ne bloque rien : l'ancien chemin (lecture, puis relecture avec le bon métier)", async () => {
    reperes = "panne";
    const { agent } = await signUpWithCompany(ctx.app, "d@example.fr", "Toitures D", ["roofing"]);
    const q = (await agent.post("/v1/quantitatifs").send({ lignes: [prise] }).expect(201)).body as { metier: string };
    expect(appels).toEqual(["reperage", "roofing", "electrical"]);
    expect(q.metier).toBe("electricite");
  });
});
