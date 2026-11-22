import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { computeWorkItem, ROOFING_REFERENTIAL, type WorkItemInput } from "../src/index.js";

/**
 * LE TABLEAU DES ARDOISES (Greg, 17 novembre 2026) : « Ne me demande jamais le pureau : demande seulement le format de
 * l'ardoise et la taille des crochets. Mets dans la fiche couverture un tableau figé "format d'ardoise + crochet → pureau,
 * ardoises au m², liteaux au ml". Le code calcule ensuite ardoises, crochets et liteaux pour la surface, chutes comprises,
 * sans IA. Montre-moi ce tableau, je le valide. »
 * Ce test CALCULE le tableau avec le moteur (les mêmes règles que la liste) et le compare au document
 * `docs/tableau-ardoises.md` : le document montré à Greg est toujours celui que le code applique.
 * Le régénérer : `MAJ_TABLEAU=1 npx vitest run test/tableau-ardoises.test.ts`.
 */
const FORMATS: [number, number][] = [[40, 25], [40, 22], [35, 25], [35, 22], [33, 23], [32, 22], [30, 22], [30, 20], [30, 18]];
const CROCHETS = [8, 9, 10, 11, 12, 13];
const DOC = fileURLToPath(new URL("../../../docs/tableau-ardoises.md", import.meta.url));

const input = (h: number, l: number, crochet: number): WorkItemInput => ({
  workItemId: "couverture-ardoises-crochet",
  params: {
    surface: { value: "100", unit: "m2", origin: "devis" },
    longueur_crochet: { value: String(crochet), unit: "cm", origin: "devis" },
    qualite_ardoise: { value: "1", unit: "u", origin: "devis" },
    // Règle changée (Greg, 21 novembre 2026) : sans gouttière écrite, l'égout se demande. Le tableau compte la surface seule :
    // « Oui », les m² comprennent déjà l'égout et les coupes.
    egout_compris: { value: "1", unit: "u", origin: "artisan" },
  },
  products: { ardoise: { productId: `ardoise-${h}x${l}`, origin: "devis" } },
  mentioned: ["ardoise", "crochet", "liteau"],
});
const fr = (n: number, d = 0) => n.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d }).replace(/[  ]/g, " ");

function ligne(h: number, l: number, crochet: number) {
  const r = computeWorkItem(ROOFING_REFERENTIAL, input(h, l, crochet));
  const need = (id: string) => r.needs.find((n) => n.needId === id)!;
  const trace = (id: string, label: RegExp) => (need(id) as { trace?: { label: string; value: string; from?: string }[] }).trace?.find((t) => label.test(t.label));
  const ardoisesM2 = trace("ardoises", /^Ardoises au m²/);
  // Le nombre de pièces. Les crochets se commandent en boîtes de 500 (Greg, 21 novembre 2026) : le tableau garde leur nombre de pièces.
  const commande = (id: string) => (id === "crochets-ardoise" ? Math.ceil(Number(need(id).quantity?.value ?? Number.NaN)) : Number(need(id).purchase?.order.count ?? Number.NaN));
  return {
    format: `${h}×${l}`,
    crochet,
    // Jeu de tête de 5 mm (règle du fondateur, confirmée le 2026-11-19 : manuel CAP, Culture, Cupa ; fiche couverture).
    recouvrement: crochet * 10 - 5,
    pureau: (h * 10 - (crochet * 10 - 5)) / 20,
    ardoisesM2: ardoisesM2?.value ?? "?",
    source: /hors table|formule/i.test(ardoisesM2?.label ?? "") ? "formule" : "table des fabricants",
    ardoises: commande("ardoises"),
    crochets: commande("crochets-ardoise"),
    liteaux: Number(need("liteaux-ardoise").quantity?.value ?? Number.NaN),
  };
}

describe("le tableau des ardoises : format + crochet → pureau, ardoises au m², liteaux", () => {
  const lignes = FORMATS.flatMap(([h, l]) => CROCHETS.map((c) => ligne(h, l, c)));

  // Règle du fondateur du 18 novembre, confirmée le 19 (fiche couverture) : pureau = (longueur − crochet) ÷ 2 + 2,5 mm,
  // un crochet par ardoise. Avant (17 novembre) : recouvrement = crochet − 1 cm, pureau 11 cm, 40,7/m², crochets + 2 %.
  it("l'exemple de Greg : 32×22, crochets de 11 → recouvrement 10,5 cm, pureau 10,75 cm, 42,09 ardoises au m²", () => {
    const g = lignes.find((x) => x.format === "32×22" && x.crochet === 11)!;
    expect(g).toMatchObject({ recouvrement: 105, pureau: 10.75, ardoisesM2: "42,09", source: "formule" });
    // Pour 100 m² : 42,09 × 100 + 5 % de chutes = 4 420 ardoises ; un crochet par ardoise ; un liteau par rang × 1,10 (aboutage) + 5 %.
    // Règle changée (Greg, 22 novembre 2026) : 10 % de chute d'aboutage sur les liteaux ; avant 977 → 1 074 ml (100 ÷ 0,1075 × 1,10 × 1,05 = 1 074,4).
    expect(g.ardoises).toBe(4420);
    expect(g.crochets).toBe(4420);
    expect(Math.round(g.liteaux)).toBe(1074);
  });

  it("chaque format et chaque crochet se calculent, sans rien demander ; plus le crochet est long, plus il faut d'ardoises", () => {
    for (const x of lignes) expect(Number.isFinite(x.ardoises) && Number.isFinite(x.crochets) && Number.isFinite(x.liteaux), `${x.format} crochet ${x.crochet}`).toBe(true);
    for (const [h, l] of FORMATS) {
      const serie = lignes.filter((x) => x.format === `${h}×${l}`).map((x) => x.ardoises);
      expect([...serie].sort((a, b) => a - b), `${h}×${l}`).toEqual(serie);
    }
  });

  it("le document docs/tableau-ardoises.md est celui que le code applique", () => {
    const md = [
      "# Tableau des ardoises : format + crochet → pureau, ardoises, crochets, liteaux",
      "",
      "Document généré par le code (`packages/domain/test/tableau-ardoises.test.ts`) : c'est exactement ce que Mobiiz applique.",
      "À valider par Greg (17 novembre 2026).",
      "",
      "## La règle, en clair",
      "",
      "- On ne demande jamais le pureau. On lit le **format de l'ardoise** et la **taille des crochets** (au devis, sinon on les demande ou on les propose).",
      "- Recouvrement = crochet − 5 mm de jeu de tête (un crochet de 11 tient un recouvrement de 10,5 cm), soit pureau = (hauteur − crochet) ÷ 2 + 2,5 mm (règle du fondateur, confirmée : manuel CAP, ministère de la Culture, Cupa).",
      "- Pureau = (hauteur de l'ardoise − recouvrement) ÷ 2.",
      "- Ardoises au m² : la valeur de la table des fabricants (Cupa) quand elle existe pour ce format et ce recouvrement ; sinon la formule 1 ÷ (pureau × (largeur + épaisseur du crochet)).",
      "- Ardoises à commander = surface × ardoises au m² + **5 % de chutes**.",
      "- Crochets = un par ardoise commandée.",
      "- Liteaux = un rang par pureau (surface ÷ pureau) + **10 % de chute d'aboutage** (Greg, 22 novembre 2026), puis + **5 %**.",
      "",
      "## Le tableau (quantités pour 100 m² de toiture)",
      "",
      "| Format | Crochet | Recouvrement | Pureau | Ardoises au m² | D'où vient le chiffre | Ardoises pour 100 m² | Crochets pour 100 m² | Liteaux pour 100 m² |",
      "|---|---|---|---|---|---|---|---|---|",
      ...lignes.map((x) => `| ${x.format} | de ${x.crochet} | ${fr(x.recouvrement / 10, x.recouvrement % 10 ? 1 : 0)} cm | ${fr(x.pureau, x.pureau % 1 ? (x.pureau * 10) % 1 ? 2 : 1 : 0)} cm | ${x.ardoisesM2} | ${x.source} | ${fr(x.ardoises)} | ${fr(x.crochets)} | ${fr(Math.round(x.liteaux))} ml |`),
      "",
    ].join("\n");
    if (process.env.MAJ_TABLEAU || !existsSync(DOC)) writeFileSync(DOC, md);
    expect(readFileSync(DOC, "utf8")).toBe(md);
  });
});
