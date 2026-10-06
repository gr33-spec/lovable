import type { CompletionWire } from "@baticlair/domain";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { loadConfig, type AppConfig } from "../src/platform/config/config.js";
import { CapturingPushSender } from "../src/platform/push/web-push.sender.js";
import { CONFIG, PUSH_SENDER } from "../src/platform/tokens.js";
import { QUANTITATIF_PASS, type QuantitatifPass } from "../src/modules/takeoff/application/quantitatif-pass.js";
import { TAKEOFF_EXTRACTOR, type ExtractionAttempt, type ExtractionRequest, type TakeoffExtractor } from "../src/modules/takeoff/application/takeoff-extractor.js";
import { FakeTakeoffExtractor } from "../src/modules/takeoff/infrastructure/fake-takeoff-extractor.js";
import type { ReadAttempt } from "../src/platform/ai/document-reader.js";
import { makePdf } from "./support/pdf-fixtures.js";
import { createTestApp, resetDatabase, signUpWithCompany, type Agent, type TestContext } from "./support/test-app.js";

/**
 * §48 : « VA BOIRE UN CAFÉ, JE TE PRÉVIENS QUAND C'EST PRÊT » (retour de Greg : la notification n'arrivait pas). La page
 * seule ne prévient que si elle tourne encore ; téléphone verrouillé, elle dort. C'est donc le SERVEUR qui prévient :
 * une lecture ou un calcul passé en arrière-plan envoie, en finissant, une notification (Web Push) à chaque appareil
 * abonné de la personne qui l'a lancé. Rien pour les autres ; rien quand la réponse est arrivée tout de suite.
 */
class Gate {
  private release!: () => void;
  private gate = new Promise<void>((r) => (this.release = r));
  open() {
    this.release();
  }
  reset() {
    this.gate = new Promise<void>((r) => (this.release = r));
  }
  wait() {
    return this.gate;
  }
}

class GatedExtractor implements TakeoffExtractor {
  readonly provider = "anthropic";
  readonly gate = new Gate();
  private inner = new FakeTakeoffExtractor();
  async extract(request: ExtractionRequest): Promise<ExtractionAttempt> {
    await this.gate.wait();
    return this.inner.extract(request);
  }
}

class GatedPass implements QuantitatifPass {
  readonly provider = "anthropic";
  readonly gate = new Gate();
  async complete(): Promise<ReadAttempt<CompletionWire>> {
    await this.gate.wait();
    return { provider: "anthropic", model: "claude-sonnet-5-5", usage: { inputTokens: 10, outputTokens: 10 }, status: "success", output: { ajouts: [], doutes: [] }, errorCode: null, durationMs: 1 };
  }
}

const extractor = new GatedExtractor();
const pass = new GatedPass();
const push = new CapturingPushSender("x".repeat(40));
let ctx: TestContext;
beforeAll(async () => {
  const base = loadConfig({ ...process.env, AI_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "sk-test", AI_QUANTITATIF: "on" });
  const config: AppConfig = { ...base, ai: { ...base.ai, answerWithinMs: 1500 } };
  ctx = await createTestApp((b) =>
    b.overrideProvider(CONFIG).useValue(config).overrideProvider(TAKEOFF_EXTRACTOR).useValue(extractor).overrideProvider(QUANTITATIF_PASS).useValue(pass).overrideProvider(PUSH_SENDER).useValue(push),
  );
});
afterAll(async () => {
  await ctx.app.close();
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
  extractor.gate.reset();
  pass.gate.reset();
  push.sent.length = 0;
});

const device = (n: number) => ({ endpoint: `https://push.example.net/send/${n}`, keys: { p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM", auth: "tBHItJI5svbpez7KI4CCXg" } });

async function until(done: () => boolean) {
  for (let i = 0; i < 200 && !done(); i++) await new Promise((r) => setTimeout(r, 25));
  expect(done()).toBe(true);
}

async function deposit(agent: Agent) {
  const project = await agent.post("/v1/projects").send({ name: "Toiture Dupont" });
  const doc = await agent
    .post(`/v1/projects/${project.body.id}/documents`)
    .field("purpose", "client_quote")
    .attach("file", Buffer.from(await makePdf(["devis"])), { filename: "devis.pdf", contentType: "application/pdf" });
  return { projectId: project.body.id as string, documentId: doc.body.id as string };
}

describe("je te préviens quand c'est prêt : le serveur envoie la notification", () => {
  it("la clé publique est stable ; un appareil s'abonne ; une adresse non https est refusée", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const key = (await agent.get("/v1/me/notifications/push-key")).body.publicKey as string;
    expect(key).toMatch(/^[A-Za-z0-9_-]{87}$/);
    expect((await agent.get("/v1/me/notifications/push-key")).body.publicKey).toBe(key);
    expect((await agent.post("/v1/me/notifications/push").send(device(1))).body).toEqual({ subscribed: true });
    expect((await agent.post("/v1/me/notifications/push").send({ ...device(2), endpoint: "http://push.example.net/x" })).status).toBe(400);
    // Le même appareil réabonné ne fait pas deux notifications.
    await agent.post("/v1/me/notifications/push").send(device(1));
    expect(await ctx.prisma.pushSubscription.count()).toBe(1);
  });

  it("lecture longue, puis calcul long : « Ton devis est lu », puis « Ta liste est prête », sur les appareils de la personne seulement", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "greg@example.fr", "Toitures Martin");
    const other = (await signUpWithCompany(ctx.app, "autre@example.fr", "Autre Toiture")).agent;
    await agent.post("/v1/me/notifications/push").send(device(1));
    await agent.post("/v1/me/notifications/push").send(device(2));
    await other.post("/v1/me/notifications/push").send(device(3));
    const { projectId, documentId } = await deposit(agent);

    // Lecture trop longue pour une réponse : elle continue ; en finissant, le serveur prévient.
    expect((await agent.post(`/v1/documents/${documentId}/takeoff`)).status).toBe(202);
    expect(push.sent).toHaveLength(0);
    extractor.gate.open();
    await until(() => push.sent.length === 2);
    expect(push.sent.map((s) => s.target.endpoint).sort()).toEqual([device(1).endpoint, device(2).endpoint]);
    expect(push.sent[0]!.message).toEqual({ title: "Ton devis est lu", body: "J'ai quelques questions pour toi avant de calculer.", url: `/chantiers/${projectId}`, tag: `chantier-${projectId}` });

    // Calcul (appel IA n° 2) trop long : « Va boire un café » ; la liste prête, le serveur prévient.
    push.sent.length = 0;
    const q = (await agent.get(`/v1/quantitatifs?projetId=${projectId}`)).body.items[0] as { id: string };
    expect((await agent.post(`/v1/quantitatifs/${q.id}/calcul`).send({ reponses: [] })).body.phase).toBe("calcul");
    pass.gate.open();
    await until(() => push.sent.length === 2);
    expect(push.sent[0]!.message.title).toBe("Ta liste est prête");
    expect(push.sent.every((s) => s.target.endpoint !== device(3).endpoint)).toBe(true);
  });

  it("une réponse arrivée tout de suite ne notifie pas", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "b@example.fr", "Toitures Martin");
    await agent.post("/v1/me/notifications/push").send(device(1));
    extractor.gate.open();
    pass.gate.open();
    const { projectId, documentId } = await deposit(agent);
    expect((await agent.post(`/v1/documents/${documentId}/takeoff`)).status).toBe(201);
    const q = (await agent.get(`/v1/quantitatifs?projetId=${projectId}`)).body.items[0] as { id: string };
    expect((await agent.post(`/v1/quantitatifs/${q.id}/calcul`).send({ reponses: [] })).body.phase).toBe("resultat");
    await new Promise((r) => setTimeout(r, 100));
    expect(push.sent).toHaveLength(0);
  });
});
