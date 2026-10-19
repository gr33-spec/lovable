import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * §52, ÉPREUVES PAR LE FAUX LECTEUR (mission du fondateur, 2026-10-19 : « 5 devis d'épreuve par métier par le faux
 * lecteur » ; crédit API à zéro : « zéro appel API »). Chaque métier calculé par sa fiche (`referentiels/metiers/`) passe
 * par toute la porte /v1/quantitatifs : lecture simulée (l'ouvrage nommé par « Ce que le devis écrit »), questions de la
 * fiche, réponses, puis la commande au mot près. Devis d'épreuve écrits à la main, anonymes (désignations, quantités,
 * unités). Ajouter un métier : ajouter ses cinq épreuves ici.
 */
type Ligne = { libelle: string; quantite: string; unite: string };
type Epreuve = { nom: string; lignes: Ligne[]; questions: Record<string, string>; commande: Record<string, string>; ecrits?: string[] };

const EPREUVES: Record<string, { compte: string; epreuves: Epreuve[] }> = {
  earthworks: {
    compte: "terrassement",
    epreuves: [
      {
        nom: "accès voiture : géotextile et empierrement écrits avec leur épaisseur",
        lignes: [
          { libelle: "Décapage terre végétale sur 30 cm", quantite: "80", unite: "m²" },
          { libelle: "Géotextile sous empierrement", quantite: "80", unite: "m²" },
          { libelle: "Empierrement GNT 0/31,5 ép. 20 cm compactée", quantite: "80", unite: "m²" },
        ],
        questions: {},
        commande: { "GNT 0/31,5": "37 t", "Géotextile 150 g/m²": "1 rouleau 4 × 25 m de 100 m²" },
      },
      {
        nom: "branchement tout-à-l'égout : tubes, sable, grillage, et le regard tel qu'écrit",
        lignes: [
          { libelle: "Branchement eaux usées PVC CR8 Ø125 en tranchée", quantite: "18", unite: "ml" },
          { libelle: "Regard de branchement en limite de propriété", quantite: "1", unite: "u" },
        ],
        questions: {},
        commande: { "Tube PVC CR8 Ø125": "7 barres de 3 m", "Sable 0/4": "6 t", "Grillage avertisseur marron": "1 rouleau de 100 m" },
        ecrits: ["Regard de branchement en limite de propriété"],
      },
      {
        nom: "tranchée commune électricité et télécom : la tranchée commune se demande",
        lignes: [
          { libelle: "Fourreau Enedis TPC Ø63", quantite: "30", unite: "ml" },
          { libelle: "Fourreau télécom TPC Ø40", quantite: "30", unite: "ml" },
          { libelle: "Lit de pose et enrobage sable des fourreaux", quantite: "30", unite: "ml" },
        ],
        questions: { tranchee_commune: "oui" },
        commande: {
          "Gaine TPC rouge Ø63": "1 couronne de 50 m",
          "Gaine TPC verte Ø40": "1 couronne de 50 m",
          "Grillage avertisseur rouge": "1 rouleau de 100 m",
          "Grillage avertisseur vert": "1 rouleau de 100 m",
          "Sable 0/4": "9 t",
        },
      },
      {
        nom: "assainissement non collectif : épandage calculé, fosse et boîtes telles qu'écrites",
        lignes: [
          { libelle: "Fosse toutes eaux 3000 L", quantite: "1", unite: "u" },
          { libelle: "Épandage 3 tranchées de 15 ml, gravier 10/40, géotextile", quantite: "45", unite: "ml" },
          { libelle: "Boîte de répartition", quantite: "1", unite: "u" },
          { libelle: "Boîte de bouclage", quantite: "1", unite: "u" },
        ],
        questions: {},
        commande: { "Tube d'épandage PVC CR4 Ø100": "12 barres de 4 m", "Gravier roulé lavé 10/40": "14 t", "Géotextile en bande de 1 m": "1 rouleau de 50 m" },
        ecrits: ["Fosse toutes eaux 3000 L", "Boîte de répartition", "Boîte de bouclage"],
      },
      {
        nom: "maison : drainage, hérisson sans épaisseur (question), remblai en sable",
        lignes: [
          { libelle: "Drainage périphérique drain Ø100 enrobé, gravier 20/40, géotextile", quantite: "44", unite: "ml" },
          { libelle: "Regard de visite drainage", quantite: "5", unite: "u" },
          { libelle: "Hérisson en pierres cassées 20/40 sous dallage", quantite: "60", unite: "m²" },
          { libelle: "Remblai en sable d'apport", quantite: "5", unite: "m³" },
          { libelle: "Évacuation des déblais en décharge", quantite: "1", unite: "ens" },
        ],
        questions: { epaisseur_herisson: "20" },
        commande: {
          "Drain Ø100 enrobé géotextile": "1 couronne de 50 m",
          "Cailloux 20/40": "31 t",
          "Géotextile de drainage": "2 rouleaux 2 × 25 m de 50 m²",
          "Sable 0/4": "10 t",
        },
        ecrits: ["Regard de visite drainage"],
      },
    ],
  },
};

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

type Vue = { id: string; metier: string; questions: { id: string }[]; lignes: { libelle: string; texte: string }[] };

describe("§52 : cinq devis d'épreuve par métier, par le faux lecteur", () => {
  for (const [metier, { compte, epreuves }] of Object.entries(EPREUVES)) {
    for (const [i, e] of epreuves.entries()) {
      it(`${compte}, épreuve ${i + 1} : ${e.nom}`, async () => {
        const { agent } = await signUpWithCompany(ctx.app, `epreuve-${i}@example.fr`, "Entreprise d'épreuve", [metier]);
        let q = (await agent.post("/v1/quantitatifs").send({ lignes: e.lignes }).expect(201)).body as Vue;
        expect(q.metier).toBe(compte);
        expect(q.questions.map((x) => x.id.replace(/^(?:engine:)?fiche:/, "")).sort()).toEqual(Object.keys(e.questions).sort());
        if (Object.keys(e.questions).length > 0) {
          const reponses = q.questions.map((x) => ({ question: x.id, valeur: e.questions[x.id.replace(/^(?:engine:)?fiche:/, "")]! }));
          q = (await agent.post(`/v1/quantitatifs/${q.id}/reponses`).send({ reponses }).expect(201)).body as Vue;
          expect(q.questions).toEqual([]);
        }
        const commande = Object.fromEntries(q.lignes.map((l) => [l.libelle, l.texte]));
        for (const [f, attendu] of Object.entries(e.commande)) expect(commande[f], f).toBe(attendu);
        // Règle numéro un : rien d'autre que ce que les ouvrages écrits contiennent, et les pièces écrites telles quelles.
        expect(Object.keys(commande).sort()).toEqual([...Object.keys(e.commande), ...(e.ecrits ?? [])].sort());
      });
    }
  }
});
