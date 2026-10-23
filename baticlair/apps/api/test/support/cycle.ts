import request, { type Response as SupertestResponse } from "supertest";
import { makePdf, type FixtureRow } from "./pdf-fixtures.js";
import { signUpWithCompany, type TestContext } from "./test-app.js";

/** Les briques d'un cycle de commande commune en test : un couvreur avec sa liste, la tâche, le dépôt d'une grille. */
export const ARDOISE = "Ardoise naturelle 32×22 Espagne 1er choix";
export const LITEAU = "Liteau sapin traité 27×38";
export const CROCHET = "Crochet inox 100 mm";
export const SIRET_ARTISAN = "73282932000074";

export async function couvreurAvecListe(ctx: TestContext, email: string, nom: string, adresse: string, lignes: { libelle: string; quantite: string; unite: string }[], telephone: string | null = null) {
  const { agent, companyId } = await signUpWithCompany(ctx.app, email, nom, ["roofing"]);
  await ctx.prisma.company.update({ where: { id: companyId }, data: { siret: SIRET_ARTISAN, siretVerifieLe: new Date() } });
  await agent.patch("/v1/company/profile").send({ name: nom, address: adresse, siret: SIRET_ARTISAN, phone: telephone, email: null }).expect(200);
  const q = (await agent.post("/v1/quantitatifs").send({ lignes }).expect(201)).body as { id: string; projetId: string };
  await agent.patch(`/v1/projects/${q.projetId}`).send({ address: adresse }).expect(200);
  const toBuy = (await agent.get(`/v1/projects/${q.projetId}/takeoff`).expect(200)).body.takeoff.purchase.toBuy as { key: string; label: string }[];
  return { agent, companyId, projectId: q.projetId, articles: toBuy.map((b) => b.key), email };
}

export const tacheDuMois = (ctx: TestContext, maintenant: string) =>
  request(ctx.app.getHttpServer()).get(`/v1/internal/commande-du-mois?maintenant=${encodeURIComponent(maintenant)}`).set("authorization", `Bearer ${process.env.CRON_SECRET}`).expect(200);

export const mailsVers = (ctx: TestContext, email: string) => ctx.emails.sent.filter((m) => m.to.toLowerCase() === email.toLowerCase());
export const jetonDeGrille = (ctx: TestContext, email: string) => /\/grille\/([A-Za-z0-9_-]+)/.exec(mailsVers(ctx, email).filter((m) => /\/grille\//.test(m.text)).at(-1)!.text)![1]!;

export async function deposerGrille(ctx: TestContext, jeton: string, rows: FixtureRow[], maintenant: string, options: { nonGarantis?: string[]; fermes?: boolean } = {}): Promise<SupertestResponse> {
  const pdf = Buffer.from(await makePdf(["devis"], rows, "Total HT 1 000,00", "DEVIS"));
  let req = request(ctx.app.getHttpServer()).post(`/v1/grille/${jeton}?maintenant=${encodeURIComponent(maintenant)}`).field("fermes", options.fermes === false ? "non" : "oui");
  for (const c of options.nonGarantis ?? []) req = req.field("nonGarantis", c);
  return req.attach("file", pdf, { filename: "devis.pdf", contentType: "application/pdf" });
}
