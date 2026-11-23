import { expect } from "vitest";
import type { Agent } from "./test-app.js";

/**
 * LA QUESTION DES CROCHETS D'ARDOISE (Greg, 22 novembre 2026, fiche `roofing-2026.11.22-78`) : sans type de crochet écrit
 * au devis, UNE question pour tout le devis, « Tes crochets d'ardoise : à agrafe ou à pointe ? » (À agrafe / À pointe).
 * « À agrafe » : 4 crochets sur 5 à agrafe (⌈ardoises × 0,8⌉, boîtes de 500), le cinquième à pointe (⌈ardoises × 0,2⌉,
 * boîtes de 700). « À pointe » : un crochet à pointe par ardoise, boîtes de 700. Le nombre d'ardoises ne bouge pas.
 */
export const QUESTION_CROCHETS = "engine:param:type_crochet@crochets-ardoise";
export const CROCHETS_A_AGRAFE = { question: QUESTION_CROCHETS, valeur: "1" } as const;

type Question = { id: string; texte?: string; boutons?: { label: string; valeur: string }[] };

/** La question des crochets est posée, avec son texte et ses deux boutons. */
export function attendreLaQuestionDesCrochets(questions: Question[]): void {
  expect(questions.find((q) => q.id === QUESTION_CROCHETS)).toMatchObject({
    texte: "Tes crochets d'ardoise : à agrafe ou à pointe ?",
    boutons: [
      { label: "À agrafe", valeur: "1" },
      { label: "À pointe", valeur: "2" },
    ],
  });
}

/** Répond « À agrafe » et rend le quantitatif recalculé ; la question ne revient pas. */
export async function crochetsAAgrafe<T = unknown>(agent: Agent, quantitatifId: string): Promise<T> {
  const res = await agent.post(`/v1/quantitatifs/${quantitatifId}/reponses`).send({ reponses: [CROCHETS_A_AGRAFE] });
  if (res.status !== 200 && res.status !== 201) throw new Error(`Crochets : ${res.status} ${JSON.stringify(res.body).slice(0, 300)}`);
  expect((res.body as { questions: Question[] }).questions.map((q) => q.id)).not.toContain(QUESTION_CROCHETS);
  return res.body as T;
}
