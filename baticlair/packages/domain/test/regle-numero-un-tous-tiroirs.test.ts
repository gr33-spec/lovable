import { describe, expect, it } from "vitest";
import {
  applyLineRoles,
  baseOf,
  computeWithAnswers,
  planQuote,
  proposeLineRoles,
  REFERENTIALS,
  slotsGivenByQuote,
  tradeProfile,
  validateTakeoff,
  type LineRole,
} from "../src/index.js";

/**
 * Audit du 2026-10-07 (G12) : la RÈGLE NUMÉRO UN (§49.1, rien d'absent du devis) tenue sur les 22 tiroirs à la fois,
 * pas seulement sur la couverture et D-2026-020. Pour chaque ouvrage de chaque tiroir, un devis d'une ligne qui le
 * nomme : aucun article de la liste ne vient d'un besoin « suggéré » (ni écrit, ni forme d'achat, ni indissociable,
 * ni cité par une ligne de pose).
 */
describe("règle numéro un : aucun tiroir n'ajoute un article absent du devis", () => {
  for (const ref of REFERENTIALS) {
    it(`${ref.trade} : la règle est appliquée (writtenOnly) et aucun article suggéré n'entre dans la liste`, () => {
      expect(ref.writtenOnly).not.toBe(false);
      const profile = tradeProfile(ref.trade);
      for (const work of ref.workItems) {
        const lines = [{ ref: "1", designation: work.label.replace(/\s*\(.*\)$/, ""), quantity: "10", unit: "m²" }];
        const raw = validateTakeoff(lines.map((l) => ({ id: l.ref, designation: l.designation, quantityRaw: l.quantity, unitRaw: l.unit, source: "client_quote" as const })), profile);
        const plan = planQuote(lines, ref, profile);
        const proposals = proposeLineRoles(lines, plan, raw, ref);
        const roles = new Map<string, LineRole>([...proposals].map(([k, v]) => [k, v.role]));
        const validation = applyLineRoles(raw, roles);
        const engine = computeWithAnswers(ref, plan, {}, {}, { acceptDraft: true }, slotsGivenByQuote(plan, validation));
        // Chaque besoin calculé vient d'un emplacement écrit, de sa forme d'achat, de l'indissociable (naissance) ou
        // d'une citation par une ligne de pose ; un consommable n'existe que sur le « oui » (ici : pas de réponse).
        for (const n of engine.needs) {
          if (n.consumable) continue;
          const input = plan.inputs.find((i) => i.workItemId === n.workItemId);
          const w = ref.workItems.find((x) => x.id === baseOf(n.workItemId));
          const slot = w?.slots.find((x) => x.key === n.slot);
          const mentioned = input?.mentioned ?? [];
          const allowed = mentioned.includes(n.slot) || slot?.indissociable === true || (slot?.formOf !== undefined && mentioned.includes(slot.formOf)) || n.citedAs !== undefined;
          expect(allowed, `${ref.trade} / ${work.id} : ${n.label} (${n.slot}) n'est pas écrit au devis`).toBe(true);
        }
      }
    });
  }
});
