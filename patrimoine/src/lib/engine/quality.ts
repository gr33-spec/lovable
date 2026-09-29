import type { AppData } from "../types";
import type { Snapshot } from "./snapshot";
import { auditLoans, suspectAcquisition } from "./loan-audit";
import { reliableStart } from "../schedule";

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
  // Vérification croisée de chaque crédit (montant, taux, durée, mensualité, dates, doublons).
  const seen = new Set<string>();
  for (const x of auditLoans(data, snap)) {
    const l = data.loans.find((y) => y.id === x.loanId)!;
    const id = `la-${l.id}-${x.short}`;
    if (seen.has(id)) continue;
    seen.add(id);
    issues.push({ id: x.severity === "critical" ? `li-${l.id}-${seen.size}` : `la-${l.id}-${seen.size}`, label: l.name || l.bank || "Crédit", detail: x.text, href: `/patrimoine/credit/${l.id}`, severity: x.severity });
  }
  for (const b of data.buildings) {
    const f = snap.byBuilding.get(b.id);
    if (!b.kind) issues.push({ id: `k-${b.id}`, label: b.name, detail: "Nature du bien à préciser (immeuble, maison, hangar…)", href: `/patrimoine/immeuble/${b.id}?modifier=1`, severity: "advice" });
    if (!b.usage && !(f && f.rentMonthly > 0)) issues.push({ id: `u-${b.id}`, label: b.name, detail: "Usage à préciser (résidence principale, vacant, professionnel…)", href: `/patrimoine/immeuble/${b.id}?modifier=1`, severity: "advice" });
    // Nombre de lots annoncé et logements saisis doivent concorder.
    const units = data.units.filter((u) => u.buildingId === b.id);
    if (b.lotsCount && units.length && b.lotsCount !== units.length) issues.push({ id: `n-${b.id}`, label: b.name, detail: `${b.lotsCount} lots annoncés mais ${units.length} logement(s) saisi(s)`, href: `/patrimoine/immeuble/${b.id}`, severity: "advice" });
    // Loyer global de l'immeuble (logements non détaillés) : rien à signaler par logement.
    const globalRent = !!b.rentMonthly && !units.some((u) => u.rent && u.rent > 0);
    const unpaid = globalRent ? [] : units.filter((u) => u.status !== "vacant" && !(u.rent && u.rent > 0));
    if (unpaid.length) issues.push({ id: `r-${b.id}`, label: b.name, detail: `${unpaid.length} logement(s) occupé(s) sans loyer renseigné (${unpaid.map((u) => u.name).slice(0, 3).join(", ")}) : loyers sous-estimés`, href: `/patrimoine/immeuble/${b.id}`, severity: "critical" });
    // Logement et bail en cours doivent dire la même chose (loyer, occupation).
    for (const u of units) {
      const lease = data.tenancies.find((t) => t.unitId === u.id && t.status === "actif");
      if (!lease) continue;
      if (u.status === "vacant") issues.push({ id: `v-${u.id}`, label: `${b.name} · ${u.name}`, detail: "Marqué vacant alors qu'un bail est en cours : taux d'occupation et loyers faussés", href: `/patrimoine/immeuble/${b.id}`, severity: "critical" });
      else if (lease.rent !== undefined && u.rent !== undefined && Math.abs(lease.rent - u.rent) > 1) issues.push({ id: `rl-${u.id}`, label: `${b.name} · ${u.name}`, detail: `Loyer du logement (${Math.round(u.rent)} €) différent du bail en cours (${Math.round(lease.rent)} €) : à harmoniser`, href: `/patrimoine/immeuble/${b.id}`, severity: "critical" });
    }
    if (suspectAcquisition(data, b)) issues.push({ id: `as-${b.id}`, label: b.name, detail: `Date d'acquisition (${b.acquisitionDate!.slice(0, 7)}) déduite d'un tableau d'amortissement commencé en cours de prêt : à corriger`, href: `/patrimoine/immeuble/${b.id}?modifier=1`, severity: "advice" });
    // Un crédit qui démarre avant l'achat du bien trahit en général une date d'acquisition erronée.
    const starts = data.loans.filter((l) => l.buildingId === b.id).map((l) => reliableStart(l)).filter((d): d is string => !!d).map((d) => d.slice(0, 7));
    const first = starts.sort()[0];
    if (b.acquisitionDate && first && b.acquisitionDate.slice(0, 7) > first) {
      issues.push({ id: `a-${b.id}`, label: b.name, detail: `Date d'acquisition (${b.acquisitionDate.slice(0, 7)}) postérieure au début de son crédit (${first}) : à vérifier`, href: `/patrimoine/immeuble/${b.id}?modifier=1`, severity: "advice" });
    }
  }
  // Biens en double : même nom et même adresse (ou même nom sans adresse).
  const seenB = new Map<string, string>();
  for (const b of data.buildings) {
    const key = `${b.name.trim().toLowerCase()}|${(b.address ?? "").trim().toLowerCase()}|${(b.city ?? "").trim().toLowerCase()}`;
    const other = seenB.get(key);
    if (other) issues.push({ id: `bd-${b.id}`, label: b.name, detail: "Doublon probable d'un autre bien (même nom, même adresse) : compté deux fois (valeur, lots, dette)", href: `/patrimoine/immeuble/${b.id}`, severity: "critical" });
    else seenB.set(key, b.id);
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
