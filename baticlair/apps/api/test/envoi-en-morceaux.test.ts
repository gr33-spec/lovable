import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { UploadParts } from "../src/modules/documents/index.js";
import { makePdf } from "./support/pdf-fixtures.js";
import { createTestApp, resetDatabase, signUpWithCompany, type Agent, type TestContext } from "./support/test-app.js";

/**
 * Un devis scanné dépasse souvent les 4,5 Mo qu'accepte une requête chez l'hébergeur (Vercel) : le navigateur
 * l'envoie en morceaux, la requête de dépôt nomme l'envoi, le fichier est recollé à l'identique. Il se relit de même,
 * par plages (« Range »).
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

async function chantier(agent: Agent): Promise<string> {
  const res = await agent.post("/v1/projects").send({ name: "Toiture Dupont" });
  return res.body.id as string;
}

/** Comme le navigateur (`lib/upload.ts`) : morceaux numérotés, puis la requête de dépôt sans fichier. */
async function sendParts(agent: Agent, bytes: Uint8Array, size: number): Promise<{ uploadId: string; parts: number }> {
  const uploadId = randomUUID();
  const parts = Math.ceil(bytes.byteLength / size);
  // Dans le désordre : seul l'index compte.
  for (const i of Array.from({ length: parts }, (_, k) => parts - 1 - k)) {
    const res = await agent
      .put(`/v1/uploads/${uploadId}/parts/${i}`)
      .attach("file", Buffer.from(bytes.subarray(i * size, (i + 1) * size)), { filename: "morceau", contentType: "application/octet-stream" });
    expect(res.status).toBe(204);
  }
  return { uploadId, parts };
}

describe("fichier envoyé en morceaux", () => {
  it("recolle le devis à l'identique, le lit, efface les morceaux et le rend par plages", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const projectId = await chantier(agent);
    const pdf = await makePdf(["devis", "scan", "totaux"]);
    const { uploadId, parts } = await sendParts(agent, pdf, Math.ceil(pdf.byteLength / 3));
    expect(parts).toBe(3);

    const res = await agent
      .post(`/v1/projects/${projectId}/documents`)
      .field("purpose", "client_quote")
      .field("uploadId", uploadId)
      .field("parts", String(parts))
      .field("fileName", "Devis scanné é.pdf");
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: "Devis scanné é.pdf", status: "read", pageCount: 3, sizeBytes: pdf.byteLength });
    expect(await ctx.prisma.uploadPart.count()).toBe(0);

    const whole = await agent.get(`/v1/documents/${res.body.id}/file`).buffer(true);
    expect(Buffer.compare(whole.body as Buffer, Buffer.from(pdf))).toBe(0);
    expect(whole.headers["accept-ranges"]).toBe("bytes");

    const half = Math.floor(pdf.byteLength / 2);
    const first = await agent.get(`/v1/documents/${res.body.id}/file`).set("range", `bytes=0-${half - 1}`).buffer(true);
    expect(first.status).toBe(206);
    expect(first.headers["content-range"]).toBe(`bytes 0-${half - 1}/${pdf.byteLength}`);
    const rest = await agent.get(`/v1/documents/${res.body.id}/file`).set("range", `bytes=${half}-`).buffer(true);
    expect(rest.status).toBe(206);
    expect(Buffer.compare(Buffer.concat([first.body as Buffer, rest.body as Buffer]), Buffer.from(pdf))).toBe(0);
    const beyond = await agent.get(`/v1/documents/${res.body.id}/file`).set("range", `bytes=${pdf.byteLength}-`);
    expect(beyond.status).toBe(416);
  });

  it("refuse un envoi incomplet, et l'envoi d'une autre entreprise", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const projectId = await chantier(agent);
    const pdf = await makePdf(["devis", "totaux"]);
    const { uploadId } = await sendParts(agent, pdf, Math.ceil(pdf.byteLength / 2));

    const incomplete = await agent.post(`/v1/projects/${projectId}/documents`).field("purpose", "client_quote").field("uploadId", uploadId).field("parts", "3");
    expect(incomplete.status).toBe(400);

    const other = await signUpWithCompany(ctx.app, "b@example.fr", "Couverture Durand");
    const otherProject = await chantier(other.agent);
    const stolen = await other.agent.post(`/v1/projects/${otherProject}/documents`).field("purpose", "client_quote").field("uploadId", uploadId).field("parts", "2");
    expect(stolen.status).toBe(400);
    const overwrite = await other.agent
      .put(`/v1/uploads/${uploadId}/parts/0`)
      .attach("file", Buffer.from("xx"), { filename: "morceau", contentType: "application/octet-stream" });
    expect(overwrite.status).toBe(400);

    const ok = await agent.post(`/v1/projects/${projectId}/documents`).field("purpose", "client_quote").field("uploadId", uploadId).field("parts", "2").field("fileName", "devis.pdf");
    expect(ok.status).toBe(201);
  });

  it("un croquis passe aussi en morceaux", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    const projectId = await chantier(agent);
    const pdf = await makePdf(["devis"]);
    const { uploadId, parts } = await sendParts(agent, pdf, Math.ceil(pdf.byteLength / 2));
    const res = await agent.post(`/v1/projects/${projectId}/infos/croquis`).field("uploadId", uploadId).field("parts", String(parts)).field("fileName", "plan.pdf");
    expect(res.status).toBe(201);
    expect(res.body.nom).toBe("plan.pdf");
  });

  it("la tâche quotidienne efface les morceaux abandonnés depuis plus de 24 h", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Toitures Martin");
    await sendParts(agent, await makePdf(["devis"]), 1_000_000);
    const uploads = ctx.app.get(UploadParts);
    expect(await uploads.purgeStale()).toBe(0);
    expect(await uploads.purgeStale(new Date(Date.now() + 25 * 3_600_000))).toBe(1);
  });
});
