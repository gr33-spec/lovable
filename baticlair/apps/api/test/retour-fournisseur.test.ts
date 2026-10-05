import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { loadConfig } from "../src/platform/config/config.js";
import { CONFIG } from "../src/platform/tokens.js";
import { makePdf, type FixtureRow } from "./support/pdf-fixtures.js";
import { createTestApp, resetDatabase, signUp, type Agent, type TestContext } from "./support/test-app.js";

/**
 * §47.5 RETOUR FOURNISSEUR (couche 5, la réalité). Le négoce a répondu : l'artisan dit d'un tap « commandé tel quel »
 * ou « modifié » ; modifié, il colle son bon de commande ou le photographie. Les écarts avec la liste envoyée entrent
 * au journal comme des corrections, marquées « bon de commande » (§47.7, test 5) et de poids 3 ; l'export mensuel les
 * compte à part. Une commande ne compte qu'une fois.
 */
let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestApp((b) => b.overrideProvider(CONFIG).useValue({ ...loadConfig(), referentialValidators: ["greg@batiinvest.fr"] }));
});
afterAll(async () => {
  await ctx.app.close();
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
});

const BREST = [
  { libelle: "Couverture en ardoises naturelles 30x22 posées au crochet", quantite: "200", unite: "m²" },
  { libelle: "Gouttière demi-ronde zinc développé 33", quantite: "24", unite: "ml" },
];

interface Line {
  designation: string;
  quantity: string | null;
  unit: string | null;
}

/** Le chantier de Brest validé et envoyé à Point.P : la demande de prix et ses lignes. */
async function demande(): Promise<{ agent: Agent; requestId: string; supplierId: string; lines: Line[]; projectId: string }> {
  const agent = await signUp(ctx.app, "greg@batiinvest.fr", "Greg");
  await agent.post("/v1/companies").send({ name: "Bati invest", trades: ["roofing"] }).expect(201);
  const q = (await agent.post("/v1/quantitatifs").send({ reference: "Brest", adresse: "4 rue de Siam, 29200 Brest", lignes: BREST })).body;
  let current = (await agent.get(`/v1/quantitatifs/${q.id}`)).body;
  for (let i = 0; i < 12 && current.questions.length > 0; i++) {
    const question = current.questions[0];
    current = (await agent.post(`/v1/quantitatifs/${q.id}/reponses`).send({ reponses: [{ question: question.id, valeur: question.boutons[0]?.valeur ?? "ok" }] })).body;
  }
  await agent.post(`/v1/quantitatifs/${q.id}/validation`).expect(200);
  const supplier = (await agent.post("/v1/suppliers").send({ name: "Point.P Brest", email: "devis@pointp-brest.fr" })).body;
  const created = (await agent.post(`/v1/projects/${q.projetId}/price-requests`).send({ supplierIds: [supplier.id] }).expect(201)).body;
  return { agent, requestId: created.id, supplierId: supplier.id, lines: created.lines, projectId: q.projetId };
}

const journal = (projectId: string) => ctx.prisma.correctionEvent.findMany({ where: { projectId }, orderBy: { createdAt: "asc" } });
const n = (q: string | null) => Number((q ?? "").replace(/\s/g, "").replace(",", "."));

describe("§47.5 — retour fournisseur", () => {
  it("« commandé tel quel » : chaque ligne envoyée confirmée au journal, marquée « bon de commande », poids 3 ; une seule fois", async () => {
    const { agent, requestId, supplierId, lines, projectId } = await demande();
    const before = (await journal(projectId)).length;
    const res = (await agent.post(`/v1/price-requests/${requestId}/order`).send({ supplierId, outcome: "as_is" }).expect(200)).body;
    expect(res.orderFeedback).toMatchObject({ supplierId, outcome: "as_is", source: "none" });
    expect(res.orderFeedback.gaps.every((g: { kind: string }) => g.kind === "same")).toBe(true);
    const events = (await journal(projectId)).slice(before);
    expect(events).toHaveLength(lines.length);
    for (const e of events) expect(e).toMatchObject({ action: "confirm", context: expect.objectContaining({ source: "bon_de_commande", poids: 3, commande: "tel quel" }) });
    // Une commande ne compte jamais deux fois.
    expect((await agent.post(`/v1/price-requests/${requestId}/order`).send({ supplierId, outcome: "as_is" })).status).toBe(409);
  });

  it("« modifié » avec le bon collé : chaque écart est une correction au journal (§47.7, test 5) avec ses champs §45.6", async () => {
    const { agent, requestId, supplierId, lines, projectId } = await demande();
    const ardoises = lines.find((l) => /^Ardoises/.test(l.designation))!;
    const liteaux = lines.find((l) => /^Liteaux 18/.test(l.designation))!;
    const collé = [
      "BON DE COMMANDE n° 4512",
      `${ardoises.designation} : 9 000 pièces`,
      ...lines.filter((l) => l !== ardoises && l !== liteaux).map((l) => `${l.designation} ${l.quantity ?? ""}`),
      "Closoir ventilé 2 rouleaux",
    ].join("\n");
    const res = (await agent.post(`/v1/price-requests/${requestId}/order`).send({ supplierId, outcome: "modified", text: collé }).expect(200)).body;
    const gaps = res.orderFeedback.gaps as { kind: string; designation: string; sent: string; ordered: string | null }[];
    expect(gaps.find((g) => g.designation === ardoises.designation)).toMatchObject({ kind: "changed", ordered: "9 000" });
    expect(gaps.find((g) => g.designation === liteaux.designation)).toMatchObject({ kind: "removed", ordered: null });
    expect(gaps.find((g) => g.kind === "added")).toMatchObject({ designation: "Closoir ventilé", ordered: "2" });

    const events = await journal(projectId);
    const corrected = events.find((e) => e.action === "correct" && (e.context as Record<string, unknown>).materiau === ardoises.designation)!;
    expect(corrected.context).toMatchObject({
      source: "bon_de_commande",
      poids: 3,
      commande: "modifiée",
      quantite_calculee: ardoises.quantity,
      quantite_corrigee: "9 000",
      metier: "couverture",
      departement: "29",
    });
    expect(String((corrected.context as Record<string, unknown>).regle)).not.toBe("commande");
    expect(events.find((e) => e.action === "correct" && (e.context as Record<string, unknown>).materiau === liteaux.designation)?.context).toMatchObject({ quantite_corrigee: "0" });
    expect(events.some((e) => e.action === "add" && (e.context as Record<string, unknown>).source === "bon_de_commande")).toBe(true);

    // L'export mensuel compte les corrections venues d'un bon de commande à part, avec leur poids.
    const month = new Date().toISOString().slice(0, 7);
    const csv = (await agent.get(`/v1/corrections/export.csv?mois=${month}`).expect(200)).text;
    expect(csv.split("\n")[0]).toBe("mois;metier;regle;version_referentiel;corrections;dont_bons_de_commande;poids;a_preciser;ecart_moyen_pct");
    expect(csv).toMatch(/;1;1;3;0;-?\d/);
  });

  it("un bon collé illisible est refusé, rien ne part au journal", async () => {
    const { agent, requestId, supplierId, projectId } = await demande();
    const before = (await journal(projectId)).length;
    const res = await agent.post(`/v1/price-requests/${requestId}/order`).send({ supplierId, outcome: "modified", text: "Merci pour votre commande" });
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain("order_unreadable");
    expect((await journal(projectId)).length).toBe(before);
  });

  it("« modifié » avec la photo du bon : gardée, puis lue (une analyse) ; les écarts sont faits par le code", async () => {
    const { agent, requestId, supplierId, lines, projectId } = await demande();
    const rows: FixtureRow[] = lines.map((l, i) => [`R${i}`, l.designation, `${i === 0 ? n(l.quantity) - 100 : n(l.quantity)} u`, "1,00", "1,00"]);
    const pdf = Buffer.from(await makePdf(["devis"], rows, "Total HT 1,00   TVA 20 % 0,20   Total TTC 1,20", "BON DE COMMANDE N° 88"));
    const stored = (await agent.post(`/v1/price-requests/${requestId}/order/document`).field("supplierId", supplierId).attach("file", pdf, { filename: "bon.pdf", contentType: "application/pdf" }).expect(201)).body;
    expect(stored.orderFeedback).toMatchObject({ outcome: "modified", source: "document", pendingReading: true, gaps: [] });
    const read = (await agent.post(`/v1/price-requests/${requestId}/order/analysis`).expect(201)).body;
    expect(read.orderFeedback.pendingReading).toBe(false);
    const first = read.orderFeedback.gaps[0];
    expect(first).toMatchObject({ kind: "changed", designation: lines[0]!.designation });
    // Chaque écart (et chaque ligne reprise telle quelle) est au journal, une fois.
    expect((await journal(projectId)).filter((e) => (e.context as Record<string, unknown>).source === "bon_de_commande")).toHaveLength(read.orderFeedback.gaps.length);
    expect((await agent.post(`/v1/price-requests/${requestId}/order/analysis`)).status).toBe(400);
  });
});
