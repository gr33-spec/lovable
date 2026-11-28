import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { checkReferential, computeWorkItem, isCoastal, ROOFING_REFERENTIAL, type Referential, type WorkItemInput } from "../src/index.js";
import { REFERENTIEL_COMPLET } from "./support/complet.js";

/**
 * ARDOISE AU CROCHET, données fabricant (référentiel §34, Cupa) :
 *  - ardoises/m² = 1 / [pureau × (largeur + Ø crochet)], Ø 1 mm, inox 2,7 mm en département littoral ;
 *  - crochets = un par ardoise COMMANDÉE (après sa marge) : jamais moins de crochets que d'ardoises (fiche couverture) ;
 *  - le recouvrement se lit par région ardoise (I / II / III), pas par zone climatique des tuiles.
 */
const need = (r: ReturnType<typeof computeWorkItem>, id: string) => r.needs.find((n) => n.needId === id)!;
// Le nombre de pièces à commander. Les crochets se commandent en boîtes de 500 (Greg, 21 novembre 2026) : leur nombre de
// pièces est celui du besoin, écrit sur la ligne.
// Règle changée (Greg, 22 novembre 2026) : en pose à agrafe, 4 crochets sur 5 à agrafe et 1 sur 5 à pointe (deux lignes) ;
// « crochets-ardoise » compte ici le TOTAL des deux lignes (avant : une seule ligne, un crochet par ardoise).
const pieces = (r: ReturnType<typeof computeWorkItem>, id: string) => Math.ceil(Number(need(r, id).quantity?.value));
const order = (r: ReturnType<typeof computeWorkItem>, id: string) =>
  id === "crochets-ardoise" ? pieces(r, "crochets-ardoise") + pieces(r, "crochets-ardoise-pointe") : Number(need(r, id).purchase?.order.count);
// Le partage 4/5, 1/5 d'une pose à agrafe : agrafes = arrondi sup (ardoises × 0,8), pointes = arrondi sup (ardoises × 0,2).
const partage = (r: ReturnType<typeof computeWorkItem>) => {
  const ardoises = order(r, "ardoises");
  expect(pieces(r, "crochets-ardoise")).toBe(Math.ceil(ardoises * 0.8));
  expect(pieces(r, "crochets-ardoise-pointe")).toBe(Math.ceil(ardoises * 0.2));
};
const input = (params: WorkItemInput["params"] = {}, format = "ardoise-30x22", waste?: Record<string, string>): WorkItemInput => ({
  workItemId: "couverture-ardoises-crochet",
  // La qualité de l'ardoise (question du comptoir, §47.8) : habitude de l'entreprise.
  // Règle changée (Greg, 21 novembre 2026) : sans gouttière écrite, l'égout se demande (« Tes m² d'ardoise comprennent déjà
  // l'égout et les coupes ? »). Ici l'artisan a répondu « Oui » : rien n'est ajouté, les quantités d'avant restent.
  params: {
    surface: { value: "200", unit: "m2", origin: "devis", evidence: "Devis, ligne 1" },
    qualite_ardoise: { value: "1", unit: "u", origin: "artisan", evidence: "Habitude de votre entreprise" },
    egout_compris: { value: "1", unit: "u", origin: "artisan" },
    // Règle changée (Greg, 22 novembre 2026) : sans type de crochet écrit, « Agrafe ou pointe ? » (avant : aucune question, un
    // crochet par ardoise). Ici l'artisan a répondu « À agrafe ».
    type_crochet: { value: "1", unit: "u", origin: "artisan" },
    ...params,
  },
  products: { ardoise: { productId: format, origin: "devis" } },
  mentioned: ["ardoise"],
  ...(waste ? { preferences: { waste } } : {}),
});
const littoral = { diametre_crochet: { value: "2.7", unit: "mm", origin: "devis" as const, evidence: "Département littoral (29200)" } };

// Pureau donné : il fixe le recouvrement posé (hauteur − 2 × pureau), quelle que soit la pente.
const pureau = (cm: string) => ({ pureau: { value: cm, unit: "cm", origin: "artisan" as const } });

describe("recouvrement du NF DTU 40.11 (fiche couverture, 2026-11-19)", () => {
  it("par défaut (45°, région III, rampant ≤ 5,50 m) : recouvrement 89 mm, pureau 10,55 cm, 42,5 ardoises/m² (table Cupa) → 8 925", () => {
    const r = computeWorkItem(REFERENTIEL_COMPLET, input());
    expect(need(r, "ardoises").trace.find((t) => t.label === "Recouvrement")?.value).toBe("89");
    expect(need(r, "ardoises").trace).toContainEqual(expect.objectContaining({ label: "Ardoises au m² (table Cupa Pizarras)", value: "42,5" }));
    // 200 × 42,5 = 8 500 + 5 % = 8 925 (avant, ancien tableau : recouvrement 95 mm, 9 271).
    expect(order(r, "ardoises")).toBe(8925);
    // À agrafe : 8 925 × 0,8 = 7 140 agrafes, 8 925 × 0,2 = 1 785 pointes ; 7 140 + 1 785 = 8 925 crochets en tout.
    expect(pieces(r, "crochets-ardoise")).toBe(7140);
    expect(pieces(r, "crochets-ardoise-pointe")).toBe(1785);
    expect(order(r, "crochets-ardoise")).toBe(8925);
  });
});

describe("situation exposée (NF DTU 40.11 2020, Cupa, Rathscheck ; fiche couverture, 2026-11-20)", () => {
  const expose = (zone: string, pente = "45") =>
    computeWorkItem(REFERENTIEL_COMPLET, input({ zone: { value: zone, unit: "u", origin: "artisan" }, pente: { value: pente, unit: "°", origin: "artisan" }, situation: { value: "2", unit: "u", origin: "devis", evidence: "Commune au bord de mer" } }));
  it("région III exposée : supplement_expose et coef_expose, la plus forte de R + 10 mm et R × 1,10 (45° : 89 → 99 mm)", () => {
    expect(need(expose("3"), "ardoises").trace.find((t) => t.label === "Recouvrement")?.value).toBe("99");
    // 30° : 119 → max(129, 130,9) = 131 mm (au mm supérieur).
    expect(need(expose("3", "30"), "ardoises").trace.find((t) => t.label === "Recouvrement")?.value).toBe("131");
  });
  it("régions I et II exposées : rien n'est ajouté (non confirmé par deux sources)", () => {
    expect(need(expose("2"), "ardoises").trace.find((t) => t.label === "Recouvrement")?.value).toBe("80");
  });
});

describe("formule Cupa (§34) : le diamètre du crochet compte", () => {
  it("200 m² en 30×22, recouvrement posé 95 mm (pureau 10,25 cm), crochet 1 mm : 9 271 ardoises", () => {
    const r = computeWorkItem(REFERENTIEL_COMPLET, input(pureau("10.25")));
    // Pureau (300 − 95) / 2 = 102,5 mm ; 200 / (0,1025 × 0,221) = 8 829,05 ; + 5 % = 9 270,50.
    expect(need(r, "ardoises").trace.find((t) => t.label === "Besoin calculé")?.value).toBe("8 829,05");
    expect(order(r, "ardoises")).toBe(9271);
  });

  it("département littoral (Brest), recouvrement posé 95 mm : crochet inox 2,7 mm, 9 200 ardoises", () => {
    const r = computeWorkItem(REFERENTIEL_COMPLET, input({ ...littoral, ...pureau("10.25") }));
    // 200 / (0,1025 × 0,2227) = 8 761,65 ; + 5 % = 9 199,73.
    expect(order(r, "ardoises")).toBe(9200);
    // Un crochet par ardoise commandée (fiche couverture, 2026-11-19 ; avant × 1,02 = 9 384).
    // À agrafe : 9 200 × 0,8 = 7 360 agrafes + 9 200 × 0,2 = 1 840 pointes = 9 200.
    expect(pieces(r, "crochets-ardoise")).toBe(7360);
    expect(pieces(r, "crochets-ardoise-pointe")).toBe(1840);
    expect(order(r, "crochets-ardoise")).toBe(9200);
    expect(need(r, "ardoises").trace).toContainEqual(expect.objectContaining({ label: "Diamètre du crochet", value: "2,7", unit: "mm", origin: "devis" }));
  });

  it("la région ardoise se dit en chiffres romains : « région ardoise III », jamais « zone climatique 3 »", () => {
    const r = computeWorkItem(REFERENTIEL_COMPLET, input());
    const labels = need(r, "ardoises").trace.map((t) => t.label);
    expect(labels).toContain("Région ardoise");
    expect(labels).not.toContain("Zone climatique");
    expect(need(r, "ardoises").trace.find((t) => t.label === "Région ardoise")).toMatchObject({ value: "3", shown: "III" });
    expect(need(r, "ardoises").assumptions.find((a) => a.key === "param:zone")).toMatchObject({ label: "Région ardoise", value: "III" });
    const r1 = computeWorkItem(REFERENTIEL_COMPLET, input({ zone: { value: "1", unit: "u", origin: "artisan" } }));
    expect(need(r1, "ardoises").trace.find((t) => t.label === "Région ardoise")).toMatchObject({ value: "1", shown: "I" });
  });
});

describe("table Cupa (§34) : elle fait foi, la formule ne sert que hors table", () => {
  // Une ligne précise de la table Cupa : par le pureau (recouvrement posé = hauteur − 2 × pureau).
  const atR = (r: number, diametre = "1", format = "ardoise-30x22", hauteur = 300) =>
    computeWorkItem(REFERENTIEL_COMPLET, input({ ...pureau(String((hauteur - r) / 20)), diametre_crochet: { value: diametre, unit: "mm", origin: "artisan" } }, format));
  const at = (pente: string, zone: string, diametre = "1", format = "ardoise-30x22") =>
    computeWorkItem(
      REFERENTIEL_COMPLET,
      input({
        pente: { value: pente, unit: "°", origin: "artisan" },
        zone: { value: zone, unit: "u", origin: "artisan" },
        diametre_crochet: { value: diametre, unit: "mm", origin: "artisan" },
      }, format),
    );

  it("30×22 à R 100 : 44,8 ardoises/m² lues dans la table, 8 960 + 5 % = 9 408", () => {
    const r = atR(100);
    expect(need(r, "ardoises").trace).toContainEqual(expect.objectContaining({ label: "Ardoises au m² (table Cupa Pizarras)", value: "44,8", unit: "u/m2" }));
    expect(order(r, "ardoises")).toBe(9408);
  });

  it("sur une ligne de la table, le diamètre du crochet reste affiché et modifiable, mais ne change pas le nombre", () => {
    const fin = atR(100, "1");
    const inox = atR(100, "2.7");
    expect(order(fin, "ardoises")).toBe(order(inox, "ardoises"));
    expect(need(inox, "ardoises").trace).toContainEqual(expect.objectContaining({ label: "Diamètre du crochet", value: "2,7" }));
  });

  it("32×22 à R 100 : 40,7/m² (et non plus 41,3 de l'ancien §3)", () => {
    expect(need(atR(100, "1", "ardoise-32x22", 320), "ardoises").trace).toContainEqual(expect.objectContaining({ label: "Ardoises au m² (table Cupa Pizarras)", value: "40,7" }));
  });

  it("hors table (30×22 à R 95) : la formule Cupa, dite « hors table », avec le diamètre du crochet", () => {
    const fin = atR(95, "1");
    const inox = atR(95, "2.7");
    expect(need(fin, "ardoises").trace).toContainEqual(expect.objectContaining({ label: "Ardoises au m² (formule Cupa Pizarras, hors table)" }));
    expect(order(fin, "ardoises")).toBe(9271);
    expect(order(inox, "ardoises")).toBe(9200);
  });

  it("les 194 lignes du code sont celles du référentiel (§34), à la décimale près", () => {
    const doc = readFileSync(new URL("../../../docs/referentiel-couverture.md", import.meta.url), "utf8");
    const section = doc.slice(doc.indexOf("## 34."), doc.indexOf("## 35."));
    const fromDoc = [...section.matchAll(/^\|\s*(\d+)\s*\|\s*(\d+)×(\d+)\s*\|\s*[\d,]+\s*\|\s*([\d,]+)\s*\|/gm)].map((m) => [m[2], m[3], m[1], m[4]!.replace(",", ".")]);
    const work = REFERENTIEL_COMPLET.workItems.find((w) => w.id === "couverture-ardoises-crochet")!;
    expect(fromDoc).toHaveLength(194);
    expect(work.points!.ardoises_m2!.rows).toEqual(fromDoc);
  });

  it("format écrit sur le devis, hors plage Cupa (30×22 à 30°, région III : R 119 au DTU, maximum 100) : gardé, calculé par la formule, dit « estimation », le 40×22 en conseil", () => {
    const r = at("30", "3");
    const ardoises = need(r, "ardoises");
    // Pas de question bloquante : le devis fait foi sur le format.
    expect(ardoises.status).toBe("calculated");
    expect(ardoises.question).toBeUndefined();
    expect(ardoises.trace).toContainEqual(expect.objectContaining({ label: "Ardoises au m² (formule Cupa Pizarras, hors table)" }));
    const estimation = ardoises.trace.find((t) => t.label === "Estimation")!;
    expect(estimation).toMatchObject({ estimation: true, from: "Format écrit sur le devis, gardé" });
    expect(estimation.value).toBe("Recouvrement posé 119 mm hors table Cupa Pizarras (au-delà du maximum de 100 mm pour ce format).");
    // Greg, 28 novembre 2026 : le format écrit n'est jamais redemandé, aucun autre format « conseillé » (avant : une hypothèse
    // à boutons « 30×22 (devis) / 40×22 (conseillé) », posée comme une question « Ardoises ? »).
    expect(ardoises.assumptions.find((a) => a.key === "product:ardoise")).toBeUndefined();
    // Les crochets suivent (agrafes + pointes).
    expect(order(r, "crochets-ardoise")).toBeGreaterThanOrEqual(order(r, "ardoises"));
    partage(r);
  });

  it("format venu d'une habitude de l'entreprise (le devis ne le précise pas), hors plage : UNE question à boutons, les formats admis (le plus proche d'abord, sans « conseillé »)", () => {
    const r = computeWorkItem(REFERENTIEL_COMPLET, {
      ...input({ pente: { value: "30", unit: "°", origin: "artisan" }, zone: { value: "3", unit: "u", origin: "artisan" } }),
      products: {},
      preferences: { products: { ardoise: "ardoise-30x22" } },
    });
    const ardoises = need(r, "ardoises");
    expect(ardoises).toMatchObject({ status: "question", question: { key: "product:ardoise", kind: "choose_product" } });
    expect(ardoises.question!.text).toBe("Ardoises 30×22 non admis ici : recouvrement posé 119 mm, au-delà du maximum de 100 mm pour ce format (Cupa Pizarras). Quel format ?");
    expect(ardoises.question!.options![0]).toEqual({ label: "Ardoises 40×22", value: "ardoise-40x22" });
    // Les crochets attendent la même réponse ; rien n'est inventé entre-temps.
    expect(need(r, "crochets-ardoise")).toMatchObject({ status: "question", question: { key: "product:ardoise" } });
    // L'artisan choisit : plus de question, et son choix est gardé même hors plage.
    const chosen = computeWorkItem(REFERENTIEL_COMPLET, { ...input({ pente: { value: "30", unit: "°", origin: "artisan" }, zone: { value: "3", unit: "u", origin: "artisan" } }), products: { ardoise: { productId: "ardoise-30x22", origin: "artisan" } } });
    expect(need(chosen, "ardoises").status).toBe("calculated");
  });

  it("dans les bornes, aucune question de format (30×22 de 69 à 100 mm)", () => {
    for (const [pente, zone] of [["45", "1"], ["45", "3"], ["40", "3"], ["50", "2"]] as const) expect(need(at(pente, zone), "ardoises").status).toBe("calculated");
  });

  it("la région ardoise est marquée « estimation » (zone climatique du département, en attendant le DTU 40.11)", () => {
    expect(need(at("45", "3"), "ardoises").trace.find((t) => t.label === "Région ardoise")).toMatchObject({ estimation: true });
  });
});

describe("jamais moins de crochets que d'ardoises", () => {
  const formats = REFERENTIEL_COMPLET.products.filter((p) => p.family === "roof_slate").map((p) => p.id);
  const cases: { label: string; r: ReturnType<typeof computeWorkItem> }[] = [];
  for (const format of formats)
    for (const pente of ["25", "30", "35", "45", "60"])
      for (const zone of ["1", "2", "3"])
        for (const diametre of ["1", "2.7"])
          for (const waste of [undefined, { roof_slate: "0" }, { roof_slate: "10" }, { roof_slate: "15", slate_hook: "0" }]) {
            const params = {
              pente: { value: pente, unit: "°", origin: "artisan" as const },
              zone: { value: zone, unit: "u", origin: "artisan" as const },
              diametre_crochet: { value: diametre, unit: "mm", origin: "artisan" as const },
            };
            cases.push({ label: `${format} ${pente}° région ${zone} Ø${diametre} marge ${JSON.stringify(waste ?? "référentiel")}`, r: computeWorkItem(REFERENTIEL_COMPLET, input(params, format, waste)) });
          }

  it(`${cases.length} cas (formats, pentes, régions, crochets, marges de l'entreprise) : crochets ≥ ardoises, toujours`, () => {
    const wrong = cases
      .filter((c) => need(c.r, "ardoises").status === "calculated")
      .filter((c) => order(c.r, "crochets-ardoise") < order(c.r, "ardoises"))
      .map((c) => `${c.label} : ${order(c.r, "crochets-ardoise")} crochets < ${order(c.r, "ardoises")} ardoises`);
    expect(wrong).toEqual([]);
    // Et le partage d'une pose à agrafe : 4/5 à agrafe, 1/5 à pointe, chacun arrondi au-dessus.
    const malPartages = cases
      .filter((c) => need(c.r, "ardoises").status === "calculated")
      .filter((c) => pieces(c.r, "crochets-ardoise") !== Math.ceil(order(c.r, "ardoises") * 0.8) || pieces(c.r, "crochets-ardoise-pointe") !== Math.ceil(order(c.r, "ardoises") * 0.2))
      .map((c) => c.label);
    expect(malPartages).toEqual([]);
    expect(cases.filter((c) => need(c.r, "ardoises").status === "calculated").length).toBeGreaterThan(100);
  });

  it("les crochets suivent les ardoises : une question sur les ardoises est aussi celle des crochets", () => {
    // Le type de crochet répondu (« À agrafe ») : la seule question qui reste est celle des ardoises.
    const sansSurface: WorkItemInput = { ...input(), params: { type_crochet: { value: "1", unit: "u", origin: "artisan" } } };
    const r = computeWorkItem(REFERENTIEL_COMPLET, sansSurface);
    expect(need(r, "ardoises").status).toBe("question");
    expect(need(r, "crochets-ardoise")).toMatchObject({ status: "question", question: { key: need(r, "ardoises").question!.key } });
  });

  it("un besoin ne peut partir que d'un besoin calculé AVANT lui (contrôlé au chargement du référentiel)", () => {
    const broken: Referential = structuredClone(REFERENTIEL_COMPLET);
    const work = broken.workItems.find((w) => w.id === "couverture-ardoises-crochet")!;
    // Les crochets passent avant les ardoises dont ils partent : refusé.
    const crochets = work.needs.find((n) => n.id === "crochets-ardoise")!;
    work.needs = [crochets, ...work.needs.filter((n) => n !== crochets)];
    expect(checkReferential(broken).join("\n")).toMatch(/commande\.ardoises.*AVANT/);
    expect(checkReferential(REFERENTIEL_COMPLET)).toEqual([]);
  });
});

describe("département littoral (crochet inox d'office)", () => {
  it("Brest, Paimpol, Ajaccio, Marseille : oui ; Grenoble, Paris : non ; sans code postal : on ne sait pas", () => {
    expect(isCoastal("29200")).toBe(true);
    expect(isCoastal("22500")).toBe(true);
    expect(isCoastal("20000")).toBe(true);
    expect(isCoastal("13001")).toBe(true);
    expect(isCoastal("38000")).toBe(false);
    expect(isCoastal("75001")).toBe(false);
    expect(isCoastal(null)).toBeNull();
  });
});
