import { BLOC_COUVERTURE } from "./couverture.js";
import { BLOC_PEINTURE } from "./peinture.js";
import { SOCLE_ARTISAN, SOCLE_INTERDITS, type BlocMetier } from "./socle.js";
import { BLOC_ZINGUERIE } from "./zinguerie.js";

export * from "./socle.js";
export { BLOC_COUVERTURE, BLOC_PEINTURE, BLOC_ZINGUERIE };

/** Les blocs branchés, dans l'ordre : couverture et zinguerie d'abord, puis peinture (Greg, 16 novembre 2026). */
export const BLOCS_METIER: readonly BlocMetier[] = [BLOC_COUVERTURE, BLOC_ZINGUERIE, BLOC_PEINTURE];

const blocEcrit = (b: BlocMetier) =>
  [
    `=== ${b.nom} ===`,
    "Vocabulaire :",
    ...b.vocabulaire.map((v) => `- ${v}`),
    "Exemples réels :",
    ...b.exemples.flatMap((e) => [`Questions : ${e.questions.map((q, i) => `${i + 1}. ${q}`).join(" | ")}`, `L'artisan répond : « ${e.reponse} »`, `À comprendre : ${e.compris.map((c, i) => `${i + 1}. ${c}`).join(" | ")}`]),
  ].join("\n");

/**
 * LE PROMPT DE L'ÉTAPE D (lire les réponses) : le socle, la tâche, puis TOUS les blocs métier. Un seul texte pour tous les
 * appels : il est identique d'un appel à l'autre, donc mis en cache chez le fournisseur.
 */
export const PROMPT_REPONSES = { id: "interpretation_reponses", version: 3 } as const;
export const PROMPT_REPONSES_SYSTEME = [
  SOCLE_ARTISAN,
  "Il vient de répondre, en une seule fois, à une ou plusieurs questions sur sa liste. Ta seule tâche : rattacher chaque morceau de sa réponse à la question qu'il concerne.",
  "Comment rattacher :",
  "- D'abord par le sens : un morceau va à la question dont il nomme un choix, avec les mots du chantier (voir le vocabulaire).",
  "- Puis par l'ordre : quand le sens ne suffit pas, le premier morceau répond à la première question encore ouverte, et ainsi de suite.",
  "- Un nombre seul répond à la question chiffrée, ou au bouton qui porte ce nombre.",
  "- Il ne répond pas toujours à tout : une question dont il n'a pas parlé reste « sans_reponse ».",
  "Ce que tu rends, pour chaque question :",
  "- Question à boutons : la VALEUR exacte d'un bouton (pas son libellé), ou rien.",
  "- Question chiffrée : le nombre qu'il a dit, sans conversion d'unité.",
  "- Réponse écrite (modèle, teinte, précision) : ses mots, recopiés sans rien ajouter, sans le début de phrase (« et les tuiles rouge vieilli » → « rouge vieilli »).",
  "- « compris » seulement si tu es sûr. Un doute entre deux choix : « ambigu ». Il dit qu'il ne sait pas, ou n'en parle pas : « sans_reponse ».",
  SOCLE_INTERDITS,
  ...BLOCS_METIER.map(blocEcrit),
  "Réponds seulement avec le JSON demandé, sans explication.",
].join("\n");
