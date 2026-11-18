import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, resetDatabase, signUp, type TestContext } from "./support/test-app.js";

/**
 * « JE NE SAIS PAS » À LA LONGUEUR DES BACS NE BLOQUE PAS LES AUTRES OUVRAGES (18 novembre 2026).
 * Depuis que le rampant d'une couverture en bacs se demande (il n'est plus supposé à 5,5 m), un devis qui a aussi des
 * ardoises posait la question pour tout le toit : laissée sans réponse, elle bloquait les ardoises, qui ont pourtant leur
 * rampant courant (il ne règle que leur recouvrement). Trouvé par le parcours « §48.4 et règle numéro un ».
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

const LIGNES = [
  { libelle: "Couverture zinc joint debout", quantite: "40", unite: "m²" },
  { libelle: "Couverture ardoise naturelle 32x22", quantite: "120", unite: "m²" },
];
type Corps = { questions: { id: string; texte: string }[]; ecran: { purchase: { toBuy: { label: string; quantity: string | null }[] } } };

async function chantier(rampant: string | null) {
  const agent = await signUp(ctx.app, "greg@toitures.fr", "Greg");
  await agent.post("/v1/companies").send({ name: "Toitures Greg", trades: ["roofing"] }).expect(201);
  const q = (await agent.post("/v1/quantitatifs").send({ reference: "Deux couvertures", adresse: "2 rue du Port, 56100 Lorient", lignes: LIGNES }).expect(201)).body as { id: string } & Corps;
  // La longueur des bacs se demande, en mètres, avec ses mots.
  expect(q.questions.find((x) => x.id === "engine:param:longueur_rampant")?.texte).toBe("Longueur des bacs (le rampant, de l'égout au faîtage) ?");
  const reponses = [
    { question: "engine:param:qualite_ardoise", valeur: "1" },
    { question: "engine:param:faconnage@couverture-zinc-joint-debout", valeur: "2" },
    { question: "engine:param:longueur_rampant", valeur: rampant, ...(rampant ? { unite: "m" } : {}) },
  ];
  expect((await agent.post(`/v1/quantitatifs/${q.id}/calcul?ecran=1`).send({ reponses, ajouts: [], retraits: [] })).status).toBe(200);
  return (await agent.get(`/v1/quantitatifs/${q.id}?ecran=1`).expect(200)).body as Corps;
}

describe("la longueur des bacs laissée sans réponse", () => {
  it("« Je ne sais pas » : les ardoises sont chiffrées avec leur rampant courant ; les bacs restent à préciser", async () => {
    const b = await chantier(null);
    const liste = b.ecran.purchase.toBuy.map((x) => [x.label, x.quantity]);
    expect(liste).toContainEqual(["Ardoises naturelles Espagne 1er choix 32×22", "5 030 pièces"]);
    const bacs = liste.find(([label]) => /joint debout/i.test(label ?? ""))!;
    expect(bacs[1]).toBeNull();
    // La question reste sur la ligne des bacs : elle se règle dans la liste.
    expect(b.questions.map((x) => x.id)).toContain("engine:param:longueur_rampant");
  });

  it("répondue (5 m) : les bacs sont comptés à cette longueur, les ardoises aussi", async () => {
    const b = await chantier("5");
    expect(b.ecran.purchase.toBuy.map((x) => [x.label, x.quantity])).toEqual([
      ["Bacs joint debout zinc naturel 0,65 mm, longueur 5,15 m", "19 bacs"],
      ["Ardoises naturelles Espagne 1er choix 32×22", "5 030 pièces"],
    ]);
    expect(b.questions.map((x) => x.id)).not.toContain("engine:param:longueur_rampant");
  });

  it("les réponses de l'écran, envoyées d'un coup : une qualité écrite (« Ardoise d'Angers ») passe même après une réponse qui change l'état", async () => {
    // Parcours « Autre » du 18 novembre 2026 : le façonnage, répondu juste avant dans le même envoi, refermait la question de
    // l'ardoise ; sa réponse écrite était alors refusée « Not a number » et la question reposée.
    const agent = await signUp(ctx.app, "greg@toitures.fr", "Greg");
    await agent.post("/v1/companies").send({ name: "Toitures Greg", trades: ["roofing"] }).expect(201);
    const q = (await agent.post("/v1/quantitatifs").send({ reference: "Deux couvertures", adresse: "2 rue du Port, 56100 Lorient", lignes: LIGNES }).expect(201)).body as { id: string };
    const envoi = await agent.post(`/v1/quantitatifs/${q.id}/reponses?ecran=1`).send({
      reponses: [
        { question: "engine:param:faconnage", valeur: "2" },
        { question: "engine:param:qualite_ardoise", valeur: "Ardoise d'Angers" },
        { question: "param:pente", valeur: "38", unite: "°" },
      ],
    });
    expect(envoi.status).toBe(201);
    expect((envoi.body as Corps).questions.map((x) => x.id)).not.toContain("engine:param:qualite_ardoise");
    expect((await agent.post(`/v1/quantitatifs/${q.id}/calcul?ecran=1`).send({ reponses: [{ question: "engine:param:longueur_rampant", valeur: null }], ajouts: [], retraits: [] })).status).toBe(200);
    const b = (await agent.get(`/v1/quantitatifs/${q.id}?ecran=1`).expect(200)).body as Corps;
    expect(b.ecran.purchase.toBuy.map((x) => x.label).join(" | ")).toMatch(/Ardoise d'Angers/);
  });
});
