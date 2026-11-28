import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, resetDatabase, signUpWithCompany, type Agent, type TestContext } from "./support/test-app.js";

/**
 * UNE VRAIE CONVERSATION, TOUJOURS OUVERTE (Greg, 28 novembre 2026, test réel sur iPhone : « En fin de parcours, j'ai voulu
 * écrire « Ajoute un Velux » : impossible de l'envoyer »). À tout moment : ajouter (l'article passe par le moteur, seules ses
 * questions sont posées, puis le calcul), retirer, changer une quantité. Aucune ligne ne disparaît sans qu'on la retire.
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

type Q = { id: string; texte: string; boutons?: { label: string; valeur: string }[] };
type Ecran = { phase: string; questions: Q[]; lignes: { id: string; libelle: string; quantite: string | number | null; texte?: string | null }[]; message?: string };

/** Répond à chaque question du moteur (premier bouton ; une longueur : 10 m), puis calcule, sans suggestion. */
async function jusquALaListe(agent: Agent, id: string, e: Ecran): Promise<Ecran> {
  for (let i = 0; i < 15 && e.phase === "questions"; i++) {
    const q = e.questions.find((x) => x.id.startsWith("engine:"));
    if (!q) break;
    const longueur = /longueur|surface|combien/i.test(q.texte) && !q.boutons?.length;
    const r = await agent.post(`/v1/quantitatifs/${id}/reponses?ecran=1`).send({ reponses: [{ question: q.id, valeur: longueur ? "10" : (q.boutons?.[0]?.valeur ?? null), ...(longueur ? { unite: "m" } : {}) }] });
    expect(r.status, JSON.stringify(r.body).slice(0, 300)).toBeLessThan(300);
    e = r.body as Ecran;
  }
  // L'étape « Suggestions » ne se présente qu'une fois par devis : on n'y répond que si elle est là.
  const suggestions = ((e as unknown as { ecran?: { suggestions?: unknown[] } }).ecran?.suggestions ?? []).length > 0;
  const fin = await agent.post(`/v1/quantitatifs/${id}/calcul?ecran=1`).send(suggestions ? { reponses: [{ question: "suggestions:choisies", valeur: "aucune" }] } : {});
  expect(fin.status, JSON.stringify(fin.body).slice(0, 300)).toBe(200);
  return fin.body as Ecran;
}
const noms = (e: Ecran) => e.lignes.map((l) => l.libelle);

describe("la conversation reste ouverte jusqu'à la liste finale", () => {
  it("« ajoute un velux 78x98 » après le calcul : rangé par le moteur, ses questions, puis la liste le compte ; rien d'autre ne bouge", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "ouverte@example.fr", "BATI INVEST");
    const res = await agent.post("/v1/quantitatifs?ecran=1").send({ dictee: "60 m² d'ardoise 32x22 et deux chatières" });
    expect(res.status).toBe(201);
    const id = res.body.id as string;
    const avant = await jusquALaListe(agent, id, res.body as Ecran);
    expect(avant.phase).toBe("resultat");
    const r = await agent.post(`/v1/quantitatifs/${id}/dire?ecran=1`).send({ texte: "ajoute un velux 78x98" });
    expect(r.status, JSON.stringify(r.body).slice(0, 300)).toBe(200);
    expect((r.body as Ecran).message).toMatch(/^C'est fait : ajouté/);
    const apres = await jusquALaListe(agent, id, r.body as Ecran);
    // Les lignes d'avant sont toutes là ; la fenêtre de toit en plus.
    for (const nom of noms(avant)) expect(noms(apres)).toContain(nom);
    expect(noms(apres).join(" | ")).toMatch(/fen[eê]tre|velux/i);
  }, 120_000);

  it("« retire les chatières » et « mets 3 chatières » : la ligne, et elle seule", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "ouverte2@example.fr", "BATI INVEST");
    const res = await agent.post("/v1/quantitatifs?ecran=1").send({ dictee: "60 m² d'ardoise 32x22 et deux chatières" });
    const id = res.body.id as string;
    const avant = await jusquALaListe(agent, id, res.body as Ecran);
    const mets = (await agent.post(`/v1/quantitatifs/${id}/dire?ecran=1`).send({ texte: "mets 3 chatières" }).expect(200)).body as Ecran;
    expect(mets.lignes.find((l) => /^Chatières/.test(l.libelle))?.quantite).toBe(3);
    const retire = (await agent.post(`/v1/quantitatifs/${id}/dire?ecran=1`).send({ texte: "retire les chatières" }).expect(200)).body as Ecran;
    expect(noms(retire).some((n) => /^Chatières/.test(n))).toBe(false);
    expect(noms(retire).length).toBe(noms(avant).length - 1);
  }, 120_000);

  it("couvreur testeur : « enlève les velux » sans Velux dans la liste n'ajoute rien ; « mets 3 joints mousse » ne change pas 20 m en 3", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "ouverte3@example.fr", "BATI INVEST");
    const res = await agent.post("/v1/quantitatifs?ecran=1").send({ dictee: "60 m² d'ardoise 32x22 et deux chatières" });
    const id = res.body.id as string;
    const avant = await jusquALaListe(agent, id, res.body as Ecran);
    const enleve = (await agent.post(`/v1/quantitatifs/${id}/dire?ecran=1`).send({ texte: "enlève les velux" }).expect(200)).body as Ecran;
    expect(enleve.message).toMatch(/je ne trouve pas « velux » dans ta liste/i);
    expect(enleve.message).not.toMatch(/ajouté/);
    expect(noms(enleve)).toEqual(noms(avant));
    // Une ligne comptée en mètres, écrite par l'artisan.
    const ajout = (await agent.post(`/v1/quantitatifs/${id}/dire?ecran=1`).send({ texte: "ajoute 20 m de joint mousse" }).expect(200)).body as Ecran;
    const liteaux = ajout.lignes.find((l) => /^Joint mousse/.test(l.libelle));
    expect(liteaux, JSON.stringify(noms(ajout))).toBeDefined();
    const mets = (await agent.post(`/v1/quantitatifs/${id}/dire?ecran=1`).send({ texte: "mets 3 joints mousse" }).expect(200)).body as Ecran;
    expect(mets.message).toMatch(/se compte en m/);
    expect(mets.lignes.find((l) => l.id === liteaux!.id)?.quantite).toEqual(liteaux!.quantite);
  }, 120_000);
});
