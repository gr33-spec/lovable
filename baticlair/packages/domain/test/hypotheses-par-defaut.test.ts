import { describe, expect, it } from "vitest";
import { checkReferential, computeWorkItem, ROOFING_REFERENTIAL, type Referential, type WorkItemInput } from "../src/index.js";
import { sansHypotheses } from "./support/sans-hypotheses.js";
import { REFERENTIEL_COMPLET } from "./support/complet.js";

/**
 * LA RÈGLE PRODUIT (2026-10-03) : l'artisan dépose son devis, BatiClair sort la
 * liste d'achats. Une donnée que le devis ne dit pas prend l'hypothèse par
 * défaut du référentiel du fondateur, DITE et modifiable ; une question n'est
 * posée que si rien ne permet de calculer et que la réponse change la commande.
 */
const need = (r: ReturnType<typeof computeWorkItem>, id: string) => r.needs.find((n) => n.needId === id)!;
const ARDOISE_SANS_REPONSE: WorkItemInput = {
  workItemId: "couverture-ardoises-crochet",
  // La qualité d'ardoise (question du comptoir, §47.8) est une habitude de l'entreprise, pas une hypothèse.
  params: {
    surface: { value: "200", unit: "m2", origin: "devis", evidence: "Devis, ligne 2" },
    qualite_ardoise: { value: "1", unit: "u", origin: "artisan", evidence: "Habitude de votre entreprise" },
    // Les clous d'ardoise (A-INTEGRER §3, 22 novembre 2026), calculés ici avec tous les articles : la longueur des rives
    // est lue au devis (sinon elle se demande, case cochée).
    longueur_rives: { value: "20", unit: "m", origin: "devis", evidence: "Devis, ligne 3" },
  },
  products: { ardoise: { productId: "ardoise-30x22", origin: "devis" } },
  mentioned: ["ardoise", "liteau"],
};
// Règle changée (Greg, 21 novembre 2026) : avant, aucune question → l'égout se demande quand aucune gouttière n'est écrite.
// Répondu « Oui » (les m² comprennent déjà l'égout et les coupes) : rien n'est ajouté, les quantités d'avant restent.
// Règle changée (Greg, 22 novembre 2026) : sans type de crochet écrit, « Agrafe ou pointe ? » (avant : aucune question, un
// crochet par ardoise). Répondu « À agrafe ».
const ARDOISE: WorkItemInput = { ...ARDOISE_SANS_REPONSE, params: { ...ARDOISE_SANS_REPONSE.params, egout_compris: { value: "1", unit: "u", origin: "artisan" }, type_crochet: { value: "1", unit: "u", origin: "artisan" } } };

describe("hypothèses par défaut : utilisées sans question, dites, modifiables", () => {
  it("pente 45°, zone littorale, rampant ≤ 5,5 m, entraxe 60 cm : le devis ne dit rien, tout se calcule quand même", () => {
    // Règle changée (Greg, 21 novembre 2026) : avant, aucune question → l'égout se demande quand aucune gouttière n'est écrite.
    const ouverture = computeWorkItem(REFERENTIEL_COMPLET, ARDOISE_SANS_REPONSE);
    expect(ouverture.nextQuestion).toMatchObject({ key: "param:egout_compris", text: "Tes m² d'ardoise comprennent déjà l'égout et les coupes ?", options: [{ label: "Oui", value: "1" }, { label: "Non", value: "2" }] });
    // Deux questions : tout ce qui attend, attend l'une ou l'autre. Règle changée (Greg, 22 novembre 2026) : sans type de
    // crochet écrit, « Agrafe ou pointe ? » (avant : aucune question, un crochet par ardoise).
    expect([...new Set(ouverture.needs.filter((n) => n.status !== "calculated").map((n) => n.question?.key))]).toEqual(["param:egout_compris", "param:type_crochet"]);
    expect(ouverture.needs.find((n) => n.question?.key === "param:type_crochet")!.question).toMatchObject({ options: [{ label: "À agrafe", value: "1" }, { label: "À pointe", value: "2" }] });
    // « Oui » et « À agrafe » : tout se calcule.
    const r = computeWorkItem(REFERENTIEL_COMPLET, ARDOISE);
    expect(r.nextQuestion).toBeNull();
    for (const n of r.needs) expect(n.status).toBe("calculated");
    // Chaque hypothèse est tracée comme telle, jamais confondue avec une donnée lue ou répondue.
    const ardoises = need(r, "ardoises");
    expect(ardoises.trace.filter((t) => t.origin === "assumption").map((t) => [t.label, t.value, t.unit])).toEqual([
      // Greg, 21 novembre 2026 : les ouvrages au mètre (arêtier, noue, faîtage, gouttière) se lisent au devis ; il n'en
      // parle pas : zéro, dit.
      ["Pente du toit", "45", "°"],
      // Pour l'ardoise, la région ardoise (DTU 40.11), pas la zone climatique des tuiles.
      ["Région ardoise", "3", "u"],
      // Le rampant choisit la table du DTU (≤ 5,50 m, 5,50 à 11 m, au-delà).
      ["Longueur du rampant", "5,5", "m"],
      // Situation normale par défaut ; exposée quand la commune du chantier est au bord de mer (fiche couverture).
      ["Situation du chantier", "1", "u"],
      // NF DTU 40.11 (fiche couverture) : 45°, région III → recouvrement 89 mm → pureau (300 − 89) / 2.
      ["Pureau", "10,55", "cm"],
      // Formule Cupa (§34) : crochet courant 1 mm sans département littoral connu.
      ["Diamètre du crochet", "1", "mm"],
    ]);
    expect(ardoises.trace.find((t) => t.label === "Région ardoise")).toMatchObject({ value: "3", shown: "III" });
    expect(ardoises.assumptions.map((a) => a.key)).toEqual(["param:pente", "param:zone", "param:longueur_rampant", "param:situation", "derived:recouvrement", "param:pureau", "param:diametre_crochet"]);
    // Les hypothèses à boutons gardent leurs réponses proposées (l'artisan ne tape rien).
    expect(ardoises.assumptions.find((a) => a.key === "param:pente")?.choices?.map((c) => c.label)).toEqual(["30°", "35°", "45°"]);
    expect(need(r, "contre-liteaux-ardoise").assumptions.map((a) => a.key)).toEqual(["product:contre_liteau", "param:entraxe_supports"]);
  });

  it("une réponse de l'artisan remplace l'hypothèse, et seulement elle", () => {
    const r = computeWorkItem(REFERENTIEL_COMPLET, { ...ARDOISE, params: { ...ARDOISE.params, pente: { value: "100", unit: "%", origin: "artisan" }, zone: { value: "1", unit: "u", origin: "artisan" } } });
    const ardoises = need(r, "ardoises");
    // Pente 100 % (une ancienne réponse en %) = 45°, zone 1 : recouvrement 73 mm (NF DTU 40.11), dans la table Cupa :
    // 39,5/m² × 200 = 7 900 + 5 % = 8 295 (avant, ancien tableau : 80 mm, 8 547).
    expect(ardoises.quantity).toEqual({ value: "8295", unit: "u" });
    expect(ardoises.assumptions.map((a) => a.key)).toEqual(["param:longueur_rampant", "param:situation", "derived:recouvrement", "param:pureau", "param:diametre_crochet"]);
    expect(ardoises.trace.find((t) => t.label === "Pente du toit")).toMatchObject({ origin: "project", value: "45", unit: "°" });
  });

  it("table de recouvrement : la cellule des plus grands seuils atteints ; sous la pente minimale, rien n'est deviné", () => {
    const at = (pente: string, zone: string) => need(computeWorkItem(REFERENTIEL_COMPLET, { ...ARDOISE, params: { ...ARDOISE.params, pente: { value: pente, unit: "°", origin: "artisan" }, zone: { value: zone, unit: "u", origin: "artisan" } } }), "ardoises");
    const recouvrement = (pente: string, zone: string) => at(pente, zone).trace.find((t) => t.label === "Recouvrement")!.value;
    // NF DTU 40.11 (fiche couverture) : 25° et 26° prennent la ligne 45 % (24,23°), 29,9° et 30° la ligne 55 % (28,81°),
    // 80° la dernière ligne (375 %, 75,07°).
    expect([recouvrement("25", "1"), recouvrement("26", "1"), recouvrement("29.9", "1"), recouvrement("30", "1"), recouvrement("80", "3")]).toEqual(["107", "107", "97", "97", "69"]);
    // Rampant de 6 m (45°, zone 3) : table de 5,50 à 11 m du DTU, 94 mm (au lieu de 89).
    const long = need(computeWorkItem(REFERENTIEL_COMPLET, { ...ARDOISE, params: { ...ARDOISE.params, longueur_rampant: { value: "6", unit: "m", origin: "artisan" } } }), "ardoises");
    expect(long.trace.find((t) => t.label === "Recouvrement")!.value).toBe("94");
    // Pente 20° (et 5°) : sous le premier seuil, l'ouvrage n'est pas calculé, et la raison est dite.
    expect(at("20", "3")).toMatchObject({ status: "unknown", reason: "Pente du toit trop faible pour cet ouvrage (minimum 24.23 °)." });
    expect(at("5", "1")).toMatchObject({ status: "unknown" });
  });

  it("produit par défaut (liteaux 18×40, crochets, écran) : dit comme hypothèse ; « aucun de ces modèles » → le générique compte, « modèle à préciser »", () => {
    const r = computeWorkItem(REFERENTIEL_COMPLET, ARDOISE);
    expect(need(r, "liteaux-ardoise")).toMatchObject({ label: "Liteaux 18×40", productOrigin: "default" });
    expect(need(r, "liteaux-ardoise").assumptions).toContainEqual(expect.objectContaining({ key: "product:liteau", value: "Liteaux 18×40" }));
    const declined = computeWorkItem(REFERENTIEL_COMPLET, { ...ARDOISE, declined: ["ecran"] });
    // Écran refusé : le moteur calcule quand même avec le générique (le fournisseur met sa marque), sans re-poser l'hypothèse.
    expect(need(declined, "ecran-ardoise")).toMatchObject({ status: "calculated", productOrigin: "declined", label: "Écran HPV, rouleau 1,50 × 50 m (modèle à préciser)" });
    expect(need(declined, "ecran-ardoise").assumptions.some((a) => a.key === "product:ecran")).toBe(false);
  });

  it("un besoin qui exige une donnée absente (tuiles de rive sans longueur de rives) n'existe pas : ni chiffre, ni question", () => {
    const tuiles: WorkItemInput = {
      workItemId: "couverture-tuiles-emboitement",
      params: { surface: { value: "120", unit: "m2", origin: "devis" } },
      products: { tuile: { productId: "edilians-hp10-huguenot", origin: "artisan" } },
      mentioned: ["tuile"],
    };
    // Les chatières (A-INTEGRER §1, 22 novembre 2026) : elles ont leurs données (surface, pente, modèle) ; seules les rives manquent.
    expect(computeWorkItem(REFERENTIEL_COMPLET, tuiles).needs.map((n) => n.needId)).toEqual(["tuiles", "liteaux", "pointes-liteaux", "chatieres", "contre-liteaux", "ecran"]);
    const withRives = computeWorkItem(REFERENTIEL_COMPLET, { ...tuiles, params: { ...tuiles.params, longueur_rives: { value: "24", unit: "m", origin: "devis" } } });
    // Pureau : rampant 5,5 m (hypothèse) partagé en 15 rangs entiers au pureau maxi de 0,376 m → 0,3667 m (fiche couverture,
    // 2026-11-19 ; avant : pureau mini 0,31 m en zone littorale). 24 m / 0,3667 m = 65,45 tuiles de rive → 66 (avant 78).
    // Greg, 21 novembre 2026 : deux lignes, gauches et droites (12 m de chaque côté) : 12 / 0,3667 = 32,7 → 33 de chaque (avant : une ligne de 66).
    expect(need(withRives, "tuiles-de-rive-gauches")).toMatchObject({ status: "calculated", purchase: { order: { count: "33" } } });
    expect(need(withRives, "tuiles-de-rive-droites")).toMatchObject({ status: "calculated", purchase: { order: { count: "33" } } });
  });

  it("pertes du référentiel du fondateur : ardoise 5 %, crochets 0 % (un par ardoise), tuile 3 %, liteaux 10 %, dites dans le calcul", () => {
    const r = computeWorkItem(REFERENTIEL_COMPLET, { ...ARDOISE, params: { ...ARDOISE.params, pureau: { value: "10", unit: "cm", origin: "artisan" } } });
    // Pureau 100 mm sur 30×22 = recouvrement 100 mm : la table Cupa fait foi (44,8/m²) → 8 960 ardoises.
    expect(need(r, "ardoises").trace.find((t) => t.label === "Besoin calculé")!.value).toBe("8 960");
    expect(need(r, "ardoises")).toMatchObject({ quantity: { value: "9408" }, purchase: { order: { count: "9408" } } });
    expect(need(r, "ardoises").trace.find((t) => t.label === "Marge recommandée")).toMatchObject({ value: "5", unit: "%" });
    // Crochets = un par ardoise commandée, 9 408 (fiche couverture, 2026-11-19 ; avant × 1,02 = 9 597).
    // Greg, 21 novembre 2026 : les crochets se commandent en boîtes de 500, le nombre de pièces reste écrit (9 408 → 19 boîtes).
    // Règle changée (Greg, 22 novembre 2026), pose à agrafe : 9 408 × 0,8 = 7 526,4 → 7 527 agrafes, 7 527 / 500 = 15,05 → 16
    // boîtes de 500 ; 9 408 × 0,2 = 1 881,6 → 1 882 pointes, 1 882 / 700 = 2,69 → 3 boîtes de 700 (avant : 9 408, 19 boîtes de 500).
    // Toujours un crochet au moins par ardoise : 7 527 + 1 882 = 9 409 ≥ 9 408.
    expect(need(r, "crochets-ardoise")).toMatchObject({ quantity: { value: "7527" }, purchase: { order: { count: "16" } } });
    expect(need(r, "crochets-ardoise-pointe")).toMatchObject({ quantity: { value: "1882" }, purchase: { order: { count: "3" } } });
    // Règle changée (Greg, 22 novembre 2026) : 10 % de chute au total sur les liteaux, contre-liteaux 5 % ; avant (hier) 2 310 → 2 200 ml
    // (200 ÷ 0,10 = 2 000 ml × 1,10 = 2 200).
    expect(need(r, "liteaux-ardoise")).toMatchObject({ quantity: { value: "2200" } });
    expect(need(r, "liteaux-ardoise").trace.find((t) => t.label === "Marge recommandée")).toMatchObject({ value: "10", unit: "%" });
  });

  it("sans ces hypothèses, le moteur redemande : la règle produit tient aux données, pas à un contournement", () => {
    const bare = sansHypotheses(REFERENTIEL_COMPLET);
    // Les longueurs des ouvrages au mètre (Greg, 21 novembre 2026) se lisent au devis, zéro quand il n'en parle pas : ce devis
    // n'en écrit aucun. Ce ne sont pas des hypothèses de calcul ; celle qui manque ici est le pureau.
    const aucun = { value: "0", unit: "m", origin: "devis" as const };
    // L'arêtier fermé ou en zinc (Greg, 22 novembre 2026) se lit aussi sur la ligne de l'arêtier : donnée du devis, pas une hypothèse.
    const enZinc = { value: "0", unit: "u", origin: "devis" as const };
    const r = computeWorkItem(bare, { ...ARDOISE, params: { ...ARDOISE.params, longueur_aretier: aucun, longueur_noue: aucun, longueur_faitage: aucun, longueur_gouttiere: aucun, aretier_ferme: enZinc } });
    expect(need(r, "ardoises").status).toBe("question");
    expect(r.nextQuestion?.key).toBe("param:pureau");
  });

  it("le contrôle d'intégrité refuse une hypothèse ou une table mal formée", () => {
    const broken: Referential = structuredClone(REFERENTIEL_COMPLET);
    const ardoise = broken.workItems.find((w) => w.id === "couverture-ardoises-crochet")!;
    ardoise.params.find((p) => p.key === "pente")!.default = { value: "45", formula: "1", source: "fondateur-referentiel-2026-10-03", verification: { status: "verified", verifiedAt: "2026-10-03", verifiedBy: "test" }, version: 1 };
    ardoise.tables!.recouvrement_a!.values[0] = ["110", "120"];
    const errors = checkReferential(broken);
    expect(errors.some((e) => e.includes("pente (hypothèse)") && e.includes("une valeur OU une formule"))).toBe(true);
    expect(errors.some((e) => e.includes("table recouvrement_a") && e.includes("lignes de 3 valeurs"))).toBe(true);
  });
});
