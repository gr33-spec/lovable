import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * HABITUDES DE L'ENTREPRISE (§41, demande du fondateur du 2026-10-03) : « je façonne » répondu sur deux chantiers
 * différents devient l'habitude de l'entreprise ; au troisième chantier la question n'est plus posée, la réponse est
 * dite dans le calcul et reste modifiable d'un tap.
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

// Règle changée le 18 novembre 2026 : le rampant des bacs est écrit au devis (ou demandé), plus jamais supposé à 5,5 m.
const JOINT_DEBOUT = { lignes: [{ libelle: "Couverture zinc joint debout, rampant de 5,5 m", quantite: "91", unite: "m²" }] };
type Q = { id: string; questions: { id: string }[]; lignes: { libelle: string; quantite: number | null; unite: string | null; explication: { morceaux: { cle?: string; confiance: string }[] } }[] };

describe("« je façonne » : apprise à la deuxième confirmation, plus jamais demandée ensuite", () => {
  it("chantier 1 et 2 : la question se pose, l'artisan répond ; chantier 3 : plus de question, la bobine se calcule, l'habitude est dite", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Zinguerie Le Goff");
    for (const n of [1, 2]) {
      const q = (await agent.post("/v1/quantitatifs").send({ ...JOINT_DEBOUT, reference: `Chantier ${n}` })).body as Q;
      expect(q.questions.map((x) => x.id)).toContain("engine:param:faconnage");
      const res = await agent.post(`/v1/quantitatifs/${q.id}/reponses`).send({ reponses: [{ question: "engine:param:faconnage", valeur: "1" }] });
      expect(res.status).toBe(201);
      const answered = res.body as Q;
      expect(answered.questions.map((x) => x.id)).not.toContain("engine:param:faconnage");
    }
    const third = (await agent.post("/v1/quantitatifs").send({ ...JOINT_DEBOUT, reference: "Chantier 3" })).body as Q;
    expect(third.questions.map((x) => x.id)).not.toContain("engine:param:faconnage");
    const bobine = third.lignes.find((l) => /bobine/i.test(l.libelle))!;
    expect(bobine).toMatchObject({ libelle: "Bobine zinc naturel 0,65 mm, largeur 500 mm", quantite: 221, unite: "ml" });
    expect(bobine.explication.morceaux).toContainEqual(expect.objectContaining({ cle: "param:faconnage", confiance: "artisan" }));
    // Un autre chantier peut toujours dire autre chose : la réponse du chantier passe devant l'habitude.
    const res = await agent.post(`/v1/quantitatifs/${third.id}/reponses`).send({ reponses: [{ question: "param:faconnage", valeur: "2", unite: "u" }] });
    expect(res.status).toBe(201);
    const bacs = res.body as Q;
    expect(bacs.lignes.some((l) => /^Bacs/.test(l.libelle))).toBe(true);
    expect(bacs.lignes.some((l) => /bobine/i.test(l.libelle))).toBe(false);
  });

  it("une seule réponse ne fait pas une habitude : le chantier suivant redemande", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Zinguerie Le Goff");
    const q = (await agent.post("/v1/quantitatifs").send({ ...JOINT_DEBOUT, reference: "Chantier 1" })).body as Q;
    await agent.post(`/v1/quantitatifs/${q.id}/reponses`).send({ reponses: [{ question: "param:faconnage", valeur: "1" }] });
    const next = (await agent.post("/v1/quantitatifs").send({ ...JOINT_DEBOUT, reference: "Chantier 2" })).body as Q;
    expect(next.questions.map((x) => x.id)).toContain("engine:param:faconnage");
  });
});

describe("« Effacer ce que BatiClair a appris » : des essais au hasard ne restent pas des habitudes", () => {
  it("après effacement, la question revient ; les chantiers restent ; une autre entreprise garde ses habitudes", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Zinguerie Le Goff");
    const other = await signUpWithCompany(ctx.app, "b@example.fr", "Couverture Kerjean");
    for (const a of [agent, other.agent]) {
      for (const n of [1, 2]) {
        const q = (await a.post("/v1/quantitatifs").send({ ...JOINT_DEBOUT, reference: `Chantier ${n}` })).body as Q;
        await a.post(`/v1/quantitatifs/${q.id}/reponses`).send({ reponses: [{ question: "engine:param:faconnage", valeur: "1" }] });
      }
    }
    const res = await agent.delete("/v1/memoire");
    expect(res.status).toBe(200);
    expect(res.body.habitudes).toBeGreaterThan(0);
    const again = (await agent.post("/v1/quantitatifs").send({ ...JOINT_DEBOUT, reference: "Chantier 3" })).body as Q;
    expect(again.questions.map((x) => x.id)).toContain("engine:param:faconnage");
    expect(await ctx.prisma.quantitatif.count()).toBeGreaterThanOrEqual(5);
    const theirs = (await other.agent.post("/v1/quantitatifs").send({ ...JOINT_DEBOUT, reference: "Chantier 3" })).body as Q;
    expect(theirs.questions.map((x) => x.id)).not.toContain("engine:param:faconnage");
  });
});

describe("le pliage : une seule carte « Comme d'habitude ? » pour tout le devis (Greg, 17 novembre 2026 ; avant, §48.2 : une par lot)", () => {
  it("noue + abergement de cheminée : UNE carte, avec la question de la fiche ; une pièce se change sans toucher aux autres", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "a@example.fr", "Zinguerie Le Goff");
    for (const n of [1, 2]) {
      const q = (await agent.post("/v1/quantitatifs").send({ ...JOINT_DEBOUT, reference: `Chantier ${n}` })).body as Q;
      await agent.post(`/v1/quantitatifs/${q.id}/reponses`).send({ reponses: [{ question: "engine:param:faconnage", valeur: "1" }] });
    }
    const ZINGUERIE = {
      lignes: [
        { libelle: "Noue zinc", quantite: "6", unite: "ml" },
        { libelle: "Abergement de cheminée zinc, périmètre 4 m", quantite: "1", unite: "u" },
      ],
    };
    const q = (await agent.post("/v1/quantitatifs?ecran=1").send({ ...ZINGUERIE, reference: "Chantier 3" })).body as { id: string; ecran: { habits: { key: string; question: string; value: string }[] } };
    const cards = q.ecran.habits.filter((h) => h.key.startsWith("param:faconnage"));
    expect(cards.map((h) => h.key)).toEqual(["param:faconnage@pieces-pliees"]);
    expect(cards.map((h) => h.question)).toEqual(["Tes pièces pliées (rive, bandes, noue, faîtage…) : tu les plies toi-même, ou tu les achètes toutes faites ?"]);
    // Greg, 27 novembre 2026 (iPhone) : une habitude dit toujours ce qu'elle concerne (« Façonnage : … , comme d'habitude »),
    // jamais une valeur seule (« Comme d'habitude : 0,65 mm. »).
    expect((q.ecran.habits as { label?: string }[]).every((h) => typeof h.label === "string" && h.label.length > 0)).toBe(true);
    expect(cards.map((h) => (h as { label?: string }).label)).toEqual(["Façonnage"]);
    // L'abergement est commandé façonné sur ce chantier (le choix d'UNE pièce) ; la noue reste « comme d'habitude » (je façonne).
    const res = await agent
      .post(`/v1/quantitatifs/${q.id}/reponses?ecran=1`)
      .send({ reponses: [{ question: "param:faconnage@abergement-cheminee", valeur: "2", unite: "u" }] });
    expect(res.status).toBe(201);
    const after = res.body as { ecran: { habits: { key: string }[]; choixPieces: { key: string; value: string }[]; purchase: { toBuy: { label: string; lineIds: string[] }[] } } };
    expect(after.ecran.habits.map((h) => h.key)).toEqual(["param:faconnage@pieces-pliees"]);
    expect(after.ecran.choixPieces.find((c) => c.key === "param:faconnage@abergement-cheminee")?.value).toBe("2");
  });
});
