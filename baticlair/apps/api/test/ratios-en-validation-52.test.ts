import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * §52 (retour du fondateur, 2026-10-12) : « Mention « ratios en cours de validation » : ajoute-la sur l'écran 3 et le
 * PDF fournisseur pour tout métier pas encore relu par un artisan (électricité, maçonnerie, carrelage) ; pas sur la
 * couverture. » L'écran 3 la reçoit (`ratiosEnValidation`), le document fournisseur l'écrit sous le chantier.
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

const MENTION = "Ratios en cours de validation";

async function chantier(trades: string[], lignes: { libelle: string; quantite: string; unite: string }[]) {
  const { agent } = await signUpWithCompany(ctx.app, `${trades[0]}@example.fr`, "Entreprise test", trades);
  const q = (await agent.post("/v1/quantitatifs").send({ reference: "Test", lignes }).expect(201)).body as { id: string; ratios_en_validation: boolean };
  const projectId = (await agent.get(`/v1/quantitatifs/${q.id}?ecran=1`).expect(200)).body.projetId as string;
  const takeoff = (await agent.get(`/v1/projects/${projectId}/takeoff`).expect(200)).body.takeoff as { ratiosEnValidation: boolean };
  const preview = (await agent.post(`/v1/projects/${projectId}/price-requests/preview`).send({}).expect(200)).body as { document: { entete: { mention: string | null } } };
  const pdf = await agent.get(`/v1/projects/${projectId}/demande-de-devis.pdf?apercu=1`).buffer(true).expect(200);
  return { q, takeoff, preview, pdf };
}

describe("§52 : la mention sur l'écran 3 et dans le PDF fournisseur", () => {
  for (const [metier, lignes] of [
    ["electrical", [{ libelle: "Prise de courant 16A 2P+T", quantite: "9", unite: "u" }]],
    ["masonry", [{ libelle: "Mur en parpaings de 20", quantite: "30", unite: "m²" }]],
    ["tiling", [{ libelle: "Carrelage sol grès cérame 60x60", quantite: "25", unite: "m²" }]],
  ] as const) {
    it(`${metier} : écran 3 et document portent « ${MENTION} »`, async () => {
      const { q, takeoff, preview, pdf } = await chantier([metier], [...lignes]);
      expect(q.ratios_en_validation).toBe(true);
      expect(takeoff.ratiosEnValidation).toBe(true);
      expect(preview.document.entete.mention).toBe(MENTION);
      expect(pdf.headers["content-type"]).toBe("application/pdf");
    });
  }

  it("couverture : ni l'écran 3 ni le document ne la portent", async () => {
    const { q, takeoff, preview } = await chantier(["roofing"], [{ libelle: "Gouttière zinc demi-ronde dév. 33", quantite: "12", unite: "ml" }]);
    expect(q.ratios_en_validation).toBe(false);
    expect(takeoff.ratiosEnValidation).toBe(false);
    expect(preview.document.entete.mention).toBeNull();
  });
});
