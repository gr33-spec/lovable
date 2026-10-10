import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, resetDatabase, signUp, type TestContext } from "./support/test-app.js";

/**
 * §50.7 et §51 (fondateur, 2026-10-10) : « Ton chantier : la fiche rendue lisible en haut, chaque ligne modifiable ou
 * supprimable, la liste dessous ». Quand l'IA a lu la fiche, le bref EST la fiche ; une ligne corrigée l'est pour le
 * calcul aussi (§51.3 : les bacs sortent du rampant de la fiche), et le fournisseur reçoit le même document.
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
  { libelle: "Couverture zinc joint debout - Gris quartz. Couverture en zinc prépatiné gris quartz (type Quartz-Zinc) posée à joint debout. Pente de la toiture à environ 10°, rampant de 7 m et largeur de 13 m.", quantite: "91", unite: "m²" },
];
// La fiche telle que l'IA la rend (§51.1), chaque donnée avec son origine.
const FICHE = {
  donnees: [
    { cle: "ouvrage", libelle: "Ouvrage", valeur: "couverture zinc à joint debout", origine: "devis", preuve: "ligne 1" },
    { cle: "surface", libelle: "Surface", valeur: "91 m²", origine: "devis", preuve: "ligne 1" },
    { cle: "rampant", libelle: "Rampant", valeur: "7 m", origine: "devis", preuve: "ligne 1 : « rampant de 7 m »" },
    { cle: "largeur", libelle: "Largeur", valeur: "13 m", origine: "devis", preuve: "ligne 1 : « largeur de 13 m »" },
    { cle: "nombre_de_descentes", libelle: "Nombre de descentes", valeur: "2", origine: "deduite", regle: "une descente par naissance" },
  ],
};

type Ecran = { bref: { cle: string; texte: string }[] };
type Vue = { ecran: Ecran; lignes: { libelle: string; texte: string }[]; projetId: string };

async function chantier() {
  const agent = await signUp(ctx.app, "greg@toitures.fr", "Greg");
  await agent.post("/v1/companies").send({ name: "Toitures Greg", trades: ["roofing"] }).expect(201);
  const q = (await agent.post("/v1/quantitatifs").send({ reference: "Test", adresse: "18 rue de Siam, 29200 Brest", lignes: LIGNES }).expect(201)).body;
  const row = await ctx.prisma.quantitatif.findUniqueOrThrow({ where: { id: q.id } });
  await ctx.prisma.takeoff.update({ where: { id: row.takeoffId! }, data: { fiche: FICHE } });
  // Les questions : la couverture commandée façonnée (bacs), le reste au premier bouton.
  let current = (await agent.get(`/v1/quantitatifs/${q.id}`)).body as { questions: { id: string; boutons: { valeur: string }[] }[] };
  for (let i = 0; i < 10 && current.questions.length > 0; i++) {
    const question = current.questions[0]!;
    const valeur = question.id.includes("faconnage") ? "2" : (question.boutons[0]?.valeur ?? "ok");
    current = (await agent.post(`/v1/quantitatifs/${q.id}/reponses`).send({ reponses: [{ question: question.id, valeur }] })).body;
  }
  const supplier = (await agent.post("/v1/suppliers").send({ name: "Négoce test", email: "devis@example.com" })).body;
  const vue = async () => (await agent.get(`/v1/quantitatifs/${q.id}?ecran=1`).expect(200)).body as Vue;
  return { agent, id: q.id as string, supplierId: supplier.id as string, vue };
}

describe("§50.7 et §51 : en haut de « Ton chantier », la fiche", () => {
  it("le bref est la fiche, ligne par ligne, puis la ville ; le fournisseur reçoit le même", async () => {
    const { agent, id, supplierId, vue } = await chantier();
    const v = await vue();
    expect(v.ecran.bref.map((l) => l.texte)).toEqual(["Ouvrage : couverture zinc à joint debout", "Surface : 91 m²", "Rampant : 7 m", "Largeur : 13 m", "Nombre de descentes : 2", "Aspect du zinc : Quartz-Zinc", "Façonnage : commandé façonné", "Brest, bord de mer"]);
    expect((await agent.post(`/v1/quantitatifs/${id}/validation`)).status).toBe(200);
    const created = (await agent.post(`/v1/projects/${v.projetId}/price-requests`).send({ supplierIds: [supplierId] }).expect(201)).body;
    expect(created.packet.resume).toEqual(v.ecran.bref.map((l) => l.texte));
  });

  it("une ligne de la fiche corrigée sur le document l'est pour le calcul : 6,5 m de rampant, des bacs de 6,65 m", async () => {
    const { agent, id, vue } = await chantier();
    const before = await vue();
    expect(before.lignes.find((l) => /^Bacs joint debout/.test(l.libelle))?.libelle).toMatch(/longueur 7,15 m$/);
    const rampant = before.ecran.bref.find((l) => l.texte.startsWith("Rampant"))!;
    await agent.post(`/v1/quantitatifs/${id}/corrections`).send({ action: "bref", cle: rampant.cle, texte: "Rampant : 6,5 m" }).expect(201);
    const after = await vue();
    expect(after.ecran.bref.find((l) => l.cle === rampant.cle)?.texte).toBe("Rampant : 6,5 m");
    expect(after.lignes.find((l) => /^Bacs joint debout/.test(l.libelle))?.libelle).toMatch(/longueur 6,65 m$/);
    // Une ligne vidée est retirée du document.
    const descentes = after.ecran.bref.find((l) => l.texte.startsWith("Nombre de descentes"))!;
    await agent.post(`/v1/quantitatifs/${id}/corrections`).send({ action: "bref", cle: descentes.cle, texte: "" }).expect(201);
    expect((await vue()).ecran.bref.map((l) => l.cle)).not.toContain(descentes.cle);
  });
});
