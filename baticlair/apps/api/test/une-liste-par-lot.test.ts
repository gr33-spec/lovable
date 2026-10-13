import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { LectureDevis } from "@baticlair/domain";
import { LECTURE_READER, type LectureRequest } from "../src/modules/takeoff/application/lecture-reader.js";
import { FakeLectureReader } from "../src/modules/takeoff/infrastructure/fake-lecture-reader.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * §52 (directive du fondateur, 2026-10-12 : « on y va franco, fais en sorte que l'appli fonctionne en multi métiers ») :
 * « Un devis multi-lots donne une liste par lot, chacun avec son référentiel. » Par l'API : un devis électricité +
 * sanitaire déposé chez un couvreur est relu une fois avec les référentiels de ses lots, puis l'écran 3 a une section
 * par lot, l'électricité calculée par son tiroir (prises additionnées), et la mention « Ratios en cours de validation ».
 */
const appels: string[] = [];
class LecteurDeuxLots extends FakeLectureReader {
  override async lire(request: LectureRequest) {
    appels.push(request.referentiel.includes("=== Référentiel") ? "lots" : (request.trade ?? ""));
    const r = await super.lire(request);
    const l = r?.output as LectureDevis | undefined;
    if (l) {
      // Ce que le modèle rend pour ce devis : deux lots, et le point « prise 16 A » nommé sur les lignes de prises.
      const refs = l.lignes.map((x) => x.ref);
      l.metier = "electrical";
      l.lots = [
        { metier: "electrical", libelle: "Électricité", lignes: refs.filter((_, i) => /prise/i.test(l.lignes[i]!.designation)) },
        { metier: "plumbing", libelle: "Sanitaire", lignes: refs.filter((_, i) => !/prise/i.test(l.lignes[i]!.designation)) },
      ];
      for (const ligne of l.lignes) for (const f of ligne.fournitures) if (/prise/i.test(ligne.designation)) Object.assign(f, { ouvrage: "prise-16a", emplacement: null });
    }
    return r;
  }
}

let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestApp((b) => b.overrideProvider(LECTURE_READER).useValue(new LecteurDeuxLots()));
});
afterAll(async () => {
  await ctx.app.close();
});
beforeEach(async () => {
  appels.length = 0;
  await resetDatabase(ctx.prisma);
});

type Takeoff = { ratiosEnValidation: boolean; purchase: { toBuy: { key: string; label: string; quantity: string | null }[]; screen: { groups: { key: string; label: string; rows: { itemKey?: string }[] }[] } } };

describe("§52 : un devis à plusieurs lots, une section par lot", () => {
  it("électricité + sanitaire : relu avec les deux référentiels, deux sections, les prises additionnées", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "couvreur@example.fr", "Toitures Greg", ["roofing"]);
    const q = (await agent
      .post("/v1/quantitatifs")
      .send({ lignes: [{ libelle: "Prise de courant 16A 2P+T", quantite: "9", unite: "u" }, { libelle: "Prise de courant 16A 2P+T", quantite: "6", unite: "u" }, { libelle: "Mitigeur lavabo chromé", quantite: "4", unite: "u" }] })
      .expect(201)).body as { projetId: string };
    expect(appels).toEqual(["roofing", "lots"]);
    const t = (await agent.get(`/v1/projects/${q.projetId}/takeoff`).expect(200)).body.takeoff as Takeoff;
    expect(t.purchase.screen.groups.map((g) => g.label)).toEqual(["Électricité", "Sanitaire"]);
    const libelles = (g: Takeoff["purchase"]["screen"]["groups"][number]) => g.rows.map((r) => t.purchase.toBuy.find((b) => b.key === r.itemKey)).filter(Boolean).map((b) => `${b!.label} · ${b!.quantity}`);
    expect(libelles(t.purchase.screen.groups[0]!).some((x) => /^Prise 2P\+T 16 A.* · 15\b/.test(x))).toBe(true);
    expect(libelles(t.purchase.screen.groups[1]!)).toEqual([expect.stringMatching(/Mitigeur lavabo/)]);
    expect(t.ratiosEnValidation).toBe(true);
  });

  it("la carte « Lots repérés » (2026-10-13) : les lots exposés, un lot retiré rend une seule liste, rien ne disparaît", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "couvreur@example.fr", "Toitures Greg", ["roofing"]);
    const q = (await agent
      .post("/v1/quantitatifs")
      .send({ lignes: [{ libelle: "Prise de courant 16A 2P+T", quantite: "9", unite: "u" }, { libelle: "Mitigeur lavabo chromé", quantite: "4", unite: "u" }] })
      .expect(201)).body as { projetId: string };
    type AvecLots = Takeoff & { id: string; lots: { metier: string; libelle: string; lignes: number }[]; lotsConfirmes: string[] | null; metiersAjoutables: { metier: string; libelle: string }[] };
    const avant = (await agent.get(`/v1/projects/${q.projetId}/takeoff`).expect(200)).body.takeoff as AvecLots;
    expect(avant.lots).toEqual([
      { metier: "electrical", libelle: "Électricité", lignes: 1 },
      { metier: "plumbing", libelle: "Sanitaire", lignes: 1 },
    ]);
    expect(avant.lotsConfirmes).toBeNull();
    expect(avant.metiersAjoutables).toContainEqual({ metier: "masonry", libelle: "Maçonnerie" });
    expect(avant.metiersAjoutables.some((m) => m.metier === "general")).toBe(false);
    // Une réponse qui n'est pas une liste de métiers est refusée.
    await agent.post(`/v1/takeoffs/${avant.id}/answers`).send({ key: "lots:confirmes", value: "" }).expect(400);
    const apres = (await agent.post(`/v1/takeoffs/${avant.id}/answers`).send({ key: "lots:confirmes", value: "electrical" }).expect(200)).body as AvecLots;
    expect(apres.lotsConfirmes).toEqual(["electrical"]);
    expect(apres.purchase.screen.groups.some((g) => g.key.startsWith("lot:"))).toBe(false);
    expect(apres.purchase.toBuy.map((b) => b.label)).toEqual(expect.arrayContaining([expect.stringMatching(/Mitigeur lavabo/), expect.stringMatching(/^Prise 2P\+T 16 A/)]));
  });
});
