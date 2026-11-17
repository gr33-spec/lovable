import { ROOFING_REFERENTIAL, type QuestionNumerotee } from "../../src/index.js";

/**
 * Les questions d'un test prennent les mots dits (`dit`) de la fiche du métier, comme à l'écran : le serveur envoie les
 * boutons du référentiel avec leurs mots. Jamais recopiés à la main dans un test.
 */
export function avecMotsDits(questions: readonly QuestionNumerotee[]): QuestionNumerotee[] {
  return questions.map((q) => {
    const nom = /^(?:engine:)?param:([^@]+)/.exec(q.cle)?.[1];
    const choix = ROOFING_REFERENTIAL.workItems.flatMap((w) => w.params).find((p) => p.key === nom && p.choices?.some((c) => c.dit))?.choices ?? [];
    return { ...q, options: q.options.map((o) => ({ ...o, ...(choix.find((c) => c.value === o.value)?.dit ? { dit: choix.find((c) => c.value === o.value)!.dit! } : {}) })) };
  });
}
