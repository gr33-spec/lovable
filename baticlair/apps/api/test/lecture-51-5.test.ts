/**
 * §51.5 (décision du fondateur, 2026-10-11) : LA LECTURE EST FAITE PAR L'IA, PAS PAR DES RÈGLES DE MOTS. Par l'API, avec
 * le lecteur simulé qui rend la lecture enregistrée de DE00000071 (relue par le fondateur) :
 *  - l'écran des questions montre exactement les cinq questions du modèle, aucune sur une donnée écrite ;
 *  - le bref est celui du modèle, en un paragraphe ;
 *  - la liste suit l'ordre du devis, sous les noms du comptoir, orange où une réponse manque ; cinq lignes sans fourniture ;
 *  - une réponse (développé 25) passe la gouttière au vert ; le raccord tranché (ZWC) passe les raccords au vert.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, resetDatabase, signUpWithCompany, type Agent, type TestContext } from "./support/test-app.js";
import { DE00000071_PDF } from "./support/de00000071-pdf.js";

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

type Row = { status: "ok" | "check" | "supplier"; itemKey?: string; reason?: string };
type Item = { key: string; label: string; quantity: string | null; precision: string | null };
type Decision = { key: string; text: string; question: { key: string; options: { label: string; value: string }[] } | null };
type Ecran = { view: { decisions: Decision[] }; purchase: { toBuy: Item[]; screen: { groups: { rows: Row[] }[] } }; brefTexte: string; sansFourniture: unknown[] };

async function depose(agent: Agent): Promise<{ id: string; projetId: string }> {
  const res = await agent.post("/v1/quantitatifs").field("reference", "DE00000071").field("adresse", "22620 Ploubazlanec").attach("file", Buffer.from(await DE00000071_PDF()), { filename: "devis.pdf", contentType: "application/pdf" });
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  return { id: res.body.id as string, projetId: res.body.projetId as string };
}

/** L'écran, tel que l'application le reçoit : la liste (vert / orange), les questions, le bref, les lignes sans fourniture. */
async function ecran(agent: Agent, projetId: string) {
  const body = (await agent.get(`/v1/projects/${projetId}/takeoff`).expect(200)).body as { takeoff: Ecran };
  const e = body.takeoff;
  const questions = e.view.decisions.filter((d) => d.question).map((d) => ({ id: d.key, texte: d.text, boutons: d.question!.options.map((o) => o.label) }));
  const lignes = e.purchase.screen.groups.flatMap((g) => g.rows).filter((r) => r.itemKey).map((r) => {
    const item = e.purchase.toBuy.find((b) => b.key === r.itemKey)!;
    return { libelle: item.label, texte: item.quantity, couleur: r.status === "ok" ? "vert" : "orange", raison: r.reason ?? null, precision: item.precision };
  });
  return { questions, lignes, bref: e.brefTexte, sansFourniture: e.sansFourniture };
}

describe("§51.5 : la lecture par le modèle, par l'API (DE00000071)", () => {
  it("les cinq questions du modèle, et aucune autre ; le bref en un paragraphe", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "greg@example.fr", "Toitures Test");
    const { projetId } = await depose(agent);
    const vue = await ecran(agent, projetId);
    const textes = vue.questions.map((q) => q.texte);
    expect(textes).toHaveLength(5);
    expect(textes.join("\n")).toMatch(/Développé de la gouttière/);
    expect(textes.join("\n")).toMatch(/descentes/);
    expect(textes.join("\n")).toMatch(/EPDM ou PVC/);
    expect(textes.join("\n")).toMatch(/ZWC .*Pratikal/);
    expect(textes.join("\n")).toMatch(/10 tôles ou 10 m²/);
    expect(vue.questions.find((q) => /Développé/.test(q.texte))!.boutons).toEqual(["De 25", "De 33"]);
    // Jamais un identifiant interne, jamais une question sur les Velux eux-mêmes.
    for (const t of textes) expect(t).not.toMatch(/[a-f0-9]{8}-|__|param:|fenetre-de-toit/);
    expect(textes.filter((t) => /velux|fenêtre/i.test(t) && !/raccord/i.test(t))).toEqual([]);
    expect(vue.bref).toMatch(/^Toiture existante en bac acier isolé, pas de couverture neuve\. Gouttière demi-ronde zinc naturel 17,40 m sur crochets Négrafix\. Chéneau 11,70 m refait en membrane\. 4 Velux SK06/);
    expect(vue.bref).toMatch(/Chantier à Ploubazlanec/);
    expect(vue.bref).not.toMatch(/\d+,\d{2} ?€|HT|TTC/);
  });

  it("la liste : neuf lignes dans l'ordre du devis, orange où une réponse manque, cinq lignes sans fourniture", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "greg@example.fr", "Toitures Test");
    const { projetId } = await depose(agent);
    const vue = await ecran(agent, projetId);
    expect(vue.lignes.map((l) => l.libelle)).toEqual([
      "Gouttière demi-ronde zinc naturel",
      expect.stringMatching(/^Crochets de gouttière Négrafix/),
      "Naissances",
      "Membrane de chéneau EPDM ou PVC",
      expect.stringMatching(/^Velux GGL SK06 114×118 white finish/),
      "Raccords SK06 pour bac acier",
      expect.stringMatching(/^Velux GGU MK04 78×98 ever finish/),
      "Raccord MK04 pour bac acier",
      expect.stringMatching(/^Tôles bac acier/),
    ]);
    // Retour du fondateur (2026-10-12) : les crochets se choisissent au développé de la gouttière, orange tant qu'il manque (§49.2).
    expect(vue.lignes.map((l) => l.couleur)).toEqual(["orange", "orange", "orange", "orange", "vert", "orange", "vert", "orange", "orange"]);
    expect(vue.lignes[1]!.raison).toMatch(/développé/i);
    expect(vue.lignes[0]!.texte).toBe("5 longueurs de 4 m");
    expect(vue.lignes[4]!.texte).toBe("4 pièces");
    expect(vue.lignes[8]!.texte).toBe("10");
    expect(vue.lignes[0]!.raison).toMatch(/développé/i);
    expect(vue.lignes[5]!.raison).toMatch(/ZWC ou Pratikal/i);
    expect(vue.lignes[8]!.raison).toMatch(/unité|profil|teinte/i);
    expect(vue.sansFourniture).toHaveLength(5);
  });

  it("une réponse règle sa ligne : développé 25 → gouttière verte ; raccord ZWC → raccords verts, « ZWC » en précision", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "greg@example.fr", "Toitures Test");
    const { id, projetId } = await depose(agent);
    const before = await ecran(agent, projetId);
    const developpe = before.questions.find((q) => /Développé/.test(q.texte))!;
    const raccord = before.questions.find((q) => /ZWC/.test(q.texte))!;
    await agent.post(`/v1/quantitatifs/${id}/reponses`).send({ reponses: [{ question: developpe.id, valeur: "25" }, { question: raccord.id, valeur: "ZWC" }] }).expect(201);
    const after = await ecran(agent, projetId);
    const gouttiere = after.lignes.find((l) => /^Gouttière/.test(l.libelle))!;
    expect(gouttiere.couleur).toBe("vert");
    expect(gouttiere.texte).toBe("5 longueurs de 4 m");
    const raccords = after.lignes.filter((l) => /^Raccords? /.test(l.libelle));
    expect(raccords.map((l) => l.couleur)).toEqual(["vert", "vert"]);
    expect(raccords.map((l) => l.precision)).toEqual([expect.stringMatching(/ZWC/), expect.stringMatching(/ZWC/)]);
    expect(after.questions.filter((q) => /Développé|ZWC/.test(q.texte))).toEqual([]);
  });
});
