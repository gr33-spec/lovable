import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ROOFING_REFERENTIAL } from "../src/index.js";

/**
 * Audit du référentiel couverture (fondateur, 2026-10-10) : « aucune règle de calcul en double (un tableau règle /
 * section / test) ». Chaque règle de calcul du tiroir (constante, valeur intermédiaire, table, besoin) s'écrit une fois :
 *  - une constante a une seule valeur, quel que soit l'ouvrage qui la cite ;
 *  - deux constantes de même valeur et même unité ne disent pas la même chose (sinon : une seule) ; les cas où la
 *    valeur coïncide sans être la même règle sont listés ici, avec la raison ;
 *  - les longueurs de 2 m se comptent d'une seule façon (§1 « bande de 2 m = ml / 2 arrondi sup. »), les feuilles de
 *    2 × 1 m aussi (§48.6, bandes découpées dans le mètre de largeur).
 * Le tableau est réécrit par `npx vitest run -u` dans docs/audit-referentiel-regles.md.
 */
const here = dirname(fileURLToPath(import.meta.url));
const work = ROOFING_REFERENTIAL.workItems;

/** Valeurs identiques, règles différentes : la raison est dite dans le tableau. */
const MEME_VALEUR_AUTRE_REGLE: Record<string, string> = {
  "2 u": "Nombres par pièce sans lien : 2 ardoises (couvert et courant), 2 abouts, 2 fixations par patte, 2 closoirs par plaque, 2 talons par ligne.",
  "10 mm": "Supplément de recouvrement au-delà de 5,5 m de rampant, marge de crochet (R + 1 cm), pas de vente des crochets.",
  "0 mm": "Supplément nul (rampant court) et diamètre de VMC non écrit : deux zéros.",
  "1.05 u": "Antivents par ardoise (§4) et marge du zinc linéaire (§7).",
  "2 m": "Longueur d'une bande (§1), d'une feuille 2 × 1 m (§48.6), d'une faîtière de bac (§8), espacement des colliers (§15) : quatre produits ou gestes.",
  "1 m": "Largeur d'une feuille de zinc et largeur utile d'un bac acier 1000.",
  "6 m": "Seuil du bobineau (au-delà de 6 ml) et longueur d'un rouleau de plomb.",
  "500 mm": "Bobineau 500 (bandes), bobine 500 du joint debout (bacs), bobine de cuivre 500 : trois produits.",
  "650 mm": "Bobineau 650 (bandes) et bobine 650 du joint debout (bacs).",
  "3 u/m": "Pattes de bande zinc (§1, §3) et vis de rive du bac acier (§8).",
  "4 m": "Barre de gouttière zinc (§25.2) et profil PVC ou alu (§15).",
};
/** Noms retirés par l'audit : une seule règle reste (le nom de droite). */
const RETIRES: Record<string, string> = {
  longueur_utile: "longueur_bande_2m",
  longueur_utile_bande: "longueur_bande_2m",
  surface_feuille: "longueur_feuille × largeur_feuille (§48.6)",
  seuil_bobine: "seuil_bobineau",
  marge_noue: "marge_zinc_lineaire",
  coef_egout_faitage: "marge_zinc_lineaire",
  marge_plomb: "marge_bandes",
};
/** Section du référentiel de chaque ouvrage, quand la règle n'en cite pas. */
const SECTION_OUVRAGE: Record<string, string> = {
  "couverture-tuiles-emboitement": "§5, §35",
  "couverture-tuiles-canal": "§5",
  "couverture-ardoises-crochet": "§3, §34",
  "couverture-ardoises-fibres-ciment": "§4",
  faitage: "§5",
  "faitage-zinc": "§1, §7",
  noue: "§7",
  aretier: "§7",
  "fenetre-de-toit": "§11",
  "bandes-zinc": "§7, §25",
  "bande-porte-solin": "§7, §49.7",
  "bandes-plomb": "§12",
  "bandes-cuivre": "§12",
  "abergement-cheminee": "§7",
  "sortie-de-toit": "§25",
  "couverture-zinc-joint-debout": "§7, §36",
  "couverture-bac-acier": "§8",
  gouttiere: "§7, §25",
  "gouttiere-pvc-alu": "§15",
  descente: "§7, §15",
  voligeage: "§6",
};

interface Row {
  kind: "constante" | "valeur" | "table" | "besoin";
  key: string;
  what: string;
  items: string[];
  section: string;
}
const sectionsIn = (...texts: (string | undefined)[]) => [...new Set(texts.flatMap((t) => [...(t ?? "").matchAll(/§\s?(\d+(?:\.\d+)?)/g)].map((m) => `§${m[1]}`)))];
const fmt = (v: string) => v.replace(".", ",");

function inventory(): Row[] {
  const rows = new Map<string, Row>();
  const add = (kind: Row["kind"], key: string, what: string, item: string, texts: (string | undefined)[]) => {
    const id = `${kind}:${key}:${what}`;
    const row = rows.get(id) ?? { kind, key, what, items: [], section: "" };
    row.items.push(item);
    const cited = sectionsIn(...texts);
    row.section = [...new Set([...(row.section ? row.section.split(", ") : []), ...(cited.length > 0 ? cited : (SECTION_OUVRAGE[item] ?? "").split(", ").filter(Boolean))])].join(", ");
    rows.set(id, row);
  };
  for (const w of work) {
    for (const [k, c] of Object.entries(w.constants)) add("constante", k, `${fmt(c.value)} ${c.unit}`, w.id, [c.note, c.verification?.note]);
    for (const d of w.derived ?? []) add("valeur", d.key, d.formula, w.id, [d.verification?.note]);
    for (const [k, t] of Object.entries(w.tables ?? {})) add("table", k, t.label, w.id, [t.note, t.label]);
    for (const [k, t] of Object.entries(w.points ?? {})) add("table", k, t.label, w.id, [t.label]);
    for (const n of w.needs) add("besoin", n.id, n.formula, w.id, [n.exclusions, n.basis, n.verification?.note]);
  }
  return [...rows.values()];
}

/** Les tests du dépôt (domaine et API) qui citent la règle par son nom, sinon par sa section. */
function testsOf(rows: Row[]) {
  const dirs = [here, join(here, "../../../apps/api/test")];
  const files = dirs.flatMap((d) => readdirSync(d).filter((f) => f.endsWith(".test.ts")).map((f) => ({ name: f, text: readFileSync(join(d, f), "utf8") })));
  return (row: Row) => {
    const byName = files.filter((f) => f.name !== "audit-regles-uniques.test.ts" && new RegExp(`\\b${row.key.replace(/[-]/g, "\\-")}\\b`).test(f.text)).map((f) => f.name);
    if (byName.length > 0) return byName;
    const secs = row.section.split(", ").filter(Boolean);
    return files.filter((f) => f.name !== "audit-regles-uniques.test.ts" && secs.some((s) => new RegExp(`${s.replace(".", "\\.")}(?![\\d.]*\\d)`).test(f.text))).map((f) => `${f.name} (par ${secs.join(", ")})`).slice(0, 3);
  };
}

describe("Audit du référentiel couverture : aucune règle de calcul en double", () => {
  const rows = inventory();
  const constants = rows.filter((r) => r.kind === "constante");

  it("une constante a une seule valeur, quel que soit l'ouvrage", () => {
    const byKey = new Map<string, Set<string>>();
    for (const r of constants) byKey.set(r.key, (byKey.get(r.key) ?? new Set()).add(r.what));
    expect([...byKey].filter(([, v]) => v.size > 1).map(([k, v]) => `${k} : ${[...v].join(" / ")}`)).toEqual([]);
  });

  it("une valeur intermédiaire a une seule formule dans un même ouvrage ; d'un ouvrage à l'autre, elle dit sa mesure", () => {
    // « ml_zinc » d'une noue (ml × 1,05) n'est pas celui d'un abergement (périmètre × 1,3) : même nom, mesure propre à
    // l'ouvrage. Ce qui est interdit : une même valeur écrite deux fois avec deux formules dans le même ouvrage.
    for (const w of work) {
      const keys = (w.derived ?? []).map((d) => d.key);
      expect(keys.filter((k, i) => keys.indexOf(k) !== i), w.id).toEqual([]);
    }
    // Et une même formule n'a qu'un nom dans un ouvrage.
    for (const w of work) {
      const formulas = (w.derived ?? []).map((d) => d.formula);
      expect(formulas.filter((f, i) => formulas.indexOf(f) !== i), w.id).toEqual([]);
    }
  });

  it("deux constantes de même valeur sont deux règles différentes, dites ici ; sinon une seule", () => {
    const bySig = new Map<string, Set<string>>();
    for (const w of work) for (const [k, c] of Object.entries(w.constants)) {
      const sig = `${Number(c.value)} ${c.unit}`;
      bySig.set(sig, (bySig.get(sig) ?? new Set()).add(k));
    }
    const shared = [...bySig].filter(([, ks]) => ks.size > 1).map(([sig]) => sig).sort();
    expect(shared).toEqual(Object.keys(MEME_VALEUR_AUTRE_REGLE).sort());
  });

  it("les noms retirés par l'audit ne reviennent pas", () => {
    const keys = new Set(rows.map((r) => r.key));
    const formulas = rows.map((r) => r.what).join("\n");
    for (const old of Object.keys(RETIRES)) {
      expect(keys.has(old), old).toBe(false);
      expect(new RegExp(`regle\\.${old}\\b`).test(formulas), old).toBe(false);
    }
  });

  it("les longueurs de 2 m se comptent d'une seule façon (§1), les feuilles 2 × 1 m aussi (§48.6)", () => {
    const needs = work.flatMap((w) => w.needs);
    // Toute division d'une longueur de bande par une longueur d'élément passe par `longueur_bande_2m`. Seule la noue
    // garde sa règle propre, écrite au §25.2 : « recouvrement 150 mm entre éléments → longueur utile 1,85 m pour 2 m ».
    expect(needs.filter((n) => /\/\s*regle\.longueur_(?!bande_2m|feuille|profil|barre|utile_noue)/.test(n.formula)).map((n) => n.id)).toEqual([]);
    // Toute feuille se compte en bandes découpées dans le mètre de largeur.
    const feuilles = needs.filter((n) => /^feuilles-/.test(n.id));
    expect(feuilles.length).toBeGreaterThan(0);
    expect(feuilles.filter((n) => !/regle\.longueur_feuille \* max\(1, arrondi_inf\(regle\.largeur_feuille \//.test(n.formula)).map((n) => n.id)).toEqual([]);
  });

  it("chaque règle cite sa section, et le tableau règle / section / test est à jour", async () => {
    expect(rows.filter((r) => r.section === "").map((r) => r.key)).toEqual([]);
    const tests = testsOf(rows);
    const kindLabel: Record<Row["kind"], string> = { constante: "Constante", valeur: "Valeur intermédiaire", table: "Table", besoin: "Besoin" };
    const cell = (s: string) => s.replace(/\|/g, "\\|");
    const lines = rows
      .sort((a, b) => ["constante", "table", "valeur", "besoin"].indexOf(a.kind) - ["constante", "table", "valeur", "besoin"].indexOf(b.kind) || a.key.localeCompare(b.key))
      .map((r) => {
        const t = tests(r);
        return `| ${kindLabel[r.kind]} | \`${r.key}\` | ${cell(r.kind === "constante" || r.kind === "table" ? r.what : `\`${r.what}\``)} | ${r.section} | ${r.items.join(", ")} | ${t.length > 0 ? t.join(", ") : "**aucun test**"} |`;
      });
    const untested = rows.filter((r) => tests(r).length === 0).length;
    const doc = [
      `# Audit du référentiel couverture : une règle, une section, un test`,
      "",
      `Généré par \`packages/domain/test/audit-regles-uniques.test.ts\` (\`npx vitest run -u\`), tiroir \`${ROOFING_REFERENTIAL.version}\`.`,
      "",
      `${rows.length} règles de calcul : ${constants.length} constantes, ${rows.filter((r) => r.kind === "table").length} tables, ${rows.filter((r) => r.kind === "valeur").length} valeurs intermédiaires, ${rows.filter((r) => r.kind === "besoin").length} besoins. Règles sans test qui les cite : ${untested}.`,
      "",
      "Colonne « Tests » : les fichiers de test qui citent la règle par son nom ; à défaut, ceux qui citent sa section (« par §x »).",
      "",
      "## Doublons retirés par l'audit (2026-10-10)",
      "",
      "| Retiré | Remplacé par |",
      "|---|---|",
      ...Object.entries(RETIRES).map(([a, b]) => `| \`${a}\` | ${b.includes("×") ? b : `\`${b}\``} |`),
      "",
      "## Même valeur, règles différentes",
      "",
      "| Valeur | Pourquoi ce n'est pas la même règle |",
      "|---|---|",
      ...Object.entries(MEME_VALEUR_AUTRE_REGLE).map(([sig, why]) => `| ${fmt(sig)} | ${why} |`),
      "",
      "## Règle / section / test",
      "",
      "| Sorte | Règle | Valeur ou formule | Section | Ouvrages | Tests |",
      "|---|---|---|---|---|---|",
      ...lines,
      "",
    ].join("\n");
    await expect(doc).toMatchFileSnapshot("../../../docs/audit-referentiel-regles.md");
  });
});
