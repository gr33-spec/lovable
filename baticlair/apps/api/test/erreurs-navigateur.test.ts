/**
 * Audit avant commercialisation (2026-10-11) : un écran qui casse chez un artisan doit se savoir. L'application web
 * signale l'erreur (`POST /v1/client-errors`), l'API la journalise et prévient l'équipe par le canal des alertes (B5),
 * au plus une fois toutes les 10 minutes ; jamais de donnée de client : le message est court, sans e-mail ni chiffres
 * longs, et les identifiants de l'adresse sont masqués.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { Alerter, AlertKind } from "../src/platform/alerts/alerter.js";
import { ALERTER } from "../src/platform/tokens.js";
import { createTestApp, resetDatabase, WEB_ORIGIN, type TestContext } from "./support/test-app.js";

let ctx: TestContext;
const sent: { kind: AlertKind; message: string }[] = [];
const alerter: Alerter = { enabled: true, alert: (kind, message) => void sent.push({ kind, message }) };
beforeAll(async () => {
  ctx = await createTestApp((b) => b.overrideProvider(ALERTER).useValue(alerter));
});
afterAll(async () => {
  await ctx.app.close();
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
  sent.length = 0;
});

describe("erreurs du navigateur", () => {
  it("une erreur d'écran prévient l'équipe, sans donnée de client", async () => {
    const res = await request(ctx.app.getHttpServer())
      .post("/v1/client-errors")
      .set("origin", WEB_ORIGIN)
      .send({
        message: "Cannot read properties of undefined (reading 'lines') pour greg@batiinvest.fr au 0612345678",
        digest: "1234567",
        path: "/chantiers/01a129b5-005f-730d-9ae1-666ddfd4da8c?vue=fournitures",
      });
    expect(res.status).toBe(204);
    expect(sent).toHaveLength(1);
    expect(sent[0]!.kind).toBe("client_error");
    expect(sent[0]!.message).toContain("Cannot read properties of undefined (reading 'lines')");
    expect(sent[0]!.message).toContain("/chantiers/:id");
    expect(sent[0]!.message).not.toMatch(/batiinvest|0612345678|01a129b5|vue=/);
  });

  it("un corps invalide ou trop long est refusé ou coupé, jamais une 500", async () => {
    const api = request(ctx.app.getHttpServer());
    expect((await api.post("/v1/client-errors").set("origin", WEB_ORIGIN).send({})).status).toBe(400);
    const long = await api.post("/v1/client-errors").set("origin", WEB_ORIGIN).send({ message: "x".repeat(5000), path: "/" });
    expect(long.status).toBe(204);
    expect(sent.at(-1)!.message.length).toBeLessThan(400);
  });
});
