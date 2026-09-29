import type { Action, AppData, Scenario } from "../types";
import type { Snapshot } from "../engine/snapshot";
import type { AnalysisIdea } from "./types";

// Une piste de l'IA devient un scénario de Simulations, calculé par le moteur
// de l'application. Les montants proposés sont des hypothèses éditables ;
// quand l'IA n'en donne pas, on reprend les chiffres connus (valeur de
// l'immeuble, capital restant) ou on laisse le champ à saisir.

const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2));
const pos = (v: number) => (Number.isFinite(v) && v > 0 ? Math.round(v) : undefined);

/** Action correspondant à la piste, ou null si elle ne se simule pas (ou vise un élément inconnu). */
export function ideaToAction(idea: AnalysisIdea, data: AppData, snap: Snapshot, currentYear: number): Action | null {
  const s = idea.simulation;
  const year = s.annee >= currentYear && s.annee <= currentYear + 30 ? Math.round(s.annee) : currentYear + 1;
  const building = idea.cible.type === "immeuble" ? data.buildings.find((b) => b.id === idea.cible.id) : undefined;
  const companyId = idea.cible.type === "societe" && data.companies.some((c) => c.id === idea.cible.id) ? idea.cible.id : (building?.companyId ?? null);
  const loans = s.creditIds.filter((id) => data.loans.some((l) => l.id === id));

  switch (s.action) {
    case "vente": {
      if (!building) return null;
      const price = pos(s.montant) ?? pos(snap.byBuilding.get(building.id)?.value ?? 0);
      return { id: uid(), type: "sale", buildingId: building.id, year, price };
    }
    case "refinancement": {
      const ids = loans.length ? loans : building ? data.loans.filter((l) => l.buildingId === building.id).map((l) => l.id) : [];
      if (!ids.length) return null;
      const balance = ids.reduce((a, id) => a + (snap.byLoan.get(id)?.balance ?? 0), 0);
      return {
        id: uid(),
        type: "refinance",
        year,
        loanIds: ids,
        buildingId: building?.id ?? data.loans.find((l) => l.id === ids[0])?.buildingId ?? null,
        companyId,
        amount: pos(s.montant) ?? pos(balance),
        ratePct: s.tauxPct > 0 ? s.tauxPct : undefined,
        durationYears: s.dureeAns > 0 ? Math.round(s.dureeAns) : undefined,
      };
    }
    case "achat":
      return {
        id: uid(),
        type: "purchase",
        name: idea.titre.slice(0, 80),
        companyId,
        year,
        price: pos(s.montant),
        ratePct: s.tauxPct > 0 ? s.tauxPct : undefined,
        durationYears: s.dureeAns > 0 ? Math.round(s.dureeAns) : undefined,
      };
    case "travaux":
      return { id: uid(), type: "works", label: idea.titre.slice(0, 80), year, amount: pos(s.montant), buildingId: building?.id ?? null, companyId };
    case "remboursement": {
      const loanId = loans[0] ?? (building ? data.loans.find((l) => l.buildingId === building.id)?.id : undefined);
      if (!loanId) return null;
      return { id: uid(), type: "prepayment", loanId, year, amount: pos(s.montant), mode: "duree" };
    }
    default:
      return null;
  }
}

export function ideaToScenario(idea: AnalysisIdea, data: AppData, snap: Snapshot, currentYear: number): Scenario | null {
  const action = ideaToAction(idea, data, snap, currentYear);
  if (!action) return null;
  return { id: uid(), name: `IA · ${idea.titre}`.slice(0, 90), actions: [action], createdAt: new Date().toISOString().slice(0, 10) };
}
