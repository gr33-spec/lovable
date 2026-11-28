import { generateKeyPairSync, sign, type KeyObject } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { AlertKind, Alerter } from "../src/platform/alerts/alerter.js";
import { ALERTER } from "../src/platform/tokens.js";
import { AUDIENCE_SAUVEGARDE, EMETTEUR_GITHUB, verifierJetonGithub } from "../src/modules/sauvegarde/application/jeton-github.js";
import { SauvegardeService } from "../src/modules/sauvegarde/application/sauvegarde.service.js";
import { LECTEUR_CLES_GITHUB } from "../src/modules/sauvegarde/index.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * LA SAUVEGARDE PRÉVIENT ELLE-MÊME (Greg, 28 novembre 2026) : le workflow « Sauvegarde de la base » envoie son résultat à
 * l'API avec le jeton signé de GitHub ; un échec (test de restauration compris) part par les alertes de Mobiiz ; un faux
 * rapport est refusé ; un essai depuis une autre branche prévient sans compter ; la veille prévient après 36 h sans réussite.
 * Les clés de GitHub sont remplacées par une clé de test : rien ne sort sur le réseau.
 */
const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const pirate = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey;
const jwk = { ...(publicKey.export({ format: "jwk" }) as Record<string, string>), kid: "cle-test", alg: "RS256", use: "sig" };
const lireCles = async () => [jwk];

const maintenant = () => Math.floor(Date.now() / 1000);
function jeton(claims: Record<string, unknown> = {}, cle: KeyObject = privateKey, kid = "cle-test") {
  const b = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const corps = {
    iss: EMETTEUR_GITHUB, aud: AUDIENCE_SAUVEGARDE, repository: "gr33-spec/lovable", repository_owner: "gr33-spec",
    workflow_ref: "gr33-spec/lovable/.github/workflows/sauvegarde-base.yml@refs/heads/main", ref: "refs/heads/main", run_id: "123456",
    iat: maintenant(), nbf: maintenant(), exp: maintenant() + 300, ...claims,
  };
  const debut = `${b({ alg: "RS256", typ: "JWT", kid })}.${b(corps)}`;
  return `${debut}.${sign("RSA-SHA256", Buffer.from(debut), cle).toString("base64url")}`;
}

describe("le jeton de GitHub : seul notre workflow peut écrire", () => {
  it("accepte le vrai, sur main ; une autre branche est un essai", async () => {
    expect(await verifierJetonGithub(jeton(), lireCles)).toEqual({ runId: "123456", ref: "refs/heads/main", essai: false });
    const essai = await verifierJetonGithub(jeton({ ref: "refs/heads/claude/x", workflow_ref: "gr33-spec/lovable/.github/workflows/sauvegarde-base.yml@refs/heads/claude/x" }), lireCles);
    expect(essai.essai).toBe(true);
  });
  it.each([
    ["signé par une autre clé", () => jeton({}, pirate)],
    ["clé inconnue", () => jeton({}, privateKey, "autre")],
    ["autre dépôt", () => jeton({ repository: "pirate/lovable", repository_owner: "pirate" })],
    ["autre workflow du dépôt", () => jeton({ workflow_ref: "gr33-spec/lovable/.github/workflows/ci.yml@refs/heads/main" })],
    ["autre audience", () => jeton({ aud: "autre" })],
    ["autre émetteur", () => jeton({ iss: "https://faux.example" })],
    ["expiré", () => jeton({ exp: maintenant() - 600, iat: maintenant() - 900 })],
    ["illisible", () => "pas.un.jeton"],
    ["vide", () => ""],
  ])("refuse un jeton %s", async (_nom, fabriquer) => {
    await expect(verifierJetonGithub(fabriquer(), lireCles)).rejects.toThrow();
  });
  it("refuse « alg: none » même avec un corps parfait", async () => {
    const b = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const vrai = jeton().split(".")[1];
    await expect(verifierJetonGithub(`${b({ alg: "none", kid: "cle-test" })}.${vrai}.`, lireCles)).rejects.toThrow();
  });
});

describe("par l'API : le rapport, l'alerte, la veille", () => {
  let ctx: TestContext;
  const alertes: { kind: AlertKind; message: string }[] = [];
  const alerter: Alerter = { enabled: true, alert: (kind, message) => void alertes.push({ kind, message }) };
  const srv = () => request(ctx.app.getHttpServer());
  const envoyer = (corps: object, j = jeton()) => srv().post("/v1/internal/sauvegarde").set("authorization", `Bearer ${j}`).send(corps);
  const avant = process.env.CRON_SECRET;

  beforeAll(async () => {
    process.env.CRON_SECRET = "secret-de-la-veille-123";
    ctx = await createTestApp((b) => b.overrideProvider(LECTEUR_CLES_GITHUB).useValue(lireCles).overrideProvider(ALERTER).useValue(alerter));
  });
  afterAll(async () => {
    process.env.CRON_SECRET = avant;
    await ctx.app.close();
  });
  beforeEach(async () => {
    await resetDatabase(ctx.prisma);
    alertes.length = 0;
  });

  it("sans jeton, ou avec un faux : refusé, rien d'écrit, aucune alerte", async () => {
    await srv().post("/v1/internal/sauvegarde").send({ statut: "echec" }).expect(403);
    await envoyer({ statut: "reussie" }, jeton({}, pirate)).expect(403);
    await envoyer({ statut: "reussie" }, jeton({ repository: "pirate/lovable", repository_owner: "pirate" })).expect(403);
    expect(await ctx.prisma.sauvegardeRapport.count()).toBe(0);
    expect(alertes).toEqual([]);
  });

  it("un échec du test de restauration : l'alerte Mobiiz part, avec l'étape et le lien ; une seconde fois le même run, rien", async () => {
    await envoyer({ statut: "echec", etape: "Test de restauration" }).expect(200);
    expect(alertes).toHaveLength(1);
    expect(alertes[0]!.kind).toBe("sauvegarde_echec");
    expect(alertes[0]!.message).toContain("« Test de restauration »");
    expect(alertes[0]!.message).toContain("https://github.com/gr33-spec/lovable/actions/runs/123456");
    expect(alertes[0]!.message).toContain("Aucune sauvegarde réussie n'est encore connue");
    await envoyer({ statut: "echec", etape: "Test de restauration" }).expect(200);
    expect(alertes).toHaveLength(1);
  });

  it("après un échec, la réussite suivante dit « rétablie » ; une réussite ordinaire ne dit rien", async () => {
    await envoyer({ statut: "reussie", tables: 90, lignes: 1000, octets: 2_000_000 }, jeton({ run_id: "1" })).expect(200);
    expect(alertes).toEqual([]);
    await envoyer({ statut: "echec", etape: "Export et relecture" }, jeton({ run_id: "2" })).expect(200);
    expect(alertes[0]!.message).toContain("Dernière sauvegarde réussie : le ");
    await envoyer({ statut: "reussie", tables: 90, lignes: 1001, octets: 2_000_000 }, jeton({ run_id: "3" })).expect(200);
    expect(alertes[1]).toMatchObject({ kind: "sauvegarde_info" });
    expect(alertes[1]!.message).toContain("rétablie");
    expect(alertes[1]!.message).toContain("90 tables, 1001 lignes, 1,9 Mo");
  });

  it("un essai depuis une autre branche : il prévient (ESSAI), mais ne compte jamais comme une sauvegarde", async () => {
    const essai = jeton({ run_id: "77", ref: "refs/heads/claude/upbeat-tesla-blyocz", workflow_ref: "gr33-spec/lovable/.github/workflows/sauvegarde-base.yml@refs/heads/claude/upbeat-tesla-blyocz" });
    await envoyer({ statut: "echec", etape: "Échec volontaire (essai de l'alerte)" }, essai).expect(200);
    expect(alertes).toHaveLength(1);
    expect(alertes[0]!.kind).toBe("sauvegarde_info");
    expect(alertes[0]!.message).toContain("essai de l'alerte de la sauvegarde nocturne");
    // Rien qui ressemble à un indésirable (Greg, 28 novembre 2026, Hotmail) : ni majuscules criées, ni lien, ni nom de branche.
    expect(alertes[0]!.message).not.toMatch(/ESSAI|https?:|claude\//);
    const etat = await ctx.app.get(SauvegardeService).etat();
    expect(etat.derniere).toBeNull();
    expect(etat.dernierEssai?.statut).toBe("echec");
  });

  it("la veille : rien avant le premier vrai rapport ; puis, 36 h sans réussite, l'alerte part", async () => {
    const veille = () => srv().get("/v1/internal/sauvegarde/veille").set("authorization", "Bearer secret-de-la-veille-123");
    await srv().get("/v1/internal/sauvegarde/veille").expect(403);
    expect((await veille().expect(200)).body).toEqual({ enRetard: false });
    await ctx.prisma.sauvegardeRapport.create({ data: { statut: "reussie", runId: "9", ref: "refs/heads/main", recuLe: new Date(Date.now() - 37 * 3_600_000) } });
    expect((await veille().expect(200)).body).toEqual({ enRetard: true });
    expect(alertes[0]).toMatchObject({ kind: "sauvegarde_echec" });
    expect(alertes[0]!.message).toContain("aucune sauvegarde réussie depuis le ");
    await ctx.prisma.sauvegardeRapport.create({ data: { statut: "reussie", runId: "10", ref: "refs/heads/main" } });
    expect((await veille().expect(200)).body).toEqual({ enRetard: false });
  });

  it("l'état pour la carte « Santé » : réservé à l'équipe", async () => {
    const { agent: artisan } = await signUpWithCompany(ctx.app, "artisan-sauvegarde@example.com", "Toits Test");
    await srv().get("/v1/admin/sauvegarde").expect(401);
    await artisan.get("/v1/admin/sauvegarde").expect(403);
  });
});
