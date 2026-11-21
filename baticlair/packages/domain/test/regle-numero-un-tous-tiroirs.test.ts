import { describe, expect, it } from "vitest";
import { baseOf, computeWithAnswers, lignesDeLecture, planDeLecture, REFERENTIALS, slotsGivenByQuote, validationDeLecture } from "../src/index.js";
import { lectureSimple } from "./support/plan-of.js";

/**
 * Audit du 2026-10-07 (G12) : la RÈGLE NUMÉRO UN (§49.1, rien d'absent du devis) tenue sur les 22 tiroirs à la fois,
 * pas seulement sur la couverture et D-2026-020. Pour chaque ouvrage de chaque tiroir, un devis d'une ligne que la lecture
 * rattache à son premier emplacement : aucun article de la liste ne vient d'un besoin « suggéré » (ni écrit, ni forme
 * d'achat, ni indissociable, ni cité par une ligne de pose).
 */
describe("règle numéro un : aucun tiroir n'ajoute un article absent du devis", () => {
  for (const ref of REFERENTIALS) {
    it(`${ref.trade} : la règle est appliquée (writtenOnly) et aucun article suggéré n'entre dans la liste`, () => {
      expect(ref.writtenOnly).not.toBe(false);
      for (const work of ref.workItems) {
        const slot = work.slots[0];
        if (!slot) continue;
        const lecture = lectureSimple([{ ref: "1", designation: work.label.replace(/\s*\(.*\)$/, ""), quantity: "10", unit: "m²", ouvrage: work.id, emplacement: slot.key }]);
        const lignes = lignesDeLecture(lecture);
        const plan = planDeLecture(ref, lecture, lignes);
        const engine = computeWithAnswers(ref, plan, {}, {}, { acceptDraft: true }, slotsGivenByQuote(plan, validationDeLecture(ref.trade, lignes, plan)));
        // Chaque besoin calculé vient d'un emplacement écrit, de sa forme d'achat, de l'indissociable (naissance) ou
        // d'une citation par une ligne de pose ; un consommable n'existe que sur le « oui » (ici : pas de réponse).
        for (const n of engine.needs) {
          if (n.consumable) continue;
          const input = plan.inputs.find((i) => i.workItemId === n.workItemId);
          const w = ref.workItems.find((x) => x.id === baseOf(n.workItemId));
          const s = w?.slots.find((x) => x.key === n.slot);
          const mentioned = input?.mentioned ?? [];
          const allowed = mentioned.includes(n.slot) || s?.indissociable === true || (s?.formOf !== undefined && mentioned.includes(s.formOf)) || n.citedAs !== undefined;
          expect(allowed, `${ref.trade} / ${work.id} : ${n.label} (${n.slot}) n'est pas écrit au devis`).toBe(true);
        }
      }
    });
  }
});
