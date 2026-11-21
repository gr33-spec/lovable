import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { chantiers, noter, score, type Note } from "./banc-couverture.js";

/**
 * TEST PERMANENT : le banc du calcul de la couverture (Greg, 21 novembre 2026). Relancé à chaque changement du moteur.
 * - Aucune ligne déjà juste ne redevient fausse, aucune ligne en trop de plus (l'état est gardé dans `etat.json`).
 * - Après une correction : `BANC_MAJ=1 npx vitest run test/banc-couverture.test.ts` enregistre le nouvel état et écrit le
 *   tableau dans `SCORE.md`. L'état ne s'enregistre que s'il ne baisse nulle part.
 */
const ETAT = new URL("./banc-couverture/etat.json", import.meta.url);
const SCORE = new URL("./banc-couverture/SCORE.md", import.meta.url);
type Etat = Record<string, { lignes: Record<string, string>; enTrop: number }>;
const notes = chantiers().map(noter);
const etatDe = (n: readonly Note[]): Etat => Object.fromEntries(n.map((x) => [x.id, { lignes: Object.fromEntries(x.lignes.map((l) => [l.article, l.classe])), enTrop: x.enTrop.length }]));

function tableau(n: readonly Note[]): string {
  const jeu = (j: string) => n.filter((x) => x.jeu === j);
  const s = (j: readonly Note[]) => { const k = score(j); return `${k.justes}/${k.attendues} (${k.pourcent} %), ${k.enTrop} en trop, ${k.sansQuestion} « à chiffrer » sans question`; };
  const out = [`# Banc du calcul de la couverture`, ``, `- Entraînement (10 chantiers) : ${s(jeu("entrainement"))}`, `- Examen (5 chantiers) : ${s(jeu("examen"))}`, `- Ensemble : ${s(n)}`, ``, `| Chantier | Justes | Lignes fausses | En trop |`, `|---|---|---|---|`];
  for (const x of n) { const k = score([x]); out.push(`| ${x.id} | ${k.justes}/${k.attendues} | ${x.lignes.filter((l) => l.classe !== "juste").map((l) => `${l.article} : ${l.attendu} attendu, ${l.obtenu}${l.classe === "incertain" ? " (incertain)" : ""}`).join(" ; ") || "aucune"} | ${x.enTrop.join(" ; ") || "aucune"} |`); }
  const sq = n.flatMap((x) => x.sansQuestion.map((q) => `${x.id} : ${q}`)), sr = n.flatMap((x) => x.sansReponse.map((q) => `${x.id} : ${q}`)), sm = n.flatMap((x) => x.suggestionsManquantes.map((q) => `${x.id} : ${q}`));
  out.push(``, `## « À chiffrer » sans question qui débloque`, ...(sq.length ? sq.map((q) => `- ${q}`) : ["aucune"]), ``, `## Questions sans réponse du couvreur dans le banc`, ...(sr.length ? sr.map((q) => `- ${q}`) : ["aucune"]), ``, `## Suggestions attendues absentes`, ...(sm.length ? sm.map((q) => `- ${q}`) : ["aucune"]), ``);
  return out.join("\n");
}

describe("banc du calcul de la couverture : 15 chantiers rejoués sans IA", () => {
  const avant: Etat | null = existsSync(ETAT) ? (JSON.parse(readFileSync(ETAT, "utf8")) as Etat) : null;
  const baisses: string[] = [];
  if (avant) for (const x of notes) { const a = avant[x.id]; if (!a) continue; for (const l of x.lignes) if (a.lignes[l.article] === "juste" && l.classe !== "juste") baisses.push(`${x.id} « ${l.article} » était juste : ${l.attendu} attendu, ${l.obtenu}`); if (x.enTrop.length > a.enTrop) baisses.push(`${x.id} : ${x.enTrop.length} ligne(s) en trop (${a.enTrop} avant) : ${x.enTrop.join(" ; ")}`); }

  it("les 15 chantiers se rejouent (10 d'entraînement, 5 d'examen)", () => {
    expect(notes).toHaveLength(15);
    expect(notes.filter((n) => n.jeu === "examen")).toHaveLength(5);
  });

  it("aucune ligne déjà juste ne redevient fausse, aucune ligne en trop de plus", () => {
    expect(baisses).toEqual([]);
  });

  it("l'état enregistré est celui du moteur (BANC_MAJ=1 pour l'enregistrer après une correction)", () => {
    if (process.env.BANC_MAJ === "1" || !avant) {
      if (baisses.length === 0) { writeFileSync(ETAT, JSON.stringify(etatDe(notes), null, 1) + "\n"); writeFileSync(SCORE, tableau(notes)); }
      return;
    }
    expect(etatDe(notes)).toEqual(avant);
  });
});
