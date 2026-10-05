import { answerAll, pdfReport, screenReport } from "./lot-b.js";
import { readQuote } from "./read-quote.js";

/** Le chantier de Brest (couverture), le témoin de chaque paquet du lot B : il ne doit jamais bouger. */
export const BREST = [
  {
    ref: "1",
    designation: "Couverture en ardoises naturelles 30x22 posées au crochet",
    quantity: "200",
    unit: "m²",
  },
  {
    ref: "2",
    designation: "Gouttière demi-ronde zinc développé 33",
    quantity: "24",
    unit: "ml",
  },
];

/** Son tableau : l'écran à l'ouverture, puis le PDF une fois répondu. */
export function brestTable(): string {
  const { first, last } = answerAll((answers) => readQuote(BREST, answers, [], {}));
  return [...screenReport(first), ...pdfReport(last)].join("\n");
}
