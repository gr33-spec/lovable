import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { D2026_015_LINES } from "../../../packages/domain/test/devis-reels/d2026-015.js";
import { PISCINE_LINES } from "../../../packages/domain/test/devis-reels/piscine.js";
import { LEZARDRIEUX_LINES } from "../../../packages/domain/test/devis-reels/platrerie-lezardrieux.js";
import type { BenchLine } from "../../../packages/domain/test/devis-reels/truth.js";
import { ROOFING_REFERENTIAL } from "@baticlair/domain";
import { CompanyMemory } from "../src/modules/learning/application/company-memory.js";
import { CorrectionJournal } from "../src/modules/learning/application/correction-journal.js";
import type { TenantContext } from "../src/modules/tenancy/index.js";
import { loadConfig } from "../src/platform/config/config.js";
import { CONFIG } from "../src/platform/tokens.js";
import { makePdf } from "./support/pdf-fixtures.js";
import { createTestApp, resetDatabase, signUpWithCompany, type Agent, type TestContext } from "./support/test-app.js";

/**
 * L'ÉCRAN DE L'ARTISAN sur les vrais devis du banc, par l'API : des
 * décisions (pas des lignes en erreur), une réponse qui règle tout ce
 * qu'elle peut, et jamais un ✓ obtenu en fermant une alerte.
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

interface Counts {
  verified: number;
  toConfirm: number;
  missing: number;
}
interface Decision {
  key: string;
  state: string;
  title: string;
  text: string;
  lineIds: string[];
  pieceLineIds: string[];
  primary: { action: string; label: string } | null;
  question: { key: string; kind: string } | null;
}
interface Item {
  kind: string;
  id: string;
  state: string;
  proof: { key: string; status: string; origin: string | null; detail: string }[];
  calculation: { trace: { origin: string | null; from: string }[] } | null;
}
interface View {
  counts: Counts;
  decisions: Decision[];
  measures: { lineIds: string[]; text: string } | null;
  items: Item[];
}
interface Purchase {
  understood: string[];
  toBuy: { key: string; label: string; quantity: string | null; approx: string | null; kind: string; needIds: string[]; lineIds: string[]; state: string; assumptionKeys: string[] }[];
  toQuote: { key: string; label: string; measure: string; reason: string; lineIds: string[] }[];
  assumptions: { key: string; label: string; value: string; unit: string; choices: { label: string; value: string }[] }[];
  canValidate: boolean;
}

async function tenantOf(companyId: string): Promise<TenantContext> {
  const m = await ctx.prisma.membership.findFirstOrThrow({ where: { companyId } });
  return { companyId, userId: m.userId, role: "owner", trades: [] };
}

/** Un chantier dont la liste reprend, ligne par ligne, un vrai devis du banc. */
async function projectWith(agent: Agent, bench: BenchLine[]) {
  const project = await agent.post("/v1/projects").send({ name: "Chantier test" });
  const doc = await agent
    .post(`/v1/projects/${project.body.id}/documents`)
    .field("purpose", "client_quote")
    .attach("file", Buffer.from(await makePdf(["devis"])), { filename: "devis.pdf", contentType: "application/pdf" });
  const takeoff = (await agent.post(`/v1/documents/${doc.body.id}/takeoff`)).body;
  for (const l of takeoff.lines) await agent.delete(`/v1/takeoff-lines/${l.id}`).expect(200);
  for (const l of bench) {
    await agent
      .post(`/v1/takeoffs/${takeoff.id}/lines`)
      .send({ designation: l.designation.slice(0, 300), quantity: l.quantity, unit: l.unit })
      .expect(201);
  }
  const body = (await agent.get(`/v1/projects/${project.body.id}/takeoff`)).body.takeoff;
  return { projectId: project.body.id as string, takeoffId: takeoff.id as string, view: body.view as View, purchase: body.purchase as Purchase };
}

const getView = async (agent: Agent, projectId: string) => (await agent.get(`/v1/projects/${projectId}/takeoff`)).body.takeoff.view as View;

describe("piscine : 37 lignes, une seule décision", () => {
  it("une interaction règle les 37 éléments, chaque ligne est journalisée, la liste se valide", async () => {
    const { agent, companyId } = await signUpWithCompany(ctx.app, "p@example.fr", "Piscines Martin", ["other"]);
    const { projectId, takeoffId, view } = await projectWith(agent, PISCINE_LINES);
    expect(view.counts).toEqual({ verified: 0, toConfirm: 37, missing: 0 });
    expect(view.decisions).toHaveLength(1);
    const [d] = view.decisions;
    expect(d).toMatchObject({ key: "group:unknown", primary: { action: "pieces", label: "Oui, tels qu'écrits" } });
    expect(d!.lineIds).toHaveLength(37);
    expect(d!.pieceLineIds).toHaveLength(32);

    // Valider avant de décider : refusé, rien ne part avec un ⚠ non tranché.
    expect((await agent.post(`/v1/takeoffs/${takeoffId}/validate`)).status).toBe(400);

    const after = (await agent.post(`/v1/takeoffs/${takeoffId}/decisions`).send({ action: "pieces", lineIds: d!.lineIds, pieceLineIds: d!.pieceLineIds }).expect(200)).body.view as View;
    expect(after.counts).toEqual({ verified: 37, toConfirm: 0, missing: 0 });
    expect(after.decisions).toEqual([]);
    await agent.post(`/v1/takeoffs/${takeoffId}/validate`).expect(200);

    // Le feutre « au m² » n'est pas passé à la pièce ; les lignes sans unité, si.
    const lines = (await getView(agent, projectId)).items;
    expect(lines).toHaveLength(37);
    const journal = await ctx.app.get(CorrectionJournal).list(await tenantOf(companyId), { projectId });
    expect(journal.filter((e) => e.action === "edit" && e.after?.unit === "u")).toHaveLength(32);
    expect(journal.filter((e) => e.action === "confirm")).toHaveLength(37);
  });
});

describe("une information manquante ne devient jamais ✓ en fermant l'écran", () => {
  it("plâtrerie : les ouvrages mesurés restent « ? », même après avoir tout validé", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "l@example.fr", "Plâtrerie Martin", ["drywall"]);
    const { projectId, takeoffId, view } = await projectWith(agent, LEZARDRIEUX_LINES);
    expect(view.measures?.lineIds.length).toBeGreaterThan(10);
    // Revenir sur l'écran sans rien faire ne change rien.
    expect(await getView(agent, projectId)).toEqual(view);
    // Les « Quantité à confirmer » (§47.3, sans ligne du devis) se répondent par « C'est bon » (réponse), pas ici.
    for (const d of view.decisions.filter((x) => x.lineIds.length > 0 && (x.primary?.action === "keep" || x.primary?.action === "pieces"))) {
      await agent.post(`/v1/takeoffs/${takeoffId}/decisions`).send({ action: d.primary!.action, lineIds: d.lineIds, pieceLineIds: d.pieceLineIds }).expect(200);
    }
    const after = await getView(agent, projectId);
    for (const id of view.measures!.lineIds) expect(after.items.find((i) => i.id === id)?.state).toBe("missing");
    // « C'est bon » sur un ouvrage mesuré ne le rend pas ✓ non plus.
    await agent.post(`/v1/takeoff-lines/${view.measures!.lineIds[0]}/confirm`).expect(200);
    expect((await getView(agent, projectId)).items.find((i) => i.id === view.measures!.lineIds[0])?.state).toBe("missing");
  });
});

describe("questions du calcul : une réponse, une seule fois, et la preuve", () => {
  it("couverture : « aucun de ces modèles » retire l'hypothèse, le générique compte quand même (modèle à préciser), la réponse est journalisée", async () => {
    const { agent, companyId } = await signUpWithCompany(ctx.app, "c@example.fr", "Toitures Martin");
    const { projectId, takeoffId, view, purchase } = await projectWith(agent, D2026_015_LINES);
    // Aucune question sur la faîtière : la pièce par défaut (29 pour 10 m) est dans la liste d'achats.
    expect(view.decisions.some((d) => d.question?.key === "product:faitiere")).toBe(false);
    expect(purchase.toBuy.find((b) => b.needIds.includes("faitieres"))).toMatchObject({ quantity: "29 pièces" });
    const answered = (await agent.post(`/v1/takeoffs/${takeoffId}/answers`).send({ key: "product:faitiere", value: null }).expect(200)).body;
    const after = answered.view as View;
    const afterPurchase = answered.purchase as Purchase;
    expect(after.decisions.some((d) => d.question?.key === "product:faitiere")).toBe(false);
    // Le fournisseur chiffre en dernier recours : les 29 faîtières restent comptées, « modèle à préciser » par lui.
    expect(afterPurchase.toBuy.find((b) => b.needIds.includes("faitieres"))).toMatchObject({ quantity: "29 pièces", label: expect.stringMatching(/modèle à préciser/) });
    expect(afterPurchase.toQuote.some((q) => q.key === "need:faitieres")).toBe(false);
    const events = await ctx.app.get(CorrectionJournal).list(await tenantOf(companyId), { projectId });
    expect(events.filter((e) => e.action === "answer")).toEqual([expect.objectContaining({ after: expect.objectContaining({ designation: "product:faitiere", reference: "aucun" }) })]);
  });

  it("aucune donnée non vérifiée ne devient établie à l'écran", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "c@example.fr", "Toitures Martin");
    const { takeoffId } = await projectWith(agent, D2026_015_LINES);
    // La pose des crochets de gouttière : une question du comptoir (§47.8), répondue ici (en façade).
    await agent.post(`/v1/takeoffs/${takeoffId}/answers`).send({ key: "param:fixation_crochet", value: { value: "2", unit: "u" } }).expect(200);
    const view = (await agent.post(`/v1/takeoffs/${takeoffId}/answers`).send({ key: "product:faitiere", value: "edilians-faitiere-angulaire-710" }).expect(200)).body.view as View;
    const needs = view.items.filter((i) => i.kind === "need");
    // Chaque ✓ vient d'une règle VALIDÉE ; crochets de gouttière, coudes et colliers (sans règle validée) ne produisent rien.
    const verifiedRules = new Set(ROOFING_REFERENTIAL.workItems.flatMap((w) => w.needs.filter((n) => n.verification.status === "verified").map((n) => n.id)));
    for (const n of needs.filter((x) => x.state === "verified")) expect(verifiedRules.has(n.id)).toBe(true);
    // Chaque hypothèse utilisée est dite comme telle dans la preuve, jamais confondue avec une donnée du devis.
    const crochets = needs.find((n) => n.id === "crochets")!;
    expect(crochets.proof.find((p) => p.key === "site_data" && p.origin === "assumption")?.detail).toMatch(/^Zone climatique : 3/);
    // « Voir le calcul » : chaque élément dit d'où il vient (devis, référentiel, chantier).
    const faitieres = needs.find((n) => n.id === "faitieres")!;
    expect(faitieres.state).toBe("verified");
    expect(faitieres.calculation!.trace.filter((t) => t.origin === null).map((t) => t.from)).toEqual([]);
    expect(new Set(faitieres.calculation!.trace.map((t) => t.origin))).toEqual(new Set(["devis", "referential", "project", "company"]));
  });

  it("la préférence de l'entreprise A n'apparaît jamais chez B", async () => {
    const a = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures A");
    const b = await signUpWithCompany(ctx.app, "b@example.fr", "Toitures B");
    await ctx.app.get(CompanyMemory).set(await tenantOf(a.companyId), { kind: "product", key: "slot:faitiere", value: "edilians-faitiere-angulaire-710", projectId: null });

    const viewA = (await projectWith(a.agent, D2026_015_LINES)).view;
    const viewB = (await projectWith(b.agent, D2026_015_LINES)).view;
    // Chez A : le produit habituel remplace la pièce par défaut, et la preuve le dit (« votre entreprise »).
    expect(viewA.decisions.some((d) => d.question?.key === "product:faitiere")).toBe(false);
    const faitieres = viewA.items.find((i) => i.id === "faitieres")!;
    expect(faitieres.proof.find((p) => p.key === "product")?.origin).toBe("company");
    // Chez B : rien de A ; la pièce par défaut du référentiel, dite comme hypothèse.
    expect(viewB.items.find((i) => i.id === "faitieres")!.proof.find((p) => p.key === "product")?.origin).toBe("assumption");
    expect(viewB.items.some((i) => i.proof.some((p) => p.key === "product" && p.origin === "company"))).toBe(false);
    expect(JSON.stringify(viewB)).not.toContain("Préférence de votre entreprise");
  });
});

describe("socle en trois niveaux sur D-2026-015 : lu dans le devis → il faut → à commander", () => {
  interface Ouvrage {
    lineId: string;
    designation: string;
    role: string | null;
    read: { quantity: string | null; unit: string | null };
    needs: { slot: string; label: string; origin: string; need: { value: string; unit: string } | null; order: unknown; missing: string | null; state: string }[];
    direct: { quantity: string; unit: string } | null;
    state: string;
  }
  const ouvrage = (view: View & { ouvrages: Ouvrage[] }, start: string) => view.ouvrages.find((o) => o.designation.startsWith(start))!;

  it("le rôle de chaque quantité est ENREGISTRÉ avec la ligne : mesure d'ouvrage ou à commander", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "c@example.fr", "Toitures Martin");
    const { takeoffId } = await projectWith(agent, D2026_015_LINES);
    const rows = await ctx.prisma.takeoffLine.findMany({ where: { takeoffId }, orderBy: { position: "asc" } });
    expect(rows.map((r) => [r.designation.split(" (")[0], r.role])).toEqual([
      ["Écran de sous-toiture respirant", "measure"],
      ["Contre-lattage en liteaux 27x40", "measure"],
      ["Lattage en liteaux 27x40 pour tuiles HP10", "measure"],
      ["Couverture en tuiles terre cuite HP10 rouge", "measure"],
      ["Rives de toit", "measure"],
      ["Faîtage", "measure"],
      ["Gouttière PVC de 25 sable", "measure"],
      ["Descente d'eau pluviale PVC Ø80 avec coudes", "measure"],
      ["Chatières de ventilation", "purchase"],
      // Une sortie de toit est un ouvrage compté (embase, chapeau, collerette : réponse du fondateur, 2026-10-04).
      ["Sortie de toit Poujoulat", "measure"],
    ]);
  });

  it("120 m² de lattage reste 120 m² de toiture ; les liteaux se calculent en mètres avec l'hypothèse de pureau, jamais 120 ml", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "c@example.fr", "Toitures Martin");
    const { view, purchase } = await projectWith(agent, D2026_015_LINES);
    const v = view as View & { ouvrages: Ouvrage[] };
    const lattage = ouvrage(v, "Lattage");
    expect(lattage).toMatchObject({ role: "measure", read: { quantity: "120", unit: "m²" }, direct: null, state: "verified" });
    // 120 / 0,31 (pureau mini du fabricant, zone littorale par défaut) + 5 % = 406,45 ml.
    expect(lattage.needs).toEqual([expect.objectContaining({ slot: "liteau", need: { value: "406.45", unit: "ml" }, state: "verified" })]);
    expect(JSON.stringify(v)).not.toMatch(/"120 m"|"120 ml"/);
    // La liste d'achats réunit lattage et contre-lattage en UNE ligne de liteaux 27×40, et dit ses hypothèses.
    expect(purchase.toBuy.find((b) => b.needIds.includes("liteaux"))).toMatchObject({ quantity: "547 ml", needIds: ["liteaux", "contre-liteaux"] });
    expect(purchase.assumptions.map((a) => a.key)).toEqual(expect.arrayContaining(["param:zone", "param:pente", "param:pureau"]));
    expect(purchase.understood[0]).toBe("Couverture en tuiles à emboîtement sur liteaux : 120 m²");
  });

  it("2 descentes deviennent 8 m de tube, 4 coudes et 8 colliers ; 20 m de gouttière deviennent 5 longueurs, 50 crochets, 2 naissances — et c'est cette liste qui part au fournisseur", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "c@example.fr", "Toitures Martin");
    const { takeoffId, projectId } = await projectWith(agent, D2026_015_LINES);
    // La pose des crochets de gouttière n'est pas au devis : le comptoir la demande (§47.8).
    const v = (await agent.post(`/v1/takeoffs/${takeoffId}/answers`).send({ key: "param:fixation_crochet", value: { value: "2", unit: "u" } }).expect(200)).body.view as View & { ouvrages: Ouvrage[] };
    const descente = ouvrage(v, "Descente");
    expect(descente).toMatchObject({ role: "measure", direct: null, state: "verified" });
    expect(descente.needs.map((n) => [n.slot, n.need?.value]).sort()).toEqual([["collier", "8"], ["coude", "4"], ["tube", "8"]]);
    const gouttiere = ouvrage(v, "Gouttière");
    expect(gouttiere.needs.map((n) => [n.slot, n.need?.value]).sort()).toEqual([["crochet", "50"], ["naissance", "2"], ["profil", "20"]]);

    // Partie chez le fournisseur : la liste d'achats, jamais « 2 unités d'ouvrage ».
    const answered = await agent.post(`/v1/takeoffs/${takeoffId}/answers`).send({ key: "product:tuile", value: "edilians-hp10-huguenot" }).expect(200);
    // Le devis ne dit ni le diamètre ni l'usage de la sortie de toit : deux questions à boutons.
    expect((answered.body.view.decisions as { key: string }[]).map((d) => d.key)).toEqual(["engine:param:diametre_sortie", "engine:param:usage_sortie"]);
    await agent.post(`/v1/takeoffs/${takeoffId}/answers`).send({ key: "param:diametre_sortie", value: { value: "150", unit: "mm" } }).expect(200);
    const precised = await agent.post(`/v1/takeoffs/${takeoffId}/answers`).send({ key: "param:usage_sortie", value: { value: "1", unit: "u" } }).expect(200);
    expect((precised.body.purchase.toBuy as { label: string; precision?: string | null }[]).filter((b) => /sortie|collerette/i.test(b.label)).map((b) => [b.label, b.precision])).toEqual([
      ["Embase plomb de sortie de toit", "Ø 150, pour ardoise ou tuile"],
      ["Chapeau de sortie de toit", "Ø 150"],
      ["Collerette d'étanchéité", "Ø 150, solin du conduit de fumée"],
    ]);
    await agent.post(`/v1/takeoffs/${takeoffId}/validate`).expect(200);
    const s = await agent.post("/v1/suppliers").send({ name: "Point.P", email: "devis@pointp.fr" });
    const created = await agent.post(`/v1/projects/${projectId}/price-requests`).send({ supplierIds: [s.body.id] }).expect(201);
    // §45.3 : une ligne par article dans « Fournitures à chiffrer », au format « article : quantité de vente ».
    const body = (created.body.packet.articles as string[]).join("\n");
    expect(body).toMatch(/Tuiles HP10 rouge : 1 488 pièces/);
    expect(body).toMatch(/Tubes de descente.*: 8 ml/);
    expect(body).toMatch(/Coudes de descente PVC sable Ø80 : 4 pièces/);
    expect(body).toMatch(/Gouttière.*: 5 longueurs de 4 m/);
    expect(body).toMatch(/Chatières.*: 10 unités$/m);
    expect(body).not.toMatch(/quantité à calculer/);
    // Marchandise seule (retour du fondateur, 2026-10-04) : ni la liste ni le détail du devis ne parlent de pose.
    expect(JSON.stringify(created.body.packet)).not.toMatch(/\bpose\b|F\s*&\s*P\b/i);
  });

  it("après modèle et pureau : 1 345 tuiles (+3 %) et 367,35 ml de liteaux (+5 %) calculés, sans nouvel appel IA", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "c@example.fr", "Toitures Martin");
    const { takeoffId, projectId } = await projectWith(agent, D2026_015_LINES);
    const before = await ctx.prisma.aiExecution.count();
    await agent.post(`/v1/takeoffs/${takeoffId}/answers`).send({ key: "product:tuile", value: "edilians-hp10-huguenot" }).expect(200);
    await agent.post(`/v1/takeoffs/${takeoffId}/answers`).send({ key: "param:fixation_crochet", value: { value: "2", unit: "u" } }).expect(200);
    const after = (await agent.post(`/v1/takeoffs/${takeoffId}/answers`).send({ key: "param:pureau", value: { value: "34.3", unit: "cm" } }).expect(200)).body.view as View & { ouvrages: Ouvrage[] };
    await getView(agent, projectId);
    expect(await ctx.prisma.aiExecution.count()).toBe(before);
    const tuiles = ouvrage(after, "Couverture").needs.find((n) => n.slot === "tuile")!;
    expect(tuiles).toMatchObject({ need: { value: "1344.59", unit: "u" }, order: { count: "1345" }, provisional: false, state: "verified" });
    expect(ouvrage(after, "Lattage").needs.find((n) => n.slot === "liteau")).toMatchObject({ need: { value: "367.35", unit: "ml" }, provisional: false });
    for (const start of ["Gouttière", "Descente"]) expect(ouvrage(after, start).state).toBe("verified");
  });
});

describe("ouvrages comptés : « 6 unités » de jouées n'est jamais 6 ardoises", () => {
  const ARDOISES: BenchLine[] = [
    { ref: "l1", designation: "Couverture en ardoises naturelles 30x22 posées au crochet", quantity: "200", unit: "m²", truth: "C" },
    { ref: "l2", designation: "Ardoises pour jouées de lucarnes", quantity: "6", unit: "unités", truth: "C" },
    { ref: "l3", designation: "Entourage de cheminée zinc et solin", quantity: "2", unit: "unités", truth: "C" },
    { ref: "l4", designation: "Chatières de ventilation", quantity: "12", unit: "unités", truth: "D" },
  ];

  it("une question tranche l'ambiguïté ; la liste ne se valide pas avant ; la réponse est enregistrée et part juste chez le fournisseur", async () => {
    const { agent, companyId } = await signUpWithCompany(ctx.app, "c@example.fr", "Toitures Martin");
    const { projectId, takeoffId, view } = await projectWith(agent, ARDOISES);
    const question = view.decisions.find((d) => d.key.startsWith("role:"))!;
    expect(question.question).toMatchObject({ kind: "choose" });
    expect(question.text).toBe("6 : c'est le nombre d'ardoises à commander, ou le nombre de jouées ?");
    // Rien ne part avec une ambiguïté qui change la commande.
    expect((await agent.post(`/v1/takeoffs/${takeoffId}/validate`)).status).toBe(400);

    const answered = (await agent.post(`/v1/takeoffs/${takeoffId}/answers`).send({ key: question.question!.key, value: "measure" }).expect(200)).body;
    expect(answered.view.decisions.some((d: { key: string }) => d.key.startsWith("role:"))).toBe(false);
    const line = answered.lines.find((l: { designation: string }) => l.designation.startsWith("Ardoises pour jouées"));
    expect(line).toMatchObject({ role: "measure", basis: "work" });
    expect((await ctx.prisma.takeoffLine.findUniqueOrThrow({ where: { id: line.id } })).role).toBe("measure");
    // Une réponse hors des deux lectures est refusée.
    expect((await agent.post(`/v1/takeoffs/${takeoffId}/answers`).send({ key: question.question!.key, value: "autre" })).status).toBe(400);

    // Les questions de la cheminée (façonnage, périmètre) restent ouvertes : rien ne part encore (retour du fondateur,
    // 2026-10-05 : une liste avec une question ouverte ne part pas, dans aucun métier).
    let open = answered.view.decisions.filter((d: { question?: { key: string } | null }) => d.question);
    expect(open.length).toBeGreaterThan(0);
    expect((await agent.post(`/v1/takeoffs/${takeoffId}/validate`)).status).toBe(400);
    // L'artisan répond à tout (premier bouton), puis la liste part.
    for (let round = 0; round < 6 && open.length > 0; round++) {
      let body = answered;
      for (const d of open as { question: { key: string; kind: string; unit?: string; options?: { value: string }[] } }[]) {
        const first = d.question.options?.[0]?.value ?? "1";
        const value = d.question.kind === "param" ? { value: first, unit: d.question.unit ?? "u" } : first;
        body = (await agent.post(`/v1/takeoffs/${takeoffId}/answers`).send({ key: d.question.key, value }).expect(200)).body;
      }
      open = body.view.decisions.filter((d: { question?: unknown }) => d.question);
    }
    await agent.post(`/v1/takeoffs/${takeoffId}/validate`).expect(200);
    const s = await agent.post("/v1/suppliers").send({ name: "Point.P", email: "devis@pointp.fr" });
    const packet = (await agent.post(`/v1/projects/${projectId}/price-requests`).send({ supplierIds: [s.body.id] }).expect(201)).body.packet;
    // §45.3 bloc 3 « À préciser avec vous » : la ligne du devis, sa mesure, et une demande simple (jamais la cuisine interne).
    expect(packet.a_chiffrer).toContain("Ardoises pour jouées de lucarnes · 6 unités : merci de proposer ce que vous avez");
    // L'entourage de cheminée n'est plus « à préciser » : il attend ses réponses (façonnage, périmètre), puis se calcule (§7).
    expect(packet.a_chiffrer.join("\n")).not.toMatch(/Entourage de cheminée/);
    expect(packet.articles.join("\n")).toMatch(/Chatières de ventilation : 12 unités/);
    const events = await ctx.app.get(CorrectionJournal).list(await tenantOf(companyId), { projectId });
    expect(events.some((e) => e.action === "answer" && e.after?.designation === question.question!.key)).toBe(true);
  });
});

describe("mode validateur : n'ouvre que les règles en brouillon, jamais ✓", () => {
  let vctx: TestContext;
  beforeAll(async () => {
    const config = loadConfig();
    vctx = await createTestApp((b) => b.overrideProvider(CONFIG).useValue({ ...config, referentialValidators: ["fondateur@example.fr"] }));
  });
  afterAll(async () => {
    await vctx.app.close();
  });

  const levels = async (agent: Agent, projectId: string) =>
    ((await agent.get(`/v1/projects/${projectId}/takeoff`)).body.takeoff.view as { ouvrages: { designation: string; state: string; needs: { slot: string; need: { value: string; unit: string } | null; provisional: boolean; state: string }[] }[] }).ouvrages;

  it("règles validées : tout artisan voit 367,35 ml de liteaux, non provisoire ; un provisoire n'est jamais ✓", async () => {
    await resetDatabase(vctx.prisma);
    const run = async (email: string) => {
      const { agent } = await signUpWithCompany(vctx.app, email, `Toitures ${email}`);
      const project = await agent.post("/v1/projects").send({ name: "Chantier" });
      const doc = await agent
        .post(`/v1/projects/${project.body.id}/documents`)
        .field("purpose", "client_quote")
        .attach("file", Buffer.from(await makePdf(["devis"])), { filename: "devis.pdf", contentType: "application/pdf" });
      const takeoff = (await agent.post(`/v1/documents/${doc.body.id}/takeoff`)).body;
      for (const l of takeoff.lines) await agent.delete(`/v1/takeoff-lines/${l.id}`).expect(200);
      for (const l of D2026_015_LINES) await agent.post(`/v1/takeoffs/${takeoff.id}/lines`).send({ designation: l.designation, quantity: l.quantity, unit: l.unit }).expect(201);
      for (const [key, value] of [
        ["product:tuile", "edilians-hp10-huguenot"],
        ["param:pureau", { value: "34.3", unit: "cm" }],
      ] as const) await agent.post(`/v1/takeoffs/${takeoff.id}/answers`).send({ key, value }).expect(200);
      return levels(agent, project.body.id);
    };
    const founder = await run("fondateur@example.fr");
    const lattage = founder.find((o) => o.designation.startsWith("Lattage"))!.needs.find((n) => n.slot === "liteau")!;
    expect(lattage).toMatchObject({ need: { value: "367.35", unit: "ml" }, provisional: false });
    for (const o of founder) {
      for (const n of o.needs.filter((x) => x.provisional)) expect(n.state).not.toBe("verified");
    }
    const other = await run("autre@example.fr");
    expect(other.find((o) => o.designation.startsWith("Lattage"))!.needs.find((n) => n.slot === "liteau")).toMatchObject({ need: { value: "367.35", unit: "ml" }, provisional: false });
    // Hors mode validateur, aucun calcul provisoire.
    for (const o of other) for (const n of o.needs) expect(n.provisional).toBe(false);
  });
});
