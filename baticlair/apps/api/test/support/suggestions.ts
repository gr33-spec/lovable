import type { Agent } from "./test-app.js";

/**
 * L'étape « Suggestions » (Greg, 17 novembre 2026) : la naissance d'une gouttière n'est plus ajoutée d'office, l'artisan la
 * coche. Les tests écrits avant l'étape, qui mesurent la suite (liste, PDF, e-mail), la cochent ici comme lui.
 */
export const NAISSANCES_COCHEES = { question: "suggestions:choisies", valeur: "gouttiere/naissance" } as const;

export async function cocherLesNaissances(agent: Agent, quantitatifId: string): Promise<void> {
  const res = await agent.post(`/v1/quantitatifs/${quantitatifId}/reponses`).send({ reponses: [NAISSANCES_COCHEES] });
  if (res.status !== 200 && res.status !== 201) throw new Error(`Suggestions : ${res.status} ${JSON.stringify(res.body).slice(0, 300)}`);
}
