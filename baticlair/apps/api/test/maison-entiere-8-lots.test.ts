import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ficheDeCalcul, type LectureDevis } from "@baticlair/domain";
import { LECTURE_READER, type LectureRequest } from "../src/modules/takeoff/application/lecture-reader.js";
import { FakeLectureReader, ouvrageDeFiche } from "../src/modules/takeoff/infrastructure/fake-lecture-reader.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * ÉTAPE 3 DE LA MISSION (Greg, 2026-10-19) : « un devis de maison entière, huit lots, en test permanent ». Un constructeur
 * dépose le devis d'une maison : maçonnerie, électricité, plomberie, carrelage, sols, peinture, serrurerie, façade. Le
 * modèle (simulé ici, aucun appel API) range chaque ligne dans son lot et nomme l'ouvrage de la fiche de ce lot (§52) ;
 * l'écran 3 montre alors la carte « Lots repérés », une section par lot avec ses articles comptés par sa propre fiche, et
 * chaque lot part seul chez son fournisseur (§48.5, envoi d'une sélection). Rien d'écrit ne disparaît (§49.1).
 */
const LOTS: { metier: string; libelle: string; ligne: { libelle: string; quantite: string; unite: string }; attendu: Record<string, string> }[] = [
  { metier: "masonry", libelle: "Maçonnerie", ligne: { libelle: "Chape ciment 5 cm", quantite: "35", unite: "m²" }, attendu: {} },
  { metier: "electrical", libelle: "Électricité", ligne: { libelle: "Prise de courant 16A 2P+T", quantite: "9", unite: "u" }, attendu: {} },
  { metier: "plumbing", libelle: "Plomberie", ligne: { libelle: "Mitigeur lavabo chromé", quantite: "4", unite: "u" }, attendu: {} },
  { metier: "tiling", libelle: "Carrelage", ligne: { libelle: "Carrelage sol grès cérame 60x60 rectifié, pose droite", quantite: "30", unite: "m²" }, attendu: { "Carreau de sol 60×60": "23 cartons de 1,44 m²", "Mortier-colle C2 S1": "7 sacs de 25 kg" } },
  { metier: "flooring", libelle: "Sols souples", ligne: { libelle: "Sol PVC en rouleau collé", quantite: "50", unite: "m²" }, attendu: { "Sol PVC en rouleau, largeur 4 m": "14 mètres de 4 m²", "Colle acrylique sols souples": "1 seau de 20 kg" } },
  { metier: "painting", libelle: "Peinture", ligne: { libelle: "Peinture murs et plafonds, impression + 2 couches", quantite: "100", unite: "m²" }, attendu: { "Peinture acrylique murs et plafonds": "2 seaux de 15 L", "Impression acrylique": "1 seau de 15 L" } },
  { metier: "metalwork", libelle: "Serrurerie", ligne: { libelle: "Grille de défense acier", quantite: "6", unite: "m²" }, attendu: { "Carré plein acier 14 × 14 (barreaux)": "9 barres de 6 m", "Fer plat acier 30 × 8 (traverses)": "3 barres de 6 m" } },
  { metier: "facade", libelle: "Façade", ligne: { libelle: "Enduit monocouche gratté sur maçonnerie", quantite: "50", unite: "m²" }, attendu: { "Enduit monocouche": "57 sacs de 25 kg" } },
];

/** Ce que le modèle rendrait : chaque ligne dans son lot, l'ouvrage de la fiche du lot nommé avec ses données écrites. */
class LecteurMaison extends FakeLectureReader {
  override async lire(request: LectureRequest) {
    const r = await super.lire(request);
    const l = r?.output as LectureDevis | undefined;
    if (l) {
      l.metier = "masonry";
      l.lots = LOTS.map((lot, i) => ({ metier: lot.metier, libelle: lot.libelle, lignes: [l.lignes[i]!.ref] }));
      for (const [i, ligne] of l.lignes.entries()) {
        const lot = LOTS[i]!;
        const fiche = ficheDeCalcul(lot.metier);
        const o = fiche ? ouvrageDeFiche(fiche, ligne.designation, ligne.unite ?? "") : null;
        if (lot.metier === "electrical") {
          ligne.role = "fourniture_et_pose";
          ligne.fournitures = [{ nom: ligne.designation, quantite: ligne.quantite, unite: ligne.unite, ouvrage: "prise-16a", emplacement: null, donnees: {}, attend: [], aPreciser: [], precision: null }];
        } else if (o) {
          ligne.role = "fourniture_et_pose";
          ligne.fournitures = [{ nom: ligne.designation, quantite: ligne.quantite, unite: ligne.unite, ouvrage: o.ouvrage, emplacement: "ouvrage", donnees: o.donnees, attend: [], aPreciser: [], precision: null }];
        }
      }
    }
    return r;
  }
}

let ctx: TestContext;
beforeAll(async () => {
  ctx = await createTestApp((b) => b.overrideProvider(LECTURE_READER).useValue(new LecteurMaison()));
});
afterAll(async () => {
  await ctx.app.close();
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
});

type Item = { key: string; label: string; quantity: string | null };
type Takeoff = { lots: { metier: string; libelle: string; lignes: number }[]; purchase: { toBuy: Item[]; screen: { groups: { key: string; label: string; rows: { itemKey?: string }[] }[] } } };

describe("étape 3 : une maison entière, huit lots", () => {
  it("huit lots repérés, une section par lot comptée par sa fiche, chaque lot envoyé seul à son fournisseur", async () => {
    const { agent } = await signUpWithCompany(ctx.app, "constructeur@example.fr", "Maisons d'épreuve", ["general"]);
    const q = (await agent.post("/v1/quantitatifs").send({ lignes: LOTS.map((l) => l.ligne) }).expect(201)).body as { projetId: string };
    const t = (await agent.get(`/v1/projects/${q.projetId}/takeoff`).expect(200)).body.takeoff as Takeoff;

    // La carte « Lots repérés » : les huit, dans l'ordre du devis, une ligne chacun.
    expect(t.lots).toEqual(LOTS.map((l) => ({ metier: l.metier, libelle: l.libelle, lignes: 1 })));
    // Une section par lot, dans le même ordre.
    const sections = t.purchase.screen.groups.filter((g) => g.key.startsWith("lot:"));
    expect(sections.map((g) => g.label)).toEqual(LOTS.map((l) => l.libelle));

    const articles = (g: (typeof sections)[number]) => g.rows.map((r) => t.purchase.toBuy.find((b) => b.key === r.itemKey)).filter((b): b is Item => !!b);
    for (const [i, lot] of LOTS.entries()) {
      const contenu = articles(sections[i]!);
      // §49.1 : chaque lot a au moins un article ; rien d'écrit ne disparaît.
      expect(contenu.length, lot.libelle).toBeGreaterThan(0);
      const commande = Object.fromEntries(contenu.map((b) => [b.label, b.quantity]));
      for (const [f, attendu] of Object.entries(lot.attendu)) expect(commande[f], `${lot.libelle} : ${f}`).toBe(attendu);
    }
    // Les pièces écrites à l'unité restent telles qu'écrites dans leur lot ; les prises sont comptées par le tiroir électricité.
    expect(articles(sections[1]!).some((b) => /^Prise 2P\+T 16 A/.test(b.label))).toBe(true);
    expect(articles(sections[2]!).map((b) => b.label)).toEqual([expect.stringMatching(/Mitigeur lavabo/)]);

    // Envoi par lot (§48.5) : chaque section part seule chez son fournisseur (adresses @example.com, aucun vrai négoce).
    for (const [i, lot] of LOTS.entries()) {
      const fournisseur = (await agent.post("/v1/suppliers").send({ name: `Négoce ${lot.libelle}`, email: `lot${i + 1}@example.com` }).expect(201)).body.id as string;
      const cles = articles(sections[i]!).map((b) => b.key);
      const envoi = await agent.post(`/v1/projects/${q.projetId}/price-requests`).send({ supplierIds: [fournisseur], articles: cles });
      expect(envoi.status, lot.libelle).toBe(201);
      expect(envoi.body.packet.fournitures.map((f: { cle?: string }) => f.cle).sort(), lot.libelle).toEqual([...cles].sort());
    }
    const demandes = (await agent.get(`/v1/projects/${q.projetId}/price-requests`)).body.items as { articles: string[] }[];
    expect(demandes).toHaveLength(8);
    expect(demandes.flatMap((d) => d.articles).sort()).toEqual(sections.flatMap((g) => articles(g).map((b) => b.key)).sort());
  });
});
