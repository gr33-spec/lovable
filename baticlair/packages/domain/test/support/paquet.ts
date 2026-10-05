import { describe, expect, it } from "vitest";
import { checkReferential, RATIO, referentialFor, supplierTest, type Referential } from "../../src/index.js";
import { brestTable } from "./brest.js";
import { answerAll, benchReport, pdfReport, screenReport } from "./lot-b.js";
import type { QuoteLineInput } from "./read-quote.js";
import { colours, readTradeQuote } from "./read-trade.js";

/** Un métier d'un paquet du lot B : son tiroir, son devis de test, ce que l'écran doit montrer à l'ouverture. */
export interface Metier {
  nom: string;
  ref: Referential;
  metier: string;
  bench: QuoteLineInput[];
  /** Les questions du comptoir de ce devis, avec ses mots. */
  questions: string[];
  couleurs: { vert: number; orange: number; gris: number };
}

const run = (p: Metier) => answerAll((answers) => readTradeQuote(p.ref, p.bench, answers));

/**
 * La suite d'un paquet du lot B : pour chaque métier, le tiroir est juste et trouvé par son nom ; à l'ouverture, les
 * seules questions sont celles du comptoir et chaque ligne orange dit sa règle ; répondu et confirmé, tout est vert ou
 * gris et chaque ligne du PDF se charge au comptoir. Le compte rendu (`docs/lot-b/paquet-N.md`) est écrit par le test,
 * tableau de Brest compris : il casse si l'un d'eux bouge.
 */
export function describePaquet(numero: number, titre: string, paquet: readonly Metier[]): void {
  describeLot({
    suite: `lot B, paquet ${numero} : ${paquet.length} métiers branchés sur le moteur`,
    titre: `Lot B, paquet ${numero} : ${titre}`,
    fichier: `lot-b/paquet-${numero}.md`,
    test: `lot-b-paquet-${numero}.test.ts`,
    colonne: "Métier",
    intro: "Pour chaque métier : le devis de test, l'écran à l'ouverture (lignes vertes, orange, grises, questions du comptoir),",
    paquet,
  });
}

/** La même suite et le même compte rendu pour un lot quelconque (lot B, lot couverture) : `docs/<fichier>`. */
export function describeLot(lot: { suite: string; titre: string; fichier: string; test: string; colonne: string; intro: string; paquet: readonly Metier[] }): void {
  const { paquet } = lot;
  describe(lot.suite, () => {
    for (const p of paquet) {
      describe(p.nom, () => {
        it("son tiroir est ouvert, juste, et trouvé par son nom", () => {
          expect(checkReferential(p.ref)).toEqual([]);
          expect(referentialFor(p.metier)).toBe(p.ref);
          expect(referentialFor(p.ref.trade)).toBe(p.ref);
        });

        it("à l'ouverture : les questions du comptoir et rien d'autre, chaque ligne orange dit sa règle", () => {
          const { first } = run(p);
          expect(first.questions.filter((d) => !d.key.startsWith(RATIO)).map((d) => d.question?.text ?? d.text)).toEqual(p.questions);
          expect(colours(first)).toEqual(p.couleurs);
          for (const r of first.screen.groups.flatMap((g) => g.rows).filter((x) => x.status === "check" && !x.pending && !x.decisionKey)) {
            expect(r.reason, r.itemKey).toMatch(/^Quantité à confirmer : \S/);
          }
        });

        it("répondu et confirmé : tout est vert ou gris, chaque ligne du PDF se charge au comptoir", () => {
          const { last } = run(p);
          expect(last.questions).toEqual([]);
          expect(colours(last).orange).toBe(0);
          expect(last.canValidate).toBe(true);
          expect(last.toBuy.length).toBeGreaterThan(0);
          for (const b of last.toBuy) expect(supplierTest(b.label, b.order?.unit ?? null), b.label).toBeNull();
          for (const b of last.toBuy) expect(b.quantity, b.label).not.toBeNull();
        });
      });
    }

    it(`le compte rendu (docs/${lot.fichier})`, async () => {
      const out = [
        `# ${lot.titre}`,
        "",
        `Écrit par \`packages/domain/test/${lot.test}\` : ce fichier change seulement si le calcul change.`,
        "",
        lot.intro,
        "puis le PDF que lit le vendeur une fois les questions répondues (premier bouton) et chaque « C'est bon » donné.",
        "",
        `| ${lot.colonne} | Vertes | Orange | Grises | Questions |`,
        "| --- | --- | --- | --- | --- |",
        ...paquet.map((p) => `| ${p.nom} | ${p.couleurs.vert} | ${p.couleurs.orange} | ${p.couleurs.gris} | ${p.questions.length} |`),
        "",
      ];
      for (const p of paquet) {
        const { first, last } = run(p);
        out.push(`## ${p.nom}`, "", ...benchReport(p.bench), ...screenReport(first), ...pdfReport(last));
      }
      out.push("## Le tableau de Brest (couverture), inchangé", "", brestTable(), "");
      await expect(out.join("\n")).toMatchFileSnapshot(`../../../docs/${lot.fichier}`);
    });
  });
}
