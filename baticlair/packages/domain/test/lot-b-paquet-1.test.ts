import { describe, expect, it } from "vitest";
import {
  CARRELAGE_REFERENTIAL,
  checkReferential,
  MACONNERIE_REFERENTIAL,
  PEINTURE_REFERENTIAL,
  PLATRERIE_REFERENTIAL,
  RATIO,
  referentialFor,
  supplierTest,
  type Referential,
} from "../src/index.js";
import { brestTable } from "./support/brest.js";
import { answerAll, benchReport, pdfReport, screenReport } from "./support/lot-b.js";
import type { QuoteLineInput } from "./support/read-quote.js";
import { colours, readTradeQuote } from "./support/read-trade.js";

/**
 * LOT B, PAQUET 1 (« tous les métiers calculent ») : plâtrerie-isolation, carrelage, peinture, maçonnerie. Un devis de
 * test par métier passe par le même moteur que le couvreur. À l'ouverture, une ligne calculée avec un ratio « à
 * vérifier » sort orange avec son chiffre et « Quantité à confirmer : … » (§47.1) ; les seules questions sont celles du
 * comptoir. Répondu, chaque ligne du PDF se charge au comptoir sans rappeler l'artisan (§40). Le compte rendu du paquet
 * (`docs/lot-b/paquet-1.md`) est écrit par ce test, tableau de Brest compris : il casse si l'un d'eux bouge.
 */
interface Paquet {
  nom: string;
  ref: Referential;
  metier: string;
  bench: QuoteLineInput[];
  /** Les questions du comptoir de ce devis, avec ses mots. */
  questions: string[];
  couleurs: { vert: number; orange: number; gris: number };
}

const PAQUET: Paquet[] = [
  {
    nom: "Plâtrerie, isolation",
    ref: PLATRERIE_REFERENTIAL,
    metier: "platrerie",
    bench: [
      {
        ref: "1",
        designation: "Cloison 72/48 BA13 sur ossature",
        quantity: "40",
        unit: "m²",
      },
      {
        ref: "2",
        designation: "Doublage collé Doublissimo 10+80",
        quantity: "55",
        unit: "m²",
      },
      {
        ref: "3",
        designation: "Plafond suspendu BA13 sur fourrures F530",
        quantity: "60",
        unit: "m²",
      },
      {
        ref: "4",
        designation: "Isolation combles perdus laine soufflée R7",
        quantity: "80",
        unit: "m²",
      },
    ],
    questions: [],
    couleurs: { vert: 7, orange: 4, gris: 0 },
  },
  {
    nom: "Carrelage",
    ref: CARRELAGE_REFERENTIAL,
    metier: "carrelage",
    bench: [
      {
        ref: "1",
        designation: "Fourniture et pose carrelage sol grès cérame 60x60 rectifié, pose droite",
        quantity: "42",
        unit: "m²",
      },
      {
        ref: "2",
        designation: "Faïence murale salle de bains 25x40",
        quantity: "18",
        unit: "m²",
      },
      {
        ref: "3",
        designation: "Plinthes assorties",
        quantity: "30",
        unit: "ml",
      },
      {
        ref: "4",
        designation: "Douche à l'italienne : SPEC sol et murs",
        quantity: "6",
        unit: "m²",
      },
      {
        ref: "5",
        designation: "Ragréage autolissant",
        quantity: "42",
        unit: "m²",
      },
    ],
    questions: [],
    couleurs: { vert: 1, orange: 7, gris: 0 },
  },
  {
    nom: "Peinture",
    ref: PEINTURE_REFERENTIAL,
    metier: "peinture",
    bench: [
      {
        ref: "1",
        designation: "Peinture murs séjour, 2 couches",
        quantity: "85",
        unit: "m²",
      },
      {
        ref: "2",
        designation: "Peinture plafonds mate, impression + 2 couches",
        quantity: "40",
        unit: "m²",
      },
      {
        ref: "3",
        designation: "Enduit de lissage, ratissage murs",
        quantity: "85",
        unit: "m²",
      },
      {
        ref: "4",
        designation: "Toile de verre à peindre, chambre",
        quantity: "30",
        unit: "m²",
      },
      {
        ref: "5",
        designation: "Papier peint intissé chambre",
        quantity: "25",
        unit: "m²",
      },
      {
        ref: "6",
        designation: "Ravalement façade peinture D2 Pliolite",
        quantity: "120",
        unit: "m²",
      },
    ],
    questions: [],
    couleurs: { vert: 2, orange: 7, gris: 0 },
  },
  {
    nom: "Maçonnerie",
    ref: MACONNERIE_REFERENTIAL,
    metier: "maconnerie",
    bench: [
      {
        ref: "1",
        designation: "Mur porteur en parpaings, garage",
        quantity: "48",
        unit: "m²",
      },
      {
        ref: "2",
        designation: "Mur en brique Porotherm R20",
        quantity: "30",
        unit: "m²",
      },
      {
        ref: "3",
        designation: "Dallage béton 12 cm sur hérisson, treillis ST25C",
        quantity: "40",
        unit: "m²",
      },
      {
        ref: "4",
        designation: "Chape ciment 5 cm",
        quantity: "35",
        unit: "m²",
      },
      {
        ref: "5",
        designation: "Enduit monocouche gratté",
        quantity: "60",
        unit: "m²",
      },
      {
        ref: "6",
        designation: "Semelle filante 50x25",
        quantity: "28",
        unit: "ml",
      },
    ],
    questions: ["Parpaings de 20, de 15 ou de 10 ?"],
    couleurs: { vert: 1, orange: 10, gris: 0 },
  },
];

const run = (p: Paquet) => answerAll((answers) => readTradeQuote(p.ref, p.bench, answers));

describe("lot B, paquet 1 : quatre métiers branchés sur le moteur", () => {
  for (const p of PAQUET) {
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
        for (const r of first.screen.groups.flatMap((g) => g.rows).filter((x) => x.status === "check" && !x.pending)) {
          expect(r.reason, r.itemKey).toMatch(/^Quantité à confirmer : \S/);
        }
      });

      it("répondu et confirmé : tout est vert ou gris, chaque ligne du PDF se charge au comptoir", () => {
        const { last } = run(p);
        expect(last.questions).toEqual([]);
        expect(colours(last).orange).toBe(0);
        expect(last.toBuy.length).toBeGreaterThan(0);
        for (const b of last.toBuy) expect(supplierTest(b.label, b.order?.unit ?? null), b.label).toBeNull();
        for (const b of last.toBuy) expect(b.quantity, b.label).not.toBeNull();
      });
    });
  }

  it("le compte rendu du paquet (docs/lot-b/paquet-1.md)", async () => {
    const out = [
      "# Lot B, paquet 1 : plâtrerie, carrelage, peinture, maçonnerie",
      "",
      "Écrit par `packages/domain/test/lot-b-paquet-1.test.ts` : ce fichier change seulement si le calcul change.",
      "",
      "Pour chaque métier : le devis de test, l'écran à l'ouverture (lignes vertes, orange, grises, questions du comptoir),",
      "puis le PDF que lit le vendeur une fois les questions répondues (premier bouton) et chaque « C'est bon » donné.",
      "",
      "| Métier | Vertes | Orange | Grises | Questions |",
      "| --- | --- | --- | --- | --- |",
      ...PAQUET.map((p) => `| ${p.nom} | ${p.couleurs.vert} | ${p.couleurs.orange} | ${p.couleurs.gris} | ${p.questions.length} |`),
      "",
    ];
    for (const p of PAQUET) {
      const { first, last } = run(p);
      out.push(`## ${p.nom}`, "", ...benchReport(p.bench), ...screenReport(first), ...pdfReport(last));
    }
    out.push("## Le tableau de Brest (couverture), inchangé", "", brestTable(), "");
    await expect(out.join("\n")).toMatchFileSnapshot("../../../docs/lot-b/paquet-1.md");
  });
});
