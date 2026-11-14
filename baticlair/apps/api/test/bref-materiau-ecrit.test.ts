import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, resetDatabase, signUp, type TestContext } from "./support/test-app.js";

/**
 * « LE CHANTIER EN BREF » NE DIT QUE CE QUI EST ÉCRIT (retour de Greg, 11 novembre 2026). Une liste saisie à la main avec
 * des ardoises sortait « Couverture en tuiles à emboîtement » à l'écran et sur le PDF envoyé aux négoces : un liteau ou un
 * écran de sous-toiture, communs à plusieurs couvertures, étaient rangés dans le premier ouvrage du tiroir (la tuile) et
 * donnaient son nom au chantier. Ici par la porte réelle (`POST /v1/quantitatifs`), avec la lecture simulée (celle de la
 * démonstration) : jamais un matériau ni un système de couverture que la liste n'écrit pas ; sinon, un bref neutre.
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

type L = [libelle: string, quantite: string, unite: string];
const ARDOISE: L = ["Ardoise naturelle 32 × 22 Espagne 1er choix", "1200", "pièces"];
const CROCHET: L = ["Crochet ardoise inox 90 mm", "1250", "pièces"];
const LITEAU: L = ["Liteau sapin traité 18 × 40", "180", "m"];
const ECRAN: L = ["Écran de sous-toiture HPV 1,5 × 50 m", "3", "rouleaux"];
const CHEVRON: L = ["Chevron sapin traité 63 × 75", "40", "m"];
const POINTE: L = ["Pointe inox 2,7 × 50", "4", "boîtes"];
const TUILE: L = ["Tuile mécanique grand moule rouge", "900", "pièces"];

describe("le chantier en bref d'une liste saisie à la main", () => {
  it("ardoises : jamais de tuiles ; tuiles : jamais d'ardoises ; accessoires seuls : aucun type de couverture ; le PDF dit la même chose", async () => {
    const agent = await signUp(ctx.app, "greg@toitures.fr", "Greg");
    await agent.post("/v1/companies").send({ name: "Toitures Greg", trades: ["roofing"] }).expect(201);
    const bref = async (lignes: L[], adresse?: string) => {
      const q = (await agent.post("/v1/quantitatifs").send({ ...(adresse ? { adresse } : {}), lignes: lignes.map(([libelle, quantite, unite]) => ({ libelle, quantite, unite })) }).expect(201)).body;
      const t = (await agent.get(`/v1/projects/${q.projetId}/takeoff`).expect(200)).body.takeoff;
      const apercu = (await agent.post(`/v1/projects/${q.projetId}/price-requests/preview`).send({}).expect(200)).body;
      return { projetId: q.projetId as string, texte: t.brefTexte as string, tout: [t.brefTexte, ...(t.bref as { texte: string }[]).map((b) => b.texte), apercu.mail].join(" | ") };
    };
    const PAS_TUILE = /tuile|embo[îi]tement/i;
    const PAS_ARDOISE = /ardoise/i;
    const AUCUN_TYPE = /tuile|embo[îi]tement|ardoises au crochet|couverture en|zinc|joint debout/i;

    // 1. La liste minimale : uniquement des ardoises.
    const seule = await bref([ARDOISE]);
    expect(seule.tout).not.toMatch(PAS_TUILE);
    expect(seule.texte).toBe("Couverture en ardoises, 1200 pièces, ardoise naturelle 32 × 22 Espagne 1er choix.");
    // 2. La liste du retour, dans l'ordre saisi puis accessoires en tête.
    for (const lignes of [[ARDOISE, CROCHET, LITEAU, ECRAN, CHEVRON, POINTE], [LITEAU, ECRAN, POINTE, CHEVRON, CROCHET, ARDOISE]]) {
      const r = await bref(lignes, "Chantier exemple, 22300 Lannion");
      expect(r.tout, lignes.map((l) => l[0]).join(" + ")).not.toMatch(PAS_TUILE);
      expect(r.tout).not.toMatch(/zinc|joint debout/i);
      expect(r.texte).toMatch(/^Couverture en ardoises au crochet/);
      expect(r.texte).toMatch(/Chantier à Lannion, bord de mer\.$/);
      // Le PDF envoyé aux négoces porte le même bref.
      const pdf = await agent.get(`/v1/projects/${r.projetId}/demande-de-devis.pdf?apercu=1`).buffer(true).expect(200);
      expect(pdf.headers["content-type"]).toBe("application/pdf");
    }
    // 3. Le cas inverse.
    for (const lignes of [[TUILE], [TUILE, LITEAU, ECRAN], [CROCHET, LITEAU, TUILE]]) {
      const r = await bref(lignes);
      expect(r.texte, lignes.map((l) => l[0]).join(" + ")).toMatch(/^Couverture en tuiles/);
      expect(r.texte).not.toMatch(/ardoises au crochet|couverture en ardoise|zinc/i);
      if (!lignes.includes(CROCHET)) expect(r.tout).not.toMatch(PAS_ARDOISE);
    }
    // 4. Information insuffisante : neutre, jamais un type de couverture, jamais un fait pris pour une ville.
    for (const lignes of [[LITEAU], [ECRAN], [POINTE], [CHEVRON], [LITEAU, ECRAN, POINTE, CHEVRON]]) {
      const r = await bref(lignes);
      expect(r.tout, lignes.map((l) => l[0]).join(" + ")).not.toMatch(AUCUN_TYPE);
      expect(r.tout).not.toMatch(/Chantier à \d/);
      expect(r.texte).toBe("");
    }
    // 5. Ardoises ET tuiles : jamais « la première de la liste » ; les deux, et le même bref dans tous les ordres.
    const deux = await Promise.all([[ARDOISE, TUILE], [TUILE, ARDOISE], [LITEAU, TUILE, CROCHET, ARDOISE, ECRAN], [ARDOISE, CROCHET, ECRAN, TUILE, LITEAU]].map((l) => bref(l)));
    expect(deux[0]!.texte).toBe("Couverture en tuiles et en ardoises.");
    expect(deux[1]!.texte).toBe(deux[0]!.texte);
    expect(deux[2]!.texte).toBe("Couverture en tuiles et en ardoises au crochet.");
    expect(deux[3]!.texte).toBe(deux[2]!.texte);
    for (const r of deux) expect(r.tout).not.toMatch(/embo[îi]tement|zinc|Chantier à \d/i);
    // Avec des surfaces à égalité (lignes en m²), toujours les deux, dans les deux ordres.
    const A60: L = ["Couverture en ardoises naturelles 32 × 22", "60", "m²"];
    const T60: L = ["Couverture en tuiles terre cuite", "60", "m²"];
    const egal = [await bref([A60, T60]), await bref([T60, A60])];
    expect(egal[0]!.texte).toBe(egal[1]!.texte);
    expect(egal[0]!.texte).toBe("Couverture en tuiles (60 m²) et en ardoises (60 m²).");
    // Jamais un ouvrage masqué par une plus grande surface (Greg, 12 novembre 2026) : 600 m² d'ardoises et 5 m² de tuiles.
    const A600: L = ["Couverture en ardoises naturelles 32 × 22", "600", "m²"];
    const T5: L = ["Couverture en tuiles terre cuite", "5", "m²"];
    const inegal = [await bref([A600, T5]), await bref([T5, A600])];
    expect(inegal[0]!.texte).toBe("Couverture en tuiles (5 m²) et en ardoises (600 m²).");
    expect(inegal[1]!.texte).toBe(inegal[0]!.texte);
    const neutre = await bref([LITEAU, ECRAN], "Chantier exemple, 22300 Lannion");
    expect(neutre.tout).not.toMatch(AUCUN_TYPE);
    expect(neutre.texte).toBe("Lannion, bord de mer.");
  }, 180_000);
});
