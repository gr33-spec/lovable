/**
 * LE TABLEAU DE BORD DES MÉTIERS (mission du fondateur, 2026-10-19 : « à la fin, tableau de bord : métiers, état, reste
 * à faire : artisan relecteur et devis réel par métier »). Écrit par ce test depuis les fiches de `referentiels/metiers/`
 * (`docs/tableau-de-bord-metiers.md`) : il casse dès qu'une fiche bouge sans que le tableau suive.
 */
import { describe, expect, it } from "vitest";
import { FICHES } from "../src/index.js";

describe("tableau de bord des métiers", () => {
  it("une ligne par fiche : état, ouvrages, ratios par confiance, questions, reste à faire", async () => {
    const fiches = [...FICHES].sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
    const compte = (f: (typeof fiches)[number], c: string) => f.ratios.filter((r) => r.confiance === c).length;
    const out = [
      "# Tableau de bord des métiers",
      "",
      "Écrit par `packages/domain/test/tableau-de-bord-metiers.test.ts` depuis les fiches de `referentiels/metiers/` : ne pas",
      "modifier à la main. « Tiroir » : le métier garde son référentiel TypeScript (couverture, électricité) ; la fiche le décrit.",
      "",
      "| Métier | Fiche | Moteur | État | Ouvrages | Ratios (sûr / usuel / à vérifier) | Questions | Consommables | Points à relire | Reste à faire |",
      "|---|---|---|---|---|---|---|---|---|---|",
    ];
    for (const f of fiches) {
      const reste = [f.etat === "relu" ? null : "artisan relecteur", "devis réel anonymisé", f.moteur === "fiche" ? "vraie lecture (file MISSION.md §2 bis)" : null].filter(Boolean).join(", ");
      const consommables = f.conditionnements.filter((c) => c.consommable).length;
      out.push(
        `| ${f.nom} | \`${f.code}\` | ${f.moteur} | ${f.etat} | ${f.ouvrages.length} | ${f.ratios.length} (${compte(f, "sûr")} / ${compte(f, "usuel")} / ${compte(f, "à vérifier")}) | ${f.questions.length} | ${consommables} | ${f.aRelire.length} | ${reste} |`,
      );
    }
    const total = (k: (f: (typeof fiches)[number]) => number) => fiches.reduce((s, f) => s + k(f), 0);
    out.push(
      "",
      `Total : ${fiches.length} fiches, ${total((f) => f.ouvrages.length)} ouvrages, ${total((f) => f.ratios.length)} ratios (${total((f) => compte(f, "sûr"))} sûrs, ${total((f) => compte(f, "usuel"))} usuels, ${total((f) => compte(f, "à vérifier"))} à vérifier), ${total((f) => f.questions.length)} questions.`,
      `Relues par un artisan : ${fiches.filter((f) => f.etat === "relu").map((f) => f.nom).join(", ") || "aucune"}.`,
      "",
    );
    expect(fiches.length).toBeGreaterThanOrEqual(16);
    await expect(out.join("\n")).toMatchFileSnapshot("../../../docs/tableau-de-bord-metiers.md");
  });
});
