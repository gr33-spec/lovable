import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { LectureDevis } from "@baticlair/domain";
import { FakeLectureReader } from "../src/modules/takeoff/infrastructure/fake-lecture-reader.js";
import { LECTURE_READER, type LectureRequest } from "../src/modules/takeoff/application/lecture-reader.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * MULTIMÉTIER (§52 ; directive du fondateur, 2026-10-12 : « Fais en sorte que l'appli fonctionne en multi métiers ») :
 * « Le métier est détecté par l'IA à la lecture. » Un devis d'électricien déposé sur un compte de couvreur est relu une
 * fois avec le référentiel de l'électricité et calculé avec lui (prises additionnées, câble en couronnes), jamais avec
 * les règles du couvreur. Un devis du métier du compte ne coûte qu'un appel.
 */
const appels: string[] = [];
class LecteurQuiDitElectricite extends FakeLectureReader {
  override async lire(request: LectureRequest) {
    appels.push(request.trade ?? "");
    const r = await super.lire(request);
    // Le modèle dit le métier qu'il lit : de l'électricité quand le devis parle de prises.
    if (r?.output && /prise/i.test(request.document.numberedText)) (r.output as LectureDevis).metier = "electrical";
    return r;
  }
}

let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestApp((b) => b.overrideProvider(LECTURE_READER).useValue(new LecteurQuiDitElectricite()));
});
afterAll(async () => {
  await ctx.app.close();
});
beforeEach(async () => {
  appels.length = 0;
  await resetDatabase(ctx.prisma);
});

describe("§52 : le métier vient du devis, pas du compte", () => {
  it("un devis d'électricien chez un couvreur : relu avec le référentiel électricité, calculé avec lui", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "couvreur@example.fr", "Toitures Greg", ["roofing"]);
    const prise = (quantite: string) => ({ libelle: "Prise de courant 16A 2P+T", quantite, unite: "u" });
    const q = (await agent.post("/v1/quantitatifs").send({ lignes: [prise("9"), prise("6")] }).expect(201)).body as { metier: string; ratios_en_validation: boolean; lignes: { libelle: string; quantite: number | null }[] };
    expect(appels).toEqual(["roofing", "electrical"]);
    expect(q.metier).toBe("electricite");
    expect(q.ratios_en_validation).toBe(true);
    expect(q.lignes.find((l) => /^Prise 2P\+T 16 A/.test(l.libelle))).toMatchObject({ quantite: 15 });
  });

  it("un devis de couverture chez un couvreur : un seul appel, la couverture", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "couvreur2@example.fr", "Toitures Bis", ["roofing"]);
    const q = (await agent.post("/v1/quantitatifs").send({ lignes: [{ libelle: "Gouttière zinc demi-ronde dév. 33", quantite: "12", unite: "ml" }] }).expect(201)).body as { metier: string };
    expect(appels).toEqual(["roofing"]);
    expect(q.metier).toBe("couverture");
  });
});
