import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { checkReferential, computeWorkItem, isCoastal, ROOFING_REFERENTIAL, type Referential, type WorkItemInput } from "../src/index.js";

/**
 * ARDOISE AU CROCHET, données fabricant (référentiel §34, Cupa) :
 *  - ardoises/m² = 1 / [pureau × (largeur + Ø crochet)], Ø 1 mm, inox 2,7 mm en département littoral ;
 *  - crochets = ardoises COMMANDÉES (après leur marge) × 1,02 : jamais moins de crochets que d'ardoises ;
 *  - le recouvrement se lit par région ardoise (I / II / III), pas par zone climatique des tuiles.
 */
const need = (r: ReturnType<typeof computeWorkItem>, id: string) => r.needs.find((n) => n.needId === id)!;
const order = (r: ReturnType<typeof computeWorkItem>, id: string) => Number(need(r, id).purchase?.order.count);
const input = (params: WorkItemInput["params"] = {}, format = "ardoise-30x22", waste?: Record<string, string>): WorkItemInput => ({
  workItemId: "couverture-ardoises-crochet",
  // La qualité de l'ardoise (question du comptoir, §47.8) : habitude de l'entreprise.
  params: { surface: { value: "200", unit: "m2", origin: "devis", evidence: "Devis, ligne 1" }, qualite_ardoise: { value: "1", unit: "u", origin: "artisan", evidence: "Habitude de votre entreprise" }, ...params },
  products: { ardoise: { productId: format, origin: "devis" } },
  mentioned: ["ardoise"],
  ...(waste ? { preferences: { waste } } : {}),
});
const littoral = { diametre_crochet: { value: "2.7", unit: "mm", origin: "devis" as const, evidence: "Département littoral (29200)" } };

describe("formule Cupa (§34) : le diamètre du crochet compte", () => {
  it("200 m² en 30×22, 45°, région III, crochet 1 mm : 9 271 ardoises (et non plus 9 313)", () => {
    const r = computeWorkItem(ROOFING_REFERENTIAL, input());
    // Pureau (300 − 95) / 2 = 102,5 mm ; 200 / (0,1025 × 0,221) = 8 829,05 ; + 5 % = 9 270,50.
    expect(need(r, "ardoises").trace.find((t) => t.label === "Besoin calculé")?.value).toBe("8 829,05");
    expect(order(r, "ardoises")).toBe(9271);
  });

  it("département littoral (Brest) : crochet inox 2,7 mm, 9 200 ardoises", () => {
    const r = computeWorkItem(ROOFING_REFERENTIAL, input(littoral));
    // 200 / (0,1025 × 0,2227) = 8 761,65 ; + 5 % = 9 199,73.
    expect(order(r, "ardoises")).toBe(9200);
    // Crochets = 9 200 × 1,02 = 9 384.
    expect(order(r, "crochets-ardoise")).toBe(9384);
    expect(need(r, "ardoises").trace).toContainEqual(expect.objectContaining({ label: "Diamètre du crochet", value: "2,7", unit: "mm", origin: "devis" }));
  });

  it("la région ardoise se dit en chiffres romains : « région ardoise III », jamais « zone climatique 3 »", () => {
    const r = computeWorkItem(ROOFING_REFERENTIAL, input());
    const labels = need(r, "ardoises").trace.map((t) => t.label);
    expect(labels).toContain("Région ardoise");
    expect(labels).not.toContain("Zone climatique");
    expect(need(r, "ardoises").trace.find((t) => t.label === "Région ardoise")).toMatchObject({ value: "3", shown: "III" });
    expect(need(r, "ardoises").assumptions.find((a) => a.key === "param:zone")).toMatchObject({ label: "Région ardoise", value: "III" });
    const r1 = computeWorkItem(ROOFING_REFERENTIAL, input({ zone: { value: "1", unit: "u", origin: "artisan" } }));
    expect(need(r1, "ardoises").trace.find((t) => t.label === "Région ardoise")).toMatchObject({ value: "1", shown: "I" });
  });
});

describe("table Cupa (§34) : elle fait foi, la formule ne sert que hors table", () => {
  const at = (pente: string, zone: string, diametre = "1", format = "ardoise-30x22") =>
    computeWorkItem(
      ROOFING_REFERENTIAL,
      input({
        pente: { value: pente, unit: "°", origin: "artisan" },
        zone: { value: zone, unit: "u", origin: "artisan" },
        diametre_crochet: { value: diametre, unit: "mm", origin: "artisan" },
      }, format),
    );

  it("30×22 à R 100 (40°, région III) : 44,8 ardoises/m² lues dans la table, 8 960 + 5 % = 9 408", () => {
    const r = at("40", "3");
    expect(need(r, "ardoises").trace).toContainEqual(expect.objectContaining({ label: "Ardoises au m² (table Cupa Pizarras)", value: "44,8", unit: "u/m2" }));
    expect(order(r, "ardoises")).toBe(9408);
  });

  it("sur une ligne de la table, le diamètre du crochet reste affiché et modifiable, mais ne change pas le nombre", () => {
    const fin = at("40", "3", "1");
    const inox = at("40", "3", "2.7");
    expect(order(fin, "ardoises")).toBe(order(inox, "ardoises"));
    expect(need(inox, "ardoises").trace).toContainEqual(expect.objectContaining({ label: "Diamètre du crochet", value: "2,7" }));
  });

  it("32×22 à R 100 : 40,7/m² (et non plus 41,3 de l'ancien §3)", () => {
    expect(need(at("40", "3", "1", "ardoise-32x22"), "ardoises").trace).toContainEqual(expect.objectContaining({ label: "Ardoises au m² (table Cupa Pizarras)", value: "40,7" }));
  });

  it("hors table (30×22 à R 95) : la formule Cupa, dite « hors table », avec le diamètre du crochet", () => {
    const fin = at("45", "3", "1");
    const inox = at("45", "3", "2.7");
    expect(need(fin, "ardoises").trace).toContainEqual(expect.objectContaining({ label: "Ardoises au m² (formule Cupa Pizarras, hors table)" }));
    expect(order(fin, "ardoises")).toBe(9271);
    expect(order(inox, "ardoises")).toBe(9200);
  });

  it("les 194 lignes du code sont celles du référentiel (§34), à la décimale près", () => {
    const doc = readFileSync(new URL("../../../docs/referentiel-couverture.md", import.meta.url), "utf8");
    const section = doc.slice(doc.indexOf("## 34."), doc.indexOf("## 35."));
    const fromDoc = [...section.matchAll(/^\|\s*(\d+)\s*\|\s*(\d+)×(\d+)\s*\|\s*[\d,]+\s*\|\s*([\d,]+)\s*\|/gm)].map((m) => [m[2], m[3], m[1], m[4]!.replace(",", ".")]);
    const work = ROOFING_REFERENTIAL.workItems.find((w) => w.id === "couverture-ardoises-crochet")!;
    expect(fromDoc).toHaveLength(194);
    expect(work.points!.ardoises_m2!.rows).toEqual(fromDoc);
  });

  it("format écrit sur le devis, hors plage Cupa (30×22 à 30°, région III : R 120, maximum 100) : gardé, calculé par la formule, dit « estimation », le 40×22 en conseil", () => {
    const r = at("30", "3");
    const ardoises = need(r, "ardoises");
    // Pas de question bloquante : le devis fait foi sur le format.
    expect(ardoises.status).toBe("calculated");
    expect(ardoises.question).toBeUndefined();
    expect(ardoises.trace).toContainEqual(expect.objectContaining({ label: "Ardoises au m² (formule Cupa Pizarras, hors table)" }));
    const estimation = ardoises.trace.find((t) => t.label === "Estimation")!;
    expect(estimation).toMatchObject({ estimation: true, from: "Format écrit sur le devis, gardé" });
    expect(estimation.value).toBe("Recouvrement posé 120 mm hors table Cupa Pizarras (au-delà du maximum de 100 mm pour ce format). Format conseillé : Ardoises 40×22.");
    // Le conseil : une hypothèse à boutons, le devis en premier, puis les formats admis du plus proche au plus éloigné.
    const conseil = ardoises.assumptions.find((a) => a.key === "product:ardoise")!;
    expect(conseil).toMatchObject({ value: "Ardoises 30×22", note: expect.stringMatching(/Format conseillé : Ardoises 40×22\./) });
    expect(conseil.choices!.slice(0, 2)).toEqual([
      { label: "Ardoises 30×22 (devis)", value: "ardoise-30x22" },
      { label: "Ardoises 40×22 (conseillé)", value: "ardoise-40x22" },
    ]);
    // Les crochets suivent.
    expect(order(r, "crochets-ardoise")).toBeGreaterThanOrEqual(order(r, "ardoises"));
  });

  it("format venu d'une habitude de l'entreprise (le devis ne le précise pas), hors plage : UNE question à boutons, le 40×22 conseillé", () => {
    const r = computeWorkItem(ROOFING_REFERENTIAL, {
      ...input({ pente: { value: "30", unit: "°", origin: "artisan" }, zone: { value: "3", unit: "u", origin: "artisan" } }),
      products: {},
      preferences: { products: { ardoise: "ardoise-30x22" } },
    });
    const ardoises = need(r, "ardoises");
    expect(ardoises).toMatchObject({ status: "question", question: { key: "product:ardoise", kind: "choose_product" } });
    expect(ardoises.question!.text).toBe("Ardoises 30×22 non admis ici : recouvrement posé 120 mm, au-delà du maximum de 100 mm pour ce format (Cupa Pizarras). Quel format ?");
    expect(ardoises.question!.options![0]).toEqual({ label: "Ardoises 40×22 (conseillé)", value: "ardoise-40x22" });
    // Les crochets attendent la même réponse ; rien n'est inventé entre-temps.
    expect(need(r, "crochets-ardoise")).toMatchObject({ status: "question", question: { key: "product:ardoise" } });
    // L'artisan choisit : plus de question, et son choix est gardé même hors plage.
    const chosen = computeWorkItem(ROOFING_REFERENTIAL, { ...input({ pente: { value: "30", unit: "°", origin: "artisan" }, zone: { value: "3", unit: "u", origin: "artisan" } }), products: { ardoise: { productId: "ardoise-30x22", origin: "artisan" } } });
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
  const formats = ROOFING_REFERENTIAL.products.filter((p) => p.family === "roof_slate").map((p) => p.id);
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
            cases.push({ label: `${format} ${pente}° région ${zone} Ø${diametre} marge ${JSON.stringify(waste ?? "référentiel")}`, r: computeWorkItem(ROOFING_REFERENTIAL, input(params, format, waste)) });
          }

  it(`${cases.length} cas (formats, pentes, régions, crochets, marges de l'entreprise) : crochets ≥ ardoises, toujours`, () => {
    const wrong = cases
      .filter((c) => need(c.r, "ardoises").status === "calculated")
      .filter((c) => order(c.r, "crochets-ardoise") < order(c.r, "ardoises"))
      .map((c) => `${c.label} : ${order(c.r, "crochets-ardoise")} crochets < ${order(c.r, "ardoises")} ardoises`);
    expect(wrong).toEqual([]);
    expect(cases.filter((c) => need(c.r, "ardoises").status === "calculated").length).toBeGreaterThan(100);
  });

  it("les crochets suivent les ardoises : une question sur les ardoises est aussi celle des crochets", () => {
    const sansSurface: WorkItemInput = { ...input(), params: {} };
    const r = computeWorkItem(ROOFING_REFERENTIAL, sansSurface);
    expect(need(r, "ardoises").status).toBe("question");
    expect(need(r, "crochets-ardoise")).toMatchObject({ status: "question", question: { key: need(r, "ardoises").question!.key } });
  });

  it("un besoin ne peut partir que d'un besoin calculé AVANT lui (contrôlé au chargement du référentiel)", () => {
    const broken: Referential = structuredClone(ROOFING_REFERENTIAL);
    const work = broken.workItems.find((w) => w.id === "couverture-ardoises-crochet")!;
    // Les crochets passent avant les ardoises dont ils partent : refusé.
    const crochets = work.needs.find((n) => n.id === "crochets-ardoise")!;
    work.needs = [crochets, ...work.needs.filter((n) => n !== crochets)];
    expect(checkReferential(broken).join("\n")).toMatch(/commande\.ardoises.*AVANT/);
    expect(checkReferential(ROOFING_REFERENTIAL)).toEqual([]);
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
