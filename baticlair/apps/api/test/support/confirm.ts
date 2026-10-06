import type { Agent } from "./test-app.js";

/**
 * Ce que l'écran des questions fait en lançant le calcul (§49.2.5) : les valeurs par défaut vues et gardées, les lignes
 * orange levées d'un « C'est bon ». Les tests qui valident la liste directement le rejouent ici.
 */
export async function confirmRemaining(agent: Agent, projectId: string, takeoffId: string): Promise<void> {
  for (let round = 0; round < 3; round++) {
    const view = (await agent.get(`/v1/projects/${projectId}/takeoff`)).body.takeoff.view as { decisions: { key: string }[] };
    const open = view.decisions.filter((d) => d.key.startsWith("ratio:"));
    if (open.length === 0) return;
    for (const d of open) await agent.post(`/v1/takeoffs/${takeoffId}/answers`).send({ key: d.key, value: "ok" }).expect(200);
  }
}
