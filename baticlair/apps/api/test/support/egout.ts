import { expect } from "vitest";
import type { Agent } from "./test-app.js";

/**
 * LA QUESTION DE L'ÉGOUT (Greg, 21 novembre 2026, soir) : sur des ardoises au crochet, quand le devis n'écrit pas de
 * gouttière, le moteur demande « Tes m² d'ardoise comprennent déjà l'égout et les coupes ? » (Oui / Non). « Oui » n'ajoute
 * rien : les quantités d'avant restent exactement. Les tests écrits avant cette règle, dont le devis n'a ni gouttière ni
 * égout, vérifient ici que la question est bien posée, telle quelle, puis répondent « Oui » comme le ferait l'artisan.
 */
export const QUESTION_EGOUT = "engine:param:egout_compris";
export const EGOUT_COMPRIS = { question: QUESTION_EGOUT, valeur: "1" } as const;

type Question = { id: string; texte?: string; boutons?: { label: string; valeur: string }[] };

/** La question de l'égout est posée, avec son texte et ses deux boutons. */
export function attendreLaQuestionDeLEgout(questions: Question[]): void {
  expect(questions.find((q) => q.id === QUESTION_EGOUT)).toMatchObject({
    texte: "Tes m² d'ardoise comprennent déjà l'égout et les coupes ?",
    boutons: [
      { label: "Oui", valeur: "1" },
      { label: "Non", valeur: "2" },
    ],
  });
}

/** Répond « Oui » à la question de l'égout et rend le quantitatif recalculé ; la question ne revient pas. */
export async function egoutCompris<T = unknown>(agent: Agent, quantitatifId: string): Promise<T> {
  const res = await agent.post(`/v1/quantitatifs/${quantitatifId}/reponses`).send({ reponses: [EGOUT_COMPRIS] });
  if (res.status !== 200 && res.status !== 201) throw new Error(`Égout : ${res.status} ${JSON.stringify(res.body).slice(0, 300)}`);
  expect((res.body as { questions: Question[] }).questions.map((q) => q.id)).not.toContain(QUESTION_EGOUT);
  expect((res.body as { questions: Question[] }).questions.map((q) => q.id)).not.toContain("engine:param:egout_a_ajouter");
  return res.body as T;
}
