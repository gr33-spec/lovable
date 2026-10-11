import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, resetDatabase, signUp, type TestContext } from "./support/test-app.js";

/**
 * §51 (fondateur, 2026-10-10), par la porte /v1/quantitatifs, avec la relecture simulée (§51.2) :
 *  - la fiche de chantier est rendue avec l'écran, chaque donnée avec son origine ;
 *  - aucune question sur une donnée de la fiche (le rampant, la pente lus au devis) ;
 *  - « Une réponse « Autre » sur le façonnage modifie la fiche et la liste » (§51.4) ;
 *  - une réponse qui ouvre une donnée manquante pose UNE question de plus, avant le calcul.
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

// D-2026-018, anonymisé (désignations, quantités, unités).
const LIGNES = [
  { libelle: "Couverture zinc joint debout - Gris quartz. Réalisation complète d'une couverture en zinc prépatiné gris quartz (type Quartz-Zinc) posée à joint debout sur voligeage. Pente de la toiture à environ 10°, rampant de 7 m et largeur de 13 m.", quantite: "91", unite: "m²" },
  { libelle: "Bande de ventilation en Z en zinc quartz, bandes de ventilation perforées pliées en Z en zinc prépatiné gris quartz", quantite: "13", unite: "m" },
];

type Question = { id: string; texte: string; boutons: { label: string; valeur: string }[]; saisie_libre: boolean };
type Fiche = { cle: string; libelle: string; valeur: string | null; origine: string; regle: string | null; preuve: string | null }[];

async function chantier() {
  const agent = await signUp(ctx.app, "greg@toitures.fr", "Greg");
  await agent.post("/v1/companies").send({ name: "Toitures Greg", trades: ["roofing"] }).expect(201);
  const q = (await agent.post("/v1/quantitatifs").send({ reference: "Test", adresse: "18 rue de Siam, 29200 Brest", lignes: LIGNES }).expect(201)).body;
  return { agent, id: q.id as string };
}

describe("§51 : la fiche de chantier, par l'API", () => {
  it("la fiche vient avec l'écran ; chaque donnée a son origine ; aucune question sur une donnée de la fiche", async () => {
    const { agent, id } = await chantier();
    const body = (await agent.get(`/v1/quantitatifs/${id}`).expect(200)).body as { fiche: Fiche; questions: Question[] };
    const rampant = body.fiche.find((d) => d.cle === "longueur_rampant");
    expect(rampant).toMatchObject({ valeur: "7 m", origine: "devis" });
    expect(rampant?.preuve).toMatch(/^Devis, ligne 1 /);
    for (const d of body.fiche) expect(["devis", "deduite", "reponse", "manquante"]).toContain(d.origine);
    expect(body.questions.map((q) => q.id)).not.toContain("engine:param:longueur_rampant");
    expect(body.questions.map((q) => q.id)).not.toContain("engine:param:pente");
    // Chaque question ouverte du calcul est une donnée manquante de la fiche, une seule fois.
    // Jamais deux fois : un trou du calcul n'est pas aussi une question « fiche: ».
    expect(body.questions.filter((q) => q.id.startsWith("fiche:"))).toEqual([]);
    const holes = body.fiche.filter((d) => d.origine === "manquante");
    expect(holes.map((d) => d.cle).filter((k, i, all) => all.indexOf(k) !== i)).toEqual([]);
  });

  it("§51.4 : une réponse « Autre » sur le façonnage, relue, modifie la fiche et la liste", async () => {
    const { agent, id } = await chantier();
    const before = (await agent.get(`/v1/quantitatifs/${id}`).expect(200)).body as { questions: Question[]; lignes: { libelle: string }[] };
    const faconnage = before.questions.find((q) => q.id === "engine:param:faconnage@couverture-zinc-joint-debout");
    expect(faconnage).toBeDefined();
    expect(before.lignes.some((l) => /^Bacs joint debout/.test(l.libelle))).toBe(false);
    const after = (
      await agent
        .post(`/v1/quantitatifs/${id}/reponses`)
        .send({ reponses: [{ question: faconnage!.id, valeur: "Je commande les bacs façonnés, mais la bande de ventilation je la plie moi-même" }] })
        .expect(201)
    ).body as { fiche: Fiche; questions: Question[]; lignes: { libelle: string; texte: string }[] };
    // La fiche garde la réponse, relue, origine « ta réponse ».
    expect(after.fiche.find((d) => d.origine === "reponse" && /bacs façonnés/.test(d.valeur ?? ""))).toBeDefined();
    // La question est réglée par la réponse relue : la couverture commandée façonnée.
    expect(after.questions.map((q) => q.id)).not.toContain("engine:param:faconnage@couverture-zinc-joint-debout");
    expect(after.lignes.find((l) => /^Bacs joint debout/.test(l.libelle))?.texte).toBe("31 bacs");
    // La fiche dit le façonnage tel que l'artisan l'a écrit, une seule fois.
    expect(after.fiche.find((d) => d.libelle === "Façonnage")).toMatchObject({ origine: "reponse" });
  });

  it("§51.2 : une réponse qui ouvre une donnée manquante pose une question de plus, à laquelle on répond en écrivant", async () => {
    const { agent, id } = await chantier();
    const after = (
      await agent
        .post(`/v1/quantitatifs/${id}/reponses`)
        .send({ reponses: [{ question: "engine:param:faconnage@couverture-zinc-joint-debout", valeur: "Je commande façonné, il manque la couleur des pattes" }] })
        .expect(201)
    ).body as { fiche: Fiche; questions: Question[] };
    const extra = after.questions.find((q) => q.id === "fiche:la_couleur_des_pattes");
    expect(extra).toMatchObject({ texte: "La couleur des pattes ?", saisie_libre: true });
    expect(after.fiche.find((d) => d.cle === "la_couleur_des_pattes")).toMatchObject({ origine: "manquante", valeur: null });
    const closed = (await agent.post(`/v1/quantitatifs/${id}/reponses`).send({ reponses: [{ question: extra!.id, valeur: "inox naturel" }] }).expect(201)).body as { fiche: Fiche; questions: Question[] };
    expect(closed.questions.map((q) => q.id)).not.toContain(extra!.id);
    expect(closed.fiche.find((d) => d.origine === "reponse" && d.valeur === "inox naturel")).toBeDefined();
  });

  it("§51.2 : la question de plus se pose AVANT le calcul : « Calculer ma liste » revient aux questions avec elle", async () => {
    const { agent, id } = await chantier();
    const body = (
      await agent
        .post(`/v1/quantitatifs/${id}/calcul`)
        .send({ reponses: [{ question: "engine:param:faconnage@couverture-zinc-joint-debout", valeur: "Je commande façonné, il manque la couleur des pattes" }] })
        .expect(200)
    ).body as { phase?: string; questions: Question[] };
    expect(body.questions.map((q) => q.id)).toContain("fiche:la_couleur_des_pattes");
    // Le calcul n'a pas clos la question en « je ne sais pas » : elle attend sa réponse.
    const again = (await agent.get(`/v1/quantitatifs/${id}?ecran=1`).expect(200)).body as { questions: Question[] };
    expect(again.questions.map((q) => q.id)).toContain("fiche:la_couleur_des_pattes");
  });
});
