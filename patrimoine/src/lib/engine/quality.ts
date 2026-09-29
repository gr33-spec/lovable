import type { AppData } from "../types";
import type { Snapshot } from "./snapshot";

export interface QualityIssue {
  id: string;
  label: string;
  detail: string;
  href: string;
  /** « critical » : un montant du dossier serait faux (mensualité, capital) ; sinon simple information manquante. */
  severity?: "critical" | "advice";
}

/** Données manquantes qui empêchent un calcul : affichées, jamais inventées. */
export function qualityIssues(data: AppData, snap: Snapshot): QualityIssue[] {
  const issues: QualityIssue[] = [];
  for (const b of data.buildings) {
    if ((snap.byBuilding.get(b.id)?.unvalued ?? 0) > 0) {
      issues.push({ id: `b-${b.id}`, label: b.name, detail: "Valeur estimée manquante", href: `/patrimoine/immeuble/${b.id}?modifier=1`, severity: "advice" });
    }
  }
  for (const b of data.buildings) {
    const f = snap.byBuilding.get(b.id);
    if (f && f.rentMonthly > 0 && f.chargesAnnual === 0) {
      issues.push({ id: `c-${b.id}`, label: b.name, detail: "Charges non renseignées (taxe foncière, assurance) : cash-flow surestimé", href: `/patrimoine/immeuble/${b.id}?modifier=1`, severity: "critical" });
    }
  }
  for (const l of data.loans) {
    const r = snap.resolvedLoans.get(l.id);
    if (!r || r.finished) continue;
    const name = l.name || l.bank || "Crédit";
    const fix = " — le plus simple : importer le tableau d'amortissement";
    if (r.quality === "insufficient") {
      issues.push({ id: `l-${l.id}`, label: name, detail: (r.notes[r.notes.length - 1] ?? "Données insuffisantes") + fix, href: `/patrimoine/credit/${l.id}`, severity: "critical" });
    } else if (r.quality === "estimated") {
      issues.push({ id: `l-${l.id}`, label: name, detail: (r.notes[0] ?? "Projection estimée") + fix, href: `/patrimoine/credit/${l.id}`, severity: "critical" });
    } else if (!l.schedule) {
      // Calcul correct mais théorique : le tableau de la banque donne les chiffres exacts.
      issues.push({ id: `ls-${l.id}`, label: name, detail: "Tableau d'amortissement à importer pour des chiffres exacts", href: `/patrimoine/credit/${l.id}`, severity: "advice" });
    }
  }
  // Cohérence des crédits : un restant dû ne peut pas dépasser le montant emprunté.
  for (const l of data.loans) {
    const r = snap.resolvedLoans.get(l.id);
    if (!r || r.finished || l.initialAmount === undefined) continue;
    const balance = r.fromMonth > snap.nowMonth ? r.balance : snap.byLoan.get(l.id)?.balance;
    if (balance !== undefined && balance > l.initialAmount * 1.01 + 1) {
      issues.push({ id: `li-${l.id}`, label: l.name || l.bank || "Crédit", detail: `Restant dû (${Math.round(balance).toLocaleString("fr-FR")} €) supérieur au montant emprunté (${Math.round(l.initialAmount).toLocaleString("fr-FR")} €) : montant initial ou tableau à vérifier`, href: `/patrimoine/credit/${l.id}`, severity: "critical" });
    }
  }
  for (const b of data.buildings) {
    const f = snap.byBuilding.get(b.id);
    if (!b.kind) issues.push({ id: `k-${b.id}`, label: b.name, detail: "Nature du bien à préciser (immeuble, maison, hangar…)", href: `/patrimoine/immeuble/${b.id}?modifier=1`, severity: "advice" });
    if (!b.usage && !(f && f.rentMonthly > 0)) issues.push({ id: `u-${b.id}`, label: b.name, detail: "Usage à préciser (résidence principale, vacant, professionnel…)", href: `/patrimoine/immeuble/${b.id}?modifier=1`, severity: "advice" });
    // Un crédit qui démarre avant l'achat du bien trahit en général une date d'acquisition erronée.
    const starts = data.loans.filter((l) => l.buildingId === b.id && l.startDate).map((l) => l.startDate!.slice(0, 7));
    const first = starts.sort()[0];
    if (b.acquisitionDate && first && b.acquisitionDate.slice(0, 7) > first) {
      issues.push({ id: `a-${b.id}`, label: b.name, detail: `Date d'acquisition (${b.acquisitionDate.slice(0, 7)}) postérieure au début de son crédit (${first}) : à vérifier`, href: `/patrimoine/immeuble/${b.id}?modifier=1`, severity: "advice" });
    }
  }
  for (const st of data.statements) {
    const fg = st.figures;
    if ([fg.revenue, fg.netResult, fg.equity, fg.bankDebt, fg.cash].every((v) => v === undefined)) {
      const c = data.companies.find((x) => x.id === st.companyId);
      issues.push({ id: `s-${st.id}`, label: `Bilan ${st.year}${c ? ` · ${c.name}` : ""}`, detail: "Aucun chiffre saisi : absent du dossier", href: "/plus/bilans", severity: "advice" });
    }
  }
  for (const w of data.works) {
    if (w.status !== "termine" && !w.year) {
      issues.push({ id: `w-${w.id}`, label: w.label, detail: "Travaux sans année prévue", href: `/patrimoine?vue=travaux`, severity: "advice" });
    }
  }
  return issues;
}
