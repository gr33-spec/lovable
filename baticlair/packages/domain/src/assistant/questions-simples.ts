/**
 * DES MOTS SIMPLES DANS LA DISCUSSION (Greg, 16 novembre 2026 : « pas de "Zone climatique" ni "Bord de mer, ou plus de
 * 500 m". Exemple : "Ton chantier est où ?" avec "Bord de mer", "Intérieur des terres", "Montagne" »). Seuls les MOTS
 * changent : la clé et les valeurs envoyées au calcul restent celles du référentiel (le bord de mer et la montagne sont la
 * même zone, deux boutons pour une même valeur). Aucun import : l'écran l'utilise tel quel.
 */
export interface QuestionAffichee {
  texte: string;
  options: { label: string; value: string; dit?: string[] }[];
}

const ZONE = /^(?:engine:)?param:zone(?:@|$)/;

export function questionEnMotsSimples(cle: string, texte: string, options: readonly { label: string; value: string; dit?: string[] }[]): QuestionAffichee {
  if (ZONE.test(cle) && options.some((o) => o.value === "3") && options.some((o) => o.value === "1")) {
    const autres = options.filter((o) => !["1", "2", "3"].includes(o.value));
    return {
      texte: "Ton chantier est où ?",
      options: [
        { label: "Bord de mer", value: "3" },
        { label: "Intérieur des terres", value: "1" },
        { label: "Montagne", value: "3" },
        ...(options.some((o) => o.value === "2") ? [{ label: "Entre les deux", value: "2" }] : []),
        ...autres,
      ],
    };
  }
  return { texte, options: [...options] };
}
