/**
 * RETOUR DE GREG (12 novembre 2026, capture de l'assistant) : « Ici, je veux une IA connectée. Quand je parle ça doit
 * retranscrire et convertir en quantitatif, l'IA doit poser des questions si besoin (comme un salarié de comptoir). »
 * `POST /v1/assistant/description`. Éteint par défaut : le code seul lit la phrase, rien ne coûte. Allumé : le modèle
 * découpe et questionne, le code revalide (règle numéro un). Ici le modèle est joué par son double : zéro appel payant.
 */
import { afterEach, describe, expect, it } from "vitest";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

const DICTEE = "J'aurais besoin de 52 m² d'ardoise 32 22 premier choix d'Espagne j'ai besoin d'une gouttière de 25 gouttières à braise";
const dit = (...t: string[]) => ({ echanges: t.map((texte, i) => ({ de: i % 2 === 0 ? "artisan" : "assistant", texte })) });

let ctx: TestContext | null = null;
const avant = { ASSISTANT_IA: process.env.ASSISTANT_IA, ASSISTANT_IA_PLAFOND_APPELS: process.env.ASSISTANT_IA_PLAFOND_APPELS };
afterEach(async () => {
  await ctx?.app.close();
  ctx = null;
  for (const [k, v] of Object.entries(avant)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

async function artisan(assistant: "on" | "off") {
  process.env.ASSISTANT_IA = assistant;
  ctx = await createTestApp();
  await resetDatabase(ctx.prisma);
  return (await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"])).agent;
}
const appels = () => ctx!.prisma.aiExecution.count({ where: { task: "assistant_description" } });

describe("l'assistant connecté à l'IA", () => {
  it("éteint (par défaut) : le code seul lit la phrase, aucun appel", async () => {
    const agent = await artisan("off");
    const r = (await agent.post("/v1/assistant/description").send(dit(DICTEE)).expect(200)).body;
    expect(r.ia).toBe(false);
    expect(r.questions).toEqual([]);
    // Le défaut de la capture : sans le modèle, la phrase dictée reste en une ligne.
    expect(r.lignes).toHaveLength(1);
    expect(await appels()).toBe(0);
  });

  it("allumé : la phrase dictée devient deux articles, avec la question du comptoir ; la réponse complète la ligne", async () => {
    const agent = await artisan("on");
    const r = (await agent.post("/v1/assistant/description").send(dit(DICTEE)).expect(200)).body;
    expect(r.ia).toBe(true);
    expect(r.lignes).toEqual([
      { libelle: "Ardoise naturelle 32×22 Espagne 1er choix", quantite: "52", unite: "m²" },
      { libelle: "Gouttière havraise développé 25", quantite: null, unite: null },
    ]);
    expect(r.nature).toBe("texte");
    expect(r.questions).toEqual([{ texte: "En quelle matière ?", choix: ["Zinc", "Cuivre", "PVC"], ligne: 1 }]);
    const suite = (await agent.post("/v1/assistant/description").send(dit(DICTEE, r.questions[0].texte, "zinc")).expect(200)).body;
    expect(suite.lignes[1]).toEqual({ libelle: "Gouttière havraise zinc développé 25", quantite: null, unite: null });
    // La matière dite, il reste la longueur : elle se demande sur la ligne, jamais devinée.
    expect(suite.questions).toEqual([{ texte: "Quelle longueur, en mètres ?", choix: [], ligne: 1 }]);
    // Chaque message est compté au journal des appels (plafond et coût).
    expect(await appels()).toBe(2);
  });

  it("RÈGLE NUMÉRO UN : un article que l'artisan n'a pas dit est écarté par le code, et il le sait", async () => {
    const agent = await artisan("on");
    const r = (await agent.post("/v1/assistant/description").send(dit(`${DICTEE} invente`)).expect(200)).body;
    expect(r.lignes.map((l: { libelle: string }) => l.libelle)).toEqual(["Ardoise naturelle 32×22 Espagne 1er choix", "Gouttière havraise développé 25"]);
    expect(JSON.stringify(r)).not.toMatch(/Crochets|950/);
    expect(r.message).toMatch(/Je n'ai pas tout retenu/);
  });

  it("au-delà du plafond : plus aucun appel, le code seul répond", async () => {
    process.env.ASSISTANT_IA_PLAFOND_APPELS = "1";
    const agent = await artisan("on");
    expect((await agent.post("/v1/assistant/description").send(dit(DICTEE)).expect(200)).body.ia).toBe(true);
    expect((await agent.post("/v1/assistant/description").send(dit(DICTEE)).expect(200)).body.ia).toBe(false);
    expect(await appels()).toBe(1);
  });

  // Les premiers octets d'un JPEG : le double de test ne regarde que le nom du fichier.
  const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xff, 0xd9]);

  it("PHOTO DE CHANTIER : les matériaux vus, sans quantité ni format inventés, avec les questions ; la suite complète", async () => {
    const agent = await artisan("on");
    const r = (await agent.post("/v1/assistant/photo").attach("file", JPEG, { filename: "toiture.jpg", contentType: "image/jpeg" }).expect(200)).body;
    expect(r).toMatchObject({ ia: true, nature: "chantier", vu: "Ardoise naturelle ; Gouttière zinc demi-ronde", message: expect.stringContaining("Je vois une couverture en ardoises") });
    // Le double invente « 12 m » et « 32×22 » : la quantité tombe, la ligne au format inventé est écartée.
    expect(r.lignes).toEqual([
      { libelle: "Ardoise naturelle", quantite: null, unite: null, vuSurPhoto: true },
      { libelle: "Gouttière zinc demi-ronde", quantite: null, unite: null, vuSurPhoto: true },
    ]);
    expect(r.questions.map((q: { texte: string }) => q.texte)).toEqual(["Tu refais toute la couverture ou une partie ?", "Quelle surface de couverture, en m² ?"]);
    // La suite, sans renvoyer la photo : ce qui a été vu reste nommé, les mesures viennent de l'artisan.
    const suite = (
      await agent
        .post("/v1/assistant/description")
        .send({ echanges: [{ de: "artisan", texte: "Voici une photo." }, { de: "photo", texte: r.vu }, { de: "assistant", texte: "Quelle surface de couverture, en m² ?" }, { de: "artisan", texte: "85 m² en 32 22 et 14 mètres de gouttière" }] })
        .expect(200)
    ).body;
    expect(suite.lignes).toEqual([
      { libelle: "Ardoise naturelle 32×22", quantite: "85", unite: "m²", vuSurPhoto: true },
      { libelle: "Gouttière zinc demi-ronde", quantite: "14", unite: "m" },
    ]);
  });

  it("PHOTO d'une liste, d'un devis ou d'autre chose : rien n'est recopié, l'écran sait quoi en faire ; éteint : comme avant", async () => {
    const agent = await artisan("on");
    const photo = (nom: string) => agent.post("/v1/assistant/photo").attach("file", JPEG, { filename: nom, contentType: "image/jpeg" });
    expect((await photo("liste-papier.jpg").expect(200)).body).toMatchObject({ ia: true, nature: "liste", lignes: [], questions: [] });
    expect((await photo("devis.jpg").expect(200)).body).toMatchObject({ ia: true, nature: "devis", lignes: [] });
    expect((await photo("chat.jpg").expect(200)).body).toMatchObject({ ia: true, nature: "autre", lignes: [], message: "Je ne vois ni chantier ni liste sur cette photo." });
    // Un fichier qui n'est pas une image, ou aucune photo : refusé avant tout appel.
    const avant = await appels();
    expect((await agent.post("/v1/assistant/photo").attach("file", Buffer.from("%PDF-1.4"), { filename: "toiture.jpg", contentType: "image/jpeg" }).expect(400)).body.error.details.reason).toBe("photo_illisible");
    await agent.post("/v1/assistant/photo").send({}).expect(400);
    expect(await appels()).toBe(avant);
    await ctx!.app.close();
    const eteint = await artisan("off");
    expect((await eteint.post("/v1/assistant/photo").attach("file", JPEG, { filename: "toiture.jpg", contentType: "image/jpeg" }).expect(200)).body).toEqual({ ia: false, nature: null, vu: null, lignes: [], questions: [], message: "" });
    expect(await appels()).toBe(0);
  });

  it("le dernier message doit être celui de l'artisan ; sans session, refusé", async () => {
    const agent = await artisan("on");
    await agent.post("/v1/assistant/description").send({ echanges: [{ de: "assistant", texte: "Quel développé ?" }] }).expect(400);
    const { default: request } = await import("supertest");
    await request(ctx!.app.getHttpServer()).post("/v1/assistant/description").send(dit(DICTEE)).expect(401);
  });
});
