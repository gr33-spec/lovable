import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { TOUT_LE_CATALOGUE } from "@baticlair/domain";
import { doubleAuthentification } from "./support/admin.js";
import { couvreurAvecListe } from "./support/cycle.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * LES CATALOGUES PROFESSIONNELS PAR MÉTIER, PAR L'API (Greg, 12 novembre 2026 : « Métier › Rayon › Famille › Produit ›
 * Caractéristiques › Quantité […] Étanchéité doit apparaître comme un rayon du catalogue Couverture […] ne conserve pas un
 * système où l'ajout de centaines d'articles dépend silencieusement de la première ouverture du catalogue […] une
 * synchronisation explicite, idempotente, rejouable sans doublon, sans écrasement, avec un relevé avant et après »).
 */
let ctx: TestContext;
const VARS = ["GROUPE", "GROUPE_ADMINS", "ZONES_ACTIVES", "CATALOGUE_SYNCHRO_AUTO"] as const;
const avant = Object.fromEntries(VARS.map((k) => [k, process.env[k]]));
beforeAll(async () => {
  process.env.GROUPE = "on";
  process.env.ZONES_ACTIVES = "22";
  process.env.GROUPE_ADMINS = "greg@example.fr";
  delete process.env.CATALOGUE_SYNCHRO_AUTO; // comme en ligne
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
  for (const [k, v] of Object.entries(avant)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});
beforeEach(async () => {
  await resetDatabase(ctx.prisma);
});

type Choix = { nom: string; options: { valeur: string; suite: Choix | null; article: { cle: string; designation: string; unite: string } | null }[] };
type Produit = { libelle: string; indication: string; nombre: number; article: { cle: string } | null; choix: Choix | null; precisions: { nom: string; niveau: string }[] };
type Rayon = { libelle: string; familles: { libelle: string; produits: Produit[] }[] };
const empreinte = async () => (await ctx.prisma.$queryRawUnsafe<{ cle: string; e: string }[]>(`select cle, md5(t::text) e from catalogue_article t order by cle`)).map((r) => `${r.cle}=${r.e}`);

describe("le catalogue d'un métier, en rayons", { timeout: 120_000 }, () => {
  it("Couverture : trois rayons ; Étanchéité n'est plus au sélecteur ; Bobine se choisit par matière, puis finition, épaisseur, largeur, jusqu'à UN article à sa clé", async () => {
    const a = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    const r = (await a.agent.get("/v1/catalogue").expect(200)).body as { metiers: { code: string; libelle: string; mien: boolean }[]; metier: string; rayons: Rayon[] };
    expect(r.metier).toBe("couverture");
    expect(r.metiers.map((m) => m.code)).not.toContain("etancheite");
    expect(r.metiers.map((m) => m.code)).not.toContain("zinguerie");
    expect(r.metiers.find((m) => m.code === "platrerie_isolation")!.libelle).toBe("Plaques de plâtre et isolation");
    expect(r.rayons.map((x) => x.libelle)).toEqual(["Couverture", "Zinguerie", "Étanchéité et toitures-terrasses"]);
    const bobine = r.rayons[1]!.familles.find((f) => f.libelle === "Feuilles, bobines, bobineaux et bandes")!.produits.find((p) => p.libelle === "Bobine")!;
    expect(bobine.indication).toBe("Matériau, finition, épaisseur, largeur");
    expect(bobine.choix!.options.map((o) => o.valeur)).toEqual(["zinc", "cuivre"]);
    const zinc = bobine.choix!.options[0]!.suite!;
    expect(zinc.nom).toBe("Finition");
    const article = zinc.options[0]!.suite!.options[0]!.suite!.options[0]!.article!;
    expect(article).toMatchObject({ cle: "zinguerie/zinc/bobine-de-zinc/naturel-0-65-mm-largeur-500-mm", designation: "Bobine de zinc naturel · 0,65 mm · largeur 500 mm", unite: "m" });
    // L'ancien métier demandé (un lien gardé, un brouillon) ouvre le catalogue qui le comprend.
    expect((await a.agent.get("/v1/catalogue?metier=etancheite").expect(200)).body.metier).toBe("couverture");
    // Un produit partagé : la laine de verre des plaquistes se lit aussi sous Couverture › Isolation, à la MÊME clé.
    const isolation = r.rayons[0]!.familles.find((f) => f.libelle === "Isolation")!;
    const plaquiste = (await a.agent.get("/v1/catalogue?metier=platrerie_isolation").expect(200)).body.rayons as Rayon[];
    const cles = (p: Produit): string[] => (p.choix ? (function f(n: Choix): string[] { return n.options.flatMap((o) => (o.suite ? f(o.suite) : [o.article!.cle])); })(p.choix) : [p.article!.cle]);
    const laine = (ps: Produit[]) => cles(ps.find((p) => p.libelle === "Laine de verre en rouleau")!).sort();
    expect(laine(isolation.produits)).toEqual(laine(plaquiste.find((x) => x.libelle === "Isolation")!.familles[0]!.produits));
    expect(await ctx.prisma.catalogueArticle.count({ where: { produit: "Laine de verre en rouleau" } })).toBe(laine(isolation.produits).length);
  });

  it("la recherche directe dit où l'article se range, ce que son format précise, et ce qui reste à préciser", async () => {
    const a = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    const cherche = async (q: string) => (await a.agent.get(`/v1/catalogue?q=${encodeURIComponent(q)}`).expect(200)).body.resultats as { designation: string; chemin: { catalogue: string; rayon: string; famille: string; produit: string }; autresCatalogues: string[]; caracteristiques: string[]; precisions: string[] }[];
    const bobine = (await cherche("bobine zinc"))[0]!;
    expect(bobine.chemin).toEqual({ catalogue: "Couverture", rayon: "Zinguerie", famille: "Feuilles, bobines, bobineaux et bandes", produit: "Bobine" });
    expect(bobine.caracteristiques).toEqual(["naturel", "0,65 mm", "largeur 500 mm"]);
    const prise = (await cherche("prise 16 A étanche"))[0]!;
    expect(prise.chemin).toMatchObject({ catalogue: "Électricité", rayon: "Appareillage" });
    expect(prise.precisions).toEqual(["étanche"]);
    const laine = (await cherche("laine de verre rouleau 100"))[0]!;
    expect(laine.chemin.catalogue).toBe("Plaques de plâtre et isolation");
    expect(laine.autresCatalogues).toEqual(["Couverture"]);
    expect((await cherche("plaque hydro 13"))[0]!.designation).toMatch(/^Plaque de plâtre hydrofuge BA13/);
  });

  it("deux entreprises lisent le même catalogue ; l'intitulé écrit par l'une n'est jamais montré à l'autre", async () => {
    const a = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    const b = await signUpWithCompany(ctx.app, "b@toitures.fr", "Toitures B", ["roofing"]);
    await a.agent.post("/v1/quantitatifs").send({ lignes: [{ libelle: "Paratonnerre à tige maison", quantite: "1", unite: "pièces" }] }).expect(201);
    const ra = (await a.agent.get("/v1/catalogue").expect(200)).body.rayons;
    expect((await b.agent.get("/v1/catalogue").expect(200)).body.rayons).toEqual(ra);
    expect((await b.agent.get("/v1/catalogue?q=paratonnerre").expect(200)).body.ecrits).toEqual([]);
    expect((await b.agent.get("/v1/catalogue").set("x-company-id", a.companyId)).status).toBeGreaterThanOrEqual(400);
  });
});

describe("la synchronisation explicite du catalogue", { timeout: 240_000 }, () => {
  async function admin() {
    const greg = await couvreurAvecListe(ctx, "greg@example.fr", "Bati Invest", "6 impasse du Ouipoure, 22620 Ploubazlanec", [{ libelle: "Ardoise naturelle 32×22 Espagne 1er choix", quantite: "10", unite: "pièces" }]);
    await doubleAuthentification(ctx, greg.agent, "greg@example.fr");
    return greg;
  }

  it("LIRE N'AJOUTE PLUS RIEN ; l'admin synchronise : relevé avant et après, seuls les absents entrent, rien n'est écrasé ni supprimé, rejouée elle n'ajoute rien", async () => {
    const greg = await admin();
    const a = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    // Base vide (première installation) : la première lecture pose l'amorce entière, une fois.
    await a.agent.get("/v1/catalogue").expect(200);
    expect(await ctx.prisma.catalogueArticle.count()).toBe(TOUT_LE_CATALOGUE.length);
    // Un ancien quantitatif, avec un article du catalogue : il ne doit jamais changer.
    const q = (await a.agent.post("/v1/quantitatifs").send({ lignes: [{ libelle: "Bobine de zinc naturel · 0,65 mm · largeur 500 mm", quantite: "40", unite: "m" }] }).expect(201)).body as { id: string };
    const ancien = JSON.stringify((await a.agent.get(`/v1/quantitatifs/${q.id}`).expect(200)).body);
    // La base d'un environnement en retard sur le code : 172 articles d'étanchéité absents, un article renommé et un
    // masqué par l'admin, un article ajouté par l'admin, une ancienne clé que l'amorce ne connaît plus.
    await ctx.prisma.catalogueArticle.deleteMany({ where: { metier: "etancheite" } });
    const renomme = "couverture/ardoises/ardoise-naturelle/32x22-espagne-1er-choix";
    await ctx.prisma.catalogueArticle.update({ where: { cle: renomme }, data: { designation: "Ardoise d'Espagne 32×22, premier choix", masque: true } });
    const ajout = (await greg.agent.post("/v1/admin/catalogue").send({ metier: "couverture", famille: "Paratonnerres", produit: "Paratonnerre à tige", variante: null, designation: null, unite: "pièces", synonymes: [] }).expect(201)).body as { cle: string };
    await ctx.prisma.catalogueArticle.create({ data: { cle: "zinguerie/zinc/feuille-de-zinc-2x1-m/ancienne-cle", metier: "zinguerie", famille: "Zinc", produit: "Feuille de zinc 2 × 1 m", variante: "ancienne clé", designation: "Feuille de zinc 2 × 1 m ancienne clé", unite: "pièces", ordre: 9999 } });
    const avantLecture = await empreinte();

    // 1. La lecture d'un artisan n'ajoute plus rien.
    const lu = (await a.agent.get("/v1/catalogue").expect(200)).body.rayons as Rayon[];
    expect(lu.map((r) => r.libelle)).toEqual(["Couverture", "Zinguerie", "Autres produits"]);
    expect(lu.at(-1)!.familles.map((f) => f.libelle)).toEqual(["Paratonnerres"]);
    await a.agent.get("/v1/catalogue?q=membrane").expect(200);
    expect(await empreinte()).toEqual(avantLecture);

    // 2. Réservée à l'admin ; le relevé ne touche à rien.
    expect((await a.agent.get("/v1/admin/catalogue/synchronisation")).status).toBe(403);
    expect((await a.agent.post("/v1/admin/catalogue/synchronisation")).status).toBe(403);
    const etat = (await greg.agent.get("/v1/admin/catalogue/synchronisation").expect(200)).body;
    expect(etat).toEqual({ enBase: TOUT_LE_CATALOGUE.length - 172 + 2, dansLAmorce: TOUT_LE_CATALOGUE.length, aAjouter: 172, aAjouterParMetier: { etancheite: 172 }, horsAmorce: 2 });
    expect(await empreinte()).toEqual(avantLecture);

    // 3. La synchronisation : seuls les absents entrent.
    const r = (await greg.agent.post("/v1/admin/catalogue/synchronisation").expect(200)).body;
    expect(r.ajoutes).toBe(172);
    expect(r.avant).toEqual(etat);
    expect(r.apres).toEqual({ enBase: TOUT_LE_CATALOGUE.length + 2, dansLAmorce: TOUT_LE_CATALOGUE.length, aAjouter: 0, aAjouterParMetier: {}, horsAmorce: 2 });
    const apres = await empreinte();
    // Chaque ligne d'avant est là, identique (renommée, masquée, ajoutée, ancienne clé comprises) ; rien n'est supprimé.
    for (const ligne of avantLecture) expect(apres).toContain(ligne);
    expect(apres.length).toBe(avantLecture.length + 172);
    expect(await ctx.prisma.catalogueArticle.findUnique({ where: { cle: renomme } })).toMatchObject({ designation: "Ardoise d'Espagne 32×22, premier choix", masque: true });
    expect(await ctx.prisma.catalogueArticle.findUnique({ where: { cle: ajout.cle } })).toMatchObject({ ajoute: true });

    // 4. Rejouée, deux fois, y compris en parallèle : aucun doublon, aucune écriture.
    const [x, y] = await Promise.all([greg.agent.post("/v1/admin/catalogue/synchronisation").expect(200), greg.agent.post("/v1/admin/catalogue/synchronisation").expect(200)]);
    expect([x.body.ajoutes, y.body.ajoutes]).toEqual([0, 0]);
    expect(await empreinte()).toEqual(apres);
    expect(await ctx.prisma.catalogueArticle.count()).toBe(TOUT_LE_CATALOGUE.length + 2);

    // 5. L'étanchéité est revenue sous Couverture ; l'ancien quantitatif est identique ; le geste est au journal.
    expect(((await a.agent.get("/v1/catalogue").expect(200)).body.rayons as Rayon[]).map((x0) => x0.libelle)).toEqual(["Couverture", "Zinguerie", "Étanchéité et toitures-terrasses", "Autres produits"]);
    expect(JSON.stringify((await a.agent.get(`/v1/quantitatifs/${q.id}`).expect(200)).body)).toBe(ancien);
    const journal = await ctx.prisma.journalAdmin.findMany({ where: { action: "catalogue:synchronisation" }, orderBy: { createdAt: "asc" } });
    expect(journal).toHaveLength(3);
    expect(journal[0]!.cible).toBe(`172 ajoutés ; ${TOUT_LE_CATALOGUE.length - 170} → ${TOUT_LE_CATALOGUE.length + 2} articles`);
  });

  it("performances : le catalogue Couverture complet (plus de 1 300 articles) se lit en moins de 2 s, une recherche en moins d'1 s", async () => {
    const a = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    await a.agent.get("/v1/catalogue").expect(200);
    const t0 = performance.now();
    const corps = (await a.agent.get("/v1/catalogue").expect(200)).text;
    const lecture = performance.now() - t0;
    const t1 = performance.now();
    await a.agent.get("/v1/catalogue?q=gouttiere%20demi%20ronde%2033").expect(200);
    const recherche = performance.now() - t1;
    console.log(`catalogue Couverture : ${Math.round(lecture)} ms, ${Math.round(corps.length / 1024)} ko ; recherche : ${Math.round(recherche)} ms`);
    expect(lecture).toBeLessThan(2000);
    expect(recherche).toBeLessThan(1000);
  });
});
