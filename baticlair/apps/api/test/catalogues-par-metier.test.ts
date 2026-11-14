import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { TOUT_LE_CATALOGUE } from "@baticlair/domain";
import { CatalogueService } from "../src/modules/catalogue/index.js";
import { doubleAuthentification } from "./support/admin.js";
import { couvreurAvecListe } from "./support/cycle.js";
import { createTestApp, resetDatabase, signUpWithCompany, type TestContext } from "./support/test-app.js";

/**
 * LES CATALOGUES PROFESSIONNELS PAR MÉTIER, PAR L'API (Greg, 12 novembre 2026 : « Métier › Rayon › Famille › Produit ›
 * Caractéristiques › Quantité […] ne conserve pas un
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
  // RÈGLE CHANGÉE (Greg, 13 novembre 2026, « cœur métier ») : Zinguerie et Étanchéité sont des métiers de premier niveau.
  it("un couvreur a trois catalogues à lui : Couverture, Zinguerie, Étanchéité ; métier › famille › sous-famille › produit › caractéristiques, jusqu'à UN article à sa clé", async () => {
    const a = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    const r = (await a.agent.get("/v1/catalogue").expect(200)).body as { metiers: { code: string; libelle: string; mien: boolean }[]; metier: string; rayons: Rayon[] };
    expect(r.metier).toBe("couverture");
    expect(r.metiers.filter((m) => m.mien).map((m) => m.code)).toEqual(["couverture", "zinguerie", "etancheite"]);
    expect(r.metiers.find((m) => m.code === "platrerie_isolation")!.libelle).toBe("Plaques de plâtre et isolation");
    // Couverture ne montre ni zinguerie ni étanchéité ; ses familles, et une sous-famille seulement pour les tuiles.
    expect(r.rayons.map((x) => x.libelle)).toEqual(["Ardoises", "Tuiles en terre cuite", "Tuiles béton", "Accessoires de tuiles", "Bacs et plaques", "Bardeaux, pierre et bois", "Écrans et pare-vapeur", "Isolation de toiture", "Bois de couverture", "Faîtage et ventilation", "Fenêtres et sorties de toit", "Solins et raccords", "Fixations", "Sécurité, accès et entretien"]);
    expect(r.rayons.filter((x) => x.familles.length > 1).map((x) => x.libelle)).toEqual(["Tuiles en terre cuite"]);
    const z = (await a.agent.get("/v1/catalogue?metier=zinguerie").expect(200)).body as { metier: string; rayons: Rayon[] };
    expect(z.metier).toBe("zinguerie");
    expect(z.rayons.map((x) => x.libelle)).toEqual(["Gouttières et descentes", "Feuilles, bobines et bandes", "Couverture métallique et joint debout", "Rives, solins et habillages", "Soudure et consommables"]);
    const bobine = z.rayons[1]!.familles[0]!.produits.find((p) => p.libelle === "Bobine")!;
    expect(bobine.indication).toBe("Matériau, finition, épaisseur, largeur");
    expect(bobine.choix!.options.map((o) => o.valeur)).toEqual(["zinc", "cuivre"]);
    const zinc = bobine.choix!.options[0]!.suite!;
    expect(zinc.nom).toBe("Finition");
    const article = zinc.options[0]!.suite!.options[0]!.suite!.options[0]!.article!;
    expect(article).toMatchObject({ cle: "zinguerie/zinc/bobine-de-zinc/naturel-0-65-mm-largeur-500-mm", designation: "Bobine de zinc naturel · 0,65 mm · largeur 500 mm", unite: "m" });
    const e = (await a.agent.get("/v1/catalogue?metier=etancheite").expect(200)).body as { metier: string; rayons: Rayon[] };
    expect(e.metier).toBe("etancheite");
    expect(e.rayons.map((x) => x.libelle)).toEqual(["Membranes bitumineuses", "Membranes synthétiques", "Étanchéité liquide", "Pare-vapeur", "Isolation de toiture-terrasse", "Relevés et protections", "Évacuation des eaux", "Accessoires et fixations"]);
    // Un produit partagé : la laine de verre des plaquistes se lit aussi sous Couverture › Isolation de toiture, à la MÊME clé.
    const isolation = r.rayons.find((x) => x.libelle === "Isolation de toiture")!.familles[0]!;
    const plaquiste = (await a.agent.get("/v1/catalogue?metier=platrerie_isolation").expect(200)).body.rayons as Rayon[];
    const cles = (p: Produit): string[] => (p.choix ? (function f(n: Choix): string[] { return n.options.flatMap((o) => (o.suite ? f(o.suite) : [o.article!.cle])); })(p.choix) : [p.article!.cle]);
    const laine = (ps: Produit[]) => cles(ps.find((p) => p.libelle === "Laine de verre en rouleau")!).sort();
    expect(laine(isolation.produits)).toEqual(laine(plaquiste.find((x) => x.libelle === "Isolation")!.familles[0]!.produits));
    expect(await ctx.prisma.catalogueArticle.count({ where: { produit: "Laine de verre en rouleau" } })).toBe(laine(isolation.produits).length);
  });

  it("la recherche directe dit le métier, la famille et l'article ; jamais deux résultats identiques ; ce qui reste à préciser est dit", async () => {
    const a = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    const cherche = async (q: string) => (await a.agent.get(`/v1/catalogue?q=${encodeURIComponent(q)}`).expect(200)).body.resultats as { cle: string; designation: string; unite: string; chemin: { catalogue: string; rayon: string; famille: string; produit: string }; autresCatalogues: string[]; caracteristiques: string[]; precisions: string[] }[];
    const bobine = (await cherche("bobine zinc"))[0]!;
    expect(bobine.chemin).toEqual({ catalogue: "Zinguerie", rayon: "Feuilles, bobines et bandes", famille: "Feuilles, bobines et bandes", produit: "Bobine" });
    expect(bobine.caracteristiques).toEqual(["naturel", "0,65 mm", "largeur 500 mm"]);
    const prise = (await cherche("prise 16 A étanche"))[0]!;
    expect(prise.chemin).toMatchObject({ catalogue: "Électricité", rayon: "Appareillage" });
    expect(prise.precisions).toEqual(["étanche"]);
    const laine = (await cherche("laine de verre rouleau 100"))[0]!;
    expect(laine.chemin.catalogue).toBe("Plaques de plâtre et isolation");
    expect(laine.autresCatalogues).toEqual(["Couverture"]);
    expect((await cherche("plaque hydro 13"))[0]!.designation).toMatch(/^Plaque de plâtre hydrofuge BA13/);
    // Le pare-vapeur 1,50 × 50 m existe sous deux métiers (couverture et plâtrerie) : un seul résultat, l'autre métier est dit.
    const pare = (await cherche("pare-vapeur rouleau 1,50 50")).filter((x) => x.designation === "Pare-vapeur rouleau 1,50 × 50 m");
    expect(pare).toHaveLength(1);
    expect(pare[0]!.chemin.catalogue).toBe("Couverture");
    expect(pare[0]!.autresCatalogues).toContain("Plaques de plâtre et isolation");
    // Aucune recherche ne rend deux fois la même désignation dans la même unité.
    for (const q of ["zinc", "gouttiere", "pare vapeur", "membrane", "peinture plafond", "tuile", "vis"]) {
      const cles = (await cherche(q)).map((x) => `${x.designation.toLowerCase()}|${x.unite}`);
      expect(new Set(cles).size, q).toBe(cles.length);
    }
  });

  it("ANCIENS IDENTIFIANTS : un article écrit sous deux clés n'est proposé qu'une fois ; l'ancien reste en base, lisible par sa clé, jamais supprimé", async () => {
    const a = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    await a.agent.get("/v1/catalogue").expect(200);
    // La base de test porte 46 clés d'avant (« 2-x-1 » au lieu de « 2x1 ») : on en pose une, telle qu'elle y est.
    const garde = "zinguerie/zinc/feuille-de-zinc-2x1-m/naturel-0-65-mm";
    const ancienne = "zinguerie/zinc/feuille-de-zinc-2-x-1-m/naturel-0-65-mm";
    const modele = (await ctx.prisma.catalogueArticle.findUnique({ where: { cle: garde } }))!;
    await ctx.prisma.catalogueArticle.create({ data: { ...modele, cle: ancienne } });
    const avantLecture = await empreinte();
    const trouves = ((await a.agent.get("/v1/catalogue?q=feuille%20zinc%20naturel%200,65").expect(200)).body.resultats as { cle: string; designation: string }[]).filter((x) => x.designation === modele.designation);
    expect(trouves.map((x) => x.cle)).toEqual([garde]);
    const z = (await a.agent.get("/v1/catalogue?metier=zinguerie").expect(200)).text;
    expect(z).toContain(garde);
    expect(z).not.toContain(ancienne);
    // Rien n'a été écrit, et l'ancienne clé se lit toujours (une ligne d'achat groupé déjà saisie la retrouve).
    expect(await empreinte()).toEqual(avantLecture);
    expect(await ctx.prisma.catalogueArticle.findUnique({ where: { cle: ancienne } })).not.toBeNull();
    expect(await ctx.app.get(CatalogueService).article(ancienne)).toMatchObject({ cle: ancienne, designation: modele.designation });
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
    expect(lu.map((r) => r.libelle).at(-1)).toBe("Autres produits");
    expect(lu.map((r) => r.libelle)).toContain("Ardoises");
    // L'étanchéité, vidée de cette base en retard, n'a plus rien à montrer : la lire n'y ajoute rien non plus.
    expect((await a.agent.get("/v1/catalogue?metier=etancheite").expect(200)).body.rayons).toEqual([]);
    expect(lu.at(-1)!.familles.map((f) => f.libelle)).toEqual(["Paratonnerres"]);
    await a.agent.get("/v1/catalogue?q=membrane").expect(200);
    expect(await empreinte()).toEqual(avantLecture);

    // 2. Réservée à l'admin ; le relevé ne touche à rien.
    expect((await a.agent.get("/v1/admin/catalogue/synchronisation")).status).toBe(403);
    expect((await a.agent.post("/v1/admin/catalogue/synchronisation")).status).toBe(403);
    const etat = (await greg.agent.get("/v1/admin/catalogue/synchronisation").expect(200)).body;
    expect(etat).toMatchObject({ enBase: TOUT_LE_CATALOGUE.length - 172 + 2, dansLAmorce: TOUT_LE_CATALOGUE.length, aAjouter: 172, aAjouterParMetier: { etancheite: 172 }, horsAmorce: 2, anciensIdentifiants: 0 });
    // Le bilan par métier : ce qui est en base, ce qui entrerait, ce qu'aucune famille ne range (l'ajout de l'admin).
    expect(etat.bilanParMetier.find((b: { metier: string }) => b.metier === "etancheite")).toEqual({ metier: "etancheite", libelle: "Étanchéité", enBase: 0, aAjouter: 172, sansFamille: 0 });
    expect(etat.bilanParMetier.find((b: { metier: string }) => b.metier === "couverture")).toMatchObject({ aAjouter: 0, sansFamille: 1 });
    expect(etat.bilanParMetier).toHaveLength(12);
    expect(await empreinte()).toEqual(avantLecture);

    // 3. La synchronisation : seuls les absents entrent.
    const r = (await greg.agent.post("/v1/admin/catalogue/synchronisation").expect(200)).body;
    expect(r.ajoutes).toBe(172);
    expect(r.avant).toEqual(etat);
    expect(r.apres).toMatchObject({ enBase: TOUT_LE_CATALOGUE.length + 2, dansLAmorce: TOUT_LE_CATALOGUE.length, aAjouter: 0, aAjouterParMetier: {}, horsAmorce: 2 });
    expect(r.apres.bilanParMetier.find((b: { metier: string }) => b.metier === "etancheite")).toMatchObject({ enBase: 172, aAjouter: 0 });
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

    // 5. L'étanchéité est revenue, dans SON catalogue ; l'ancien quantitatif est identique ; le geste est au journal.
    expect(((await a.agent.get("/v1/catalogue?metier=etancheite").expect(200)).body.rayons as Rayon[]).map((x0) => x0.libelle)).toContain("Membranes bitumineuses");
    expect(JSON.stringify((await a.agent.get(`/v1/quantitatifs/${q.id}`).expect(200)).body)).toBe(ancien);
    const journal = await ctx.prisma.journalAdmin.findMany({ where: { action: "catalogue:synchronisation" }, orderBy: { createdAt: "asc" } });
    expect(journal).toHaveLength(3);
    expect(journal[0]!.cible).toBe(`172 ajoutés ; ${TOUT_LE_CATALOGUE.length - 170} → ${TOUT_LE_CATALOGUE.length + 2} articles`);
  });

  it("ADMIN : chercher dans tous les métiers, reclasser, rattacher à un second métier sans copie, marquer « à vérifier », voir les doublons, la source et la date ; tout au journal", async () => {
    const greg = await admin();
    const a = await signUpWithCompany(ctx.app, "a@toitures.fr", "Toitures A", ["roofing"]);
    await a.agent.get("/v1/catalogue").expect(200);
    expect((await a.agent.get("/v1/admin/catalogue?q=crapaudine")).status).toBe(403);
    type Admin = { articles: { cle: string; metier: string; designation: string; origine: string; modifieLe: string; chemins: string[]; aVerifier: boolean; metiersSecondaires: string[]; aliasDe: string | null }[]; doublons: { nature: string; cles: string[]; canonique: string | null }[] };
    // Chercher : l'article est trouvé quel que soit le métier ouvert, avec son métier, sa famille, sa source et sa date.
    const trouve = ((await greg.agent.get("/v1/admin/catalogue?metier=peinture&q=crapaudine").expect(200)).body as Admin).articles.find((x) => x.metier === "etancheite")!;
    expect(trouve).toMatchObject({ metier: "etancheite", aVerifier: false, metiersSecondaires: [], aliasDe: null });
    expect(trouve.chemins).toEqual(["Étanchéité · Évacuation des eaux"]);
    expect(trouve.origine.length).toBeGreaterThan(3);
    expect(Number.isNaN(Date.parse(trouve.modifieLe))).toBe(false);
    const nombre = await ctx.prisma.catalogueArticle.count();

    // Rattacher la crapaudine à la Zinguerie EN PLUS : une seule fiche, la même clé, lue dans les deux métiers.
    await greg.agent.patch(`/v1/admin/catalogue?cle=${encodeURIComponent(trouve.cle)}`).send({ metiersSecondaires: ["zinguerie"] }).expect(200);
    expect(await ctx.prisma.catalogueArticle.count()).toBe(nombre);
    const zing = (await a.agent.get("/v1/catalogue?metier=zinguerie").expect(200)).body.rayons as Rayon[];
    expect(zing.at(-1)!.libelle).toBe("Autres produits");
    expect(JSON.stringify(zing.at(-1))).toContain(trouve.cle);
    expect(JSON.stringify((await a.agent.get("/v1/catalogue?metier=etancheite").expect(200)).body.rayons)).toContain(trouve.cle);
    expect(JSON.stringify((await a.agent.get("/v1/catalogue?metier=couverture").expect(200)).body.rayons)).not.toContain(trouve.cle);
    const cherche = (await a.agent.get("/v1/catalogue?q=crapaudine").expect(200)).body.resultats as { cle: string; autresCatalogues: string[] }[];
    expect(cherche.filter((x) => x.cle === trouve.cle)).toHaveLength(1);
    expect(cherche.find((x) => x.cle === trouve.cle)!.autresCatalogues).toEqual(["Zinguerie"]);
    await greg.agent.patch(`/v1/admin/catalogue?cle=${encodeURIComponent(trouve.cle)}`).send({ metiersSecondaires: ["jardinage"] }).expect(400);

    // Marquer « à vérifier » : l'artisan le lit sur l'article ; rien d'autre ne change.
    await greg.agent.patch(`/v1/admin/catalogue?cle=${encodeURIComponent(trouve.cle)}`).send({ aVerifier: true }).expect(200);
    expect(((await a.agent.get("/v1/catalogue?q=crapaudine").expect(200)).body.resultats as { cle: string; aVerifier: boolean }[]).find((x) => x.cle === trouve.cle)!.aVerifier).toBe(true);

    // Reclasser : le métier principal change, la clé jamais.
    await greg.agent.patch(`/v1/admin/catalogue?cle=${encodeURIComponent(trouve.cle)}`).send({ metier: "zinguerie", metiersSecondaires: ["etancheite"] }).expect(200);
    expect(await ctx.prisma.catalogueArticle.findUnique({ where: { cle: trouve.cle } })).toMatchObject({ metier: "zinguerie", metiersSecondaires: ["etancheite"], aVerifier: true });
    await greg.agent.patch(`/v1/admin/catalogue?cle=${encodeURIComponent(trouve.cle)}`).send({ metier: "jardinage" }).expect(400);

    // Les doublons possibles : l'ancien identifiant (avec la clé gardée) et l'article partagé entre deux métiers.
    const modele = (await ctx.prisma.catalogueArticle.findUnique({ where: { cle: "zinguerie/zinc/feuille-de-zinc-2x1-m/naturel-0-65-mm" } }))!;
    await ctx.prisma.catalogueArticle.create({ data: { ...modele, cle: "zinguerie/zinc/feuille-de-zinc-2-x-1-m/naturel-0-65-mm" } });
    const liste = (await greg.agent.get("/v1/admin/catalogue?metier=zinguerie").expect(200)).body as Admin;
    expect(liste.doublons.find((d) => d.nature === "ancien_identifiant")).toEqual({ nature: "ancien_identifiant", designation: modele.designation, cles: expect.arrayContaining([modele.cle, "zinguerie/zinc/feuille-de-zinc-2-x-1-m/naturel-0-65-mm"]), canonique: modele.cle });
    expect(liste.doublons.some((d) => d.nature === "partage_entre_metiers")).toBe(true);
    expect(liste.articles.find((x) => x.cle === "zinguerie/zinc/feuille-de-zinc-2-x-1-m/naturel-0-65-mm")).toMatchObject({ aliasDe: modele.cle, origine: "Ancien identifiant" });
    expect((await greg.agent.get("/v1/admin/catalogue/synchronisation").expect(200)).body).toMatchObject({ anciensIdentifiants: 1, doublons: expect.objectContaining({ ancien_identifiant: 1 }) });

    // Chaque geste est au journal de l'admin.
    const journal = (await ctx.prisma.journalAdmin.findMany({ where: { action: { startsWith: "catalogue:" } }, orderBy: { createdAt: "asc" } })).map((j) => j.action);
    expect(journal).toEqual(["catalogue:classement", "catalogue:à vérifier", "catalogue:classement"]);
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
