import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ecranDeLecture, REFERENTIALS, type LectureDevis } from "../src/index.js";

/**
 * NON-RÉGRESSION MULTIMÉTIER (plan du 20 octobre 2026, bloc 9) : les 179 lectures enregistrées (`test/lectures/`, tous
 * métiers) sont rejouées dans le calcul, sans réponse ni habitude, et le résultat (chaque ligne de la liste : désignation,
 * quantité, unité, couleur ; les questions) est figé. Un changement du moteur se voit ici, ligne par ligne, avant fusion.
 * Le même fichier se rejoue sur `main` pour comparer les branches.
 */
const DIR = join(fileURLToPath(new URL(".", import.meta.url)), "lectures");

interface Resultat {
  fichier: string;
  metier: string;
  lignes: { designation: string; quantite: string | null; unite: string | null; etat: string }[];
  questions: string[];
  aChiffrer: string[];
}

function rejouer(fichier: string): Resultat {
  const refId = fichier.replace(/-[0-9a-f]{12}\.json$/, "");
  const ref = REFERENTIALS.find((r) => r.id === refId);
  if (!ref) throw new Error(`Tiroir inconnu pour ${fichier}`);
  const { lecture } = JSON.parse(readFileSync(join(DIR, fichier), "utf8")) as { lecture: Omit<LectureDevis, "metier" | "lots"> & Partial<LectureDevis> };
  const ecran = ecranDeLecture({ ref, lecture: { metier: ref.trade, lots: [], ...lecture }, options: { acceptDraft: true }, interdits: false });
  const p = ecran.purchase;
  return {
    fichier,
    metier: ref.trade,
    lignes: p.screen.groups.flatMap((g) =>
      g.rows.map((r) => {
        const item = r.itemKey ? p.toBuy.find((b) => b.key === r.itemKey) : undefined;
        const quote = r.quoteKey ? p.toQuote.find((q) => q.key === r.quoteKey) : undefined;
        return { designation: item?.label ?? quote?.label ?? r.pending?.label ?? r.key, quantite: item?.quantity ?? r.pending?.quantity ?? null, unite: item?.order?.unit ?? null, etat: r.status, raison: r.reason ?? null };
      }),
    ),
    questions: ecran.questions.map((q) => q.key),
    aChiffrer: p.toQuote.map((t) => t.label),
  };
}

describe("banc des 179 lectures enregistrées, tous métiers", () => {
  it("rejoue chaque lecture dans le calcul et fige le résultat", { timeout: 180_000 }, async () => {
    const fichiers = readdirSync(DIR)
      .filter((f) => f.endsWith(".json"))
      .sort();
    expect(fichiers).toHaveLength(179);
    const resultats = fichiers.map(rejouer);
    const metiers = new Set(resultats.map((r) => r.metier));
    expect(metiers.size).toBeGreaterThanOrEqual(16);
    await expect(`${JSON.stringify(resultats, null, 1)}\n`).toMatchFileSnapshot("./__snapshots__/banc-179-lectures.json");
  });
});
