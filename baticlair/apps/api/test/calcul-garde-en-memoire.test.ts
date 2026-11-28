import { describe, expect, it } from "vitest";
import { D2026_020_LECTURE, ecranDeLecture, ROOFING_REFERENTIAL } from "@baticlair/domain";
import { ecranGarde } from "../src/modules/takeoff/application/ecran-garde.js";

/**
 * LA VITESSE DU CALCUL (Greg, 23 novembre 2026 : « 6 secondes, et jusqu'à 20 avec plusieurs « Je ne sais pas », c'est trop :
 * sur un chantier, l'artisan croit que ça a planté. Ne recalcule que ce qui change. Ne change aucun résultat. »). L'écran
 * d'un même état (fiche du métier, lecture, réponses, habitudes, lignes) est gardé : il n'est plus recalculé à chaque
 * lecture de la requête. Ce test tient les trois promesses : même état = même écran sans recalcul ; une réponse de plus =
 * recalcul ; et ce qu'on rend est une copie (la changer ne touche jamais la suivante).
 */
const entree = (answers: Record<string, null | string>) => ({ ref: ROOFING_REFERENTIAL, lecture: D2026_020_LECTURE, answers, preferences: {} });

describe("l'écran gardé en mémoire : seul ce qui change se recalcule", () => {
  it("même état : le même écran, sans recalcul ; une réponse de plus : recalculé", () => {
    let calculs = 0;
    const garde = (answers: Record<string, null | string>) =>
      ecranGarde(ROOFING_REFERENTIAL, entree(answers), () => {
        calculs++;
        return ecranDeLecture(entree(answers));
      });
    const a = garde({});
    const b = garde({});
    expect(calculs).toBe(1);
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
    expect(JSON.stringify(b)).toBe(JSON.stringify(ecranDeLecture(entree({}))));
    garde({ "param:qualite_ardoise": null });
    expect(calculs).toBe(2);
  });

  it("ce qui est rendu est une copie : la modifier ne change pas l'écran suivant", () => {
    const calcul = () => ecranDeLecture(entree({ "param:type_crochet": null }));
    const a = ecranGarde(ROOFING_REFERENTIAL, entree({ "param:type_crochet": null }), calcul);
    const avant = JSON.stringify(a);
    a.purchase.questions.push({ key: "bidon", state: "missing", title: "", text: "", lineIds: [], primary: null, secondary: [] } as never);
    a.purchase.toBuy[0]!.label = "changé";
    const b = ecranGarde(ROOFING_REFERENTIAL, entree({ "param:type_crochet": null }), calcul);
    expect(JSON.stringify(b)).toBe(avant);
  });
});
