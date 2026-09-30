import type { AppData, Building, Loan, Unit } from "../types";
import { leasedUnits, type Snapshot } from "./snapshot";
import { auditLoans, suspectAcquisition } from "./loan-audit";
import { reliableStart } from "../schedule";
import { unitMissing } from "../missing";
import { missingDocuments } from "../doc-completeness";

// Ce qui manque ou se contredit, en langage métier : une ligne par sujet,
// rattachée à l'élément concerné (bien, crédit, logement, société), avec une
// priorité. Rien n'est inventé ni corrigé ici.
//  - important : un chiffre affiché serait faux ou absent pour la banque ;
//  - utile     : précise ou justifie les chiffres ;
//  - optionnel : confort, sans effet sur les montants.

export type Priority = "important" | "utile" | "optionnel";

export interface QualityIssue {
  id: string;
  /** Élément concerné (titre de la ligne). */
  label: string;
  detail: string;
  href: string;
  priority: Priority;
  /** Regroupement par élément (un bien et ses logements, un crédit, une société). */
  group: { key: string; name: string; kind: "bien" | "credit" | "societe" | "autre" };
  /** Compatibilité : « critical » = important. */
  severity: "critical" | "advice";
}

export const PRIORITY_LABEL: Record<Priority, string> = { important: "Important", utile: "Utile", optionnel: "Optionnel" };

export function qualityIssues(data: AppData, snap: Snapshot): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const seen = new Set<string>();
  const push = (id: string, priority: Priority, group: QualityIssue["group"], label: string, detail: string, href: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    issues.push({ id, priority, group, label, detail, href, severity: priority === "important" ? "critical" : "advice" });
  };
  const gB = (b: Building): QualityIssue["group"] => ({ key: `b-${b.id}`, name: b.name, kind: "bien" });
  const gL = (l: Loan): QualityIssue["group"] => ({ key: `l-${l.id}`, name: l.name || l.bank || "Crédit", kind: "credit" });
  const bHref = (b: Building, edit = false) => `/patrimoine/immeuble/${b.id}${edit ? "?modifier=1" : ""}`;

  // ——— Biens ———
  const leased = leasedUnits(data);
  for (const b of data.buildings) {
    const f = snap.byBuilding.get(b.id);
    const units = data.units.filter((u) => u.buildingId === b.id);
    const personal = b.usage === "residence_principale" || b.usage === "residence_secondaire";
    if ((f?.unvalued ?? 0) > 0) push(`b-${b.id}`, personal ? "utile" : "important", gB(b), b.name, "Valeur actuelle non renseignée (patrimoine net, LTV)", bHref(b, true));
    if (f && f.rentMonthly > 0 && f.chargesAnnual === 0) push(`c-${b.id}`, "important", gB(b), b.name, "Charges non renseignées (taxe foncière, assurance) : cash-flow surestimé", bHref(b, true));
    if (!b.kind) push(`k-${b.id}`, "utile", gB(b), b.name, "Nature du bien à préciser (immeuble, maison, hangar…)", bHref(b, true));
    if (!b.usage && !(f && f.rentMonthly > 0)) push(`u-${b.id}`, "utile", gB(b), b.name, "Usage à préciser (résidence principale, vacant…) : il détermine le périmètre locatif", bHref(b, true));
    if (!b.acquisitionDate && !personal) push(`d-${b.id}`, "utile", gB(b), b.name, "Date d'achat à renseigner", bHref(b, true));
    if (b.lotsCount && units.length && b.lotsCount !== units.length) push(`n-${b.id}`, "optionnel", gB(b), b.name, `${b.lotsCount} lots annoncés mais ${units.length} logement(s) saisi(s)`, bHref(b));

    // Loyer global de l'immeuble (logements non détaillés) : rien à signaler par logement.
    // Loyer effectif : celui du bail en cours, sinon celui du logement.
    const effective = leased.filter((u) => u.buildingId === b.id);
    const globalRent = !!b.rentMonthly && !effective.some((u) => u.rent && u.rent > 0);
    const noRent = globalRent ? [] : effective.filter((u) => u.status !== "vacant" && !(u.rent && u.rent > 0));
    if (noRent.length) push(`r-${b.id}`, "important", gB(b), b.name, `${noRent.length} logement(s) occupé(s) sans loyer (${noRent.map((u) => u.name).slice(0, 3).join(", ")}) : loyers sous-estimés`, bHref(b));
    for (const u of units) unitChecks(u, b);

    if (suspectAcquisition(data, b)) push(`as-${b.id}`, "utile", gB(b), b.name, `Date d'achat (${b.acquisitionDate!.slice(0, 7)}) recopiée d'un tableau commencé en cours de prêt : à corriger`, bHref(b, true));
    // Un crédit qui démarre avant l'achat du bien trahit en général une date d'achat erronée.
    const first = data.loans.filter((l) => l.buildingId === b.id).map((l) => reliableStart(l)).filter((d): d is string => !!d).map((d) => d.slice(0, 7)).sort()[0];
    if (b.acquisitionDate && first && b.acquisitionDate.slice(0, 7) > first) push(`a-${b.id}`, "utile", gB(b), b.name, `Date d'achat (${b.acquisitionDate.slice(0, 7)}) postérieure au déblocage de son crédit (${first}) : à vérifier`, bHref(b, true));
    for (const d of missingDocuments(data, { buildingId: b.id })) push(`doc-b-${b.id}-${d.id}`, "utile", gB(b), b.name, `Document à ajouter : ${d.label}`, bHref(b));
  }

  function unitChecks(u: Unit, b: Building) {
    const lease = data.tenancies.find((t) => t.unitId === u.id && t.status === "actif");
    const where = `${b.name} · ${u.name}`;
    const href = `/patrimoine/logement/${u.id}?depuis=gestion`;
    // Le bail en cours fait foi pour l'occupation et le loyer : un écart avec la fiche du logement ne fausse plus les chiffres.
    if (lease && u.status === "vacant") push(`v-${u.id}`, "optionnel", gB(b), where, "Marqué vacant alors qu'un bail est en cours (le bail est retenu)", href);
    // Dossier du locataire : pièces et informations du bail.
    const missing = unitMissing(data, u).filter((m) => m.id !== "rent");
    if (missing.length) push(`t-${u.id}`, "utile", gB(b), where, `Dossier locataire : ${missing.map((m) => m.label.toLowerCase()).join(", ")}`, href);
  }

  // ——— Crédits ———
  for (const l of data.loans) {
    const r = snap.resolvedLoans.get(l.id);
    if (!r || r.finished) continue;
    const href = `/patrimoine/credit/${l.id}`;
    if (r.quality === "insufficient") push(`l-${l.id}`, "important", gL(l), gL(l).name, `${r.notes[r.notes.length - 1] ?? "Données insuffisantes"} : importer le tableau d'amortissement`, href);
    else if (r.quality === "estimated") push(`l-${l.id}`, "important", gL(l), gL(l).name, `${r.notes[0] ?? "Projection estimée"} : importer le tableau d'amortissement`, href);
    else if (!l.schedule) push(`ls-${l.id}`, "utile", gL(l), gL(l).name, "Tableau d'amortissement à importer (chiffres exacts de la banque)", href);
    for (const d of missingDocuments(data, { loanId: l.id })) push(`doc-l-${l.id}-${d.id}`, "utile", gL(l), gL(l).name, `Document à ajouter : ${d.label}`, href);
  }
  // Vérification croisée (montant, taux, durée, mensualité, dates, doublons).
  for (const x of auditLoans(data, snap)) {
    const l = data.loans.find((y) => y.id === x.loanId)!;
    const priority: Priority = x.severity === "critical" ? "important" : x.short.startsWith("Banque") ? "optionnel" : "utile";
    push(`${x.severity === "critical" ? "li" : "la"}-${l.id}-${x.short}`, priority, gL(l), gL(l).name, x.text, `/patrimoine/credit/${l.id}`);
  }

  // ——— Doublons de biens ———
  const seenB = new Map<string, string>();
  for (const b of data.buildings) {
    const key = `${b.name.trim().toLowerCase()}|${(b.address ?? "").trim().toLowerCase()}|${(b.city ?? "").trim().toLowerCase()}`;
    if (seenB.has(key)) push(`bd-${b.id}`, "important", gB(b), b.name, "Doublon probable d'un autre bien (même nom, même adresse) : compté deux fois", bHref(b));
    else seenB.set(key, b.id);
  }

  // ——— Sociétés et divers ———
  for (const st of data.statements) {
    const fg = st.figures;
    if ([fg.revenue, fg.netResult, fg.equity, fg.bankDebt, fg.cash].every((v) => v === undefined)) {
      const c = data.companies.find((x) => x.id === st.companyId);
      push(`s-${st.id}`, "optionnel", { key: `c-${st.companyId}`, name: c?.name ?? "Société", kind: "societe" }, `Bilan ${st.year}`, "Aucun chiffre saisi : absent du dossier banque", "/plus/bilans");
    }
  }
  for (const w of data.works) {
    if (w.status !== "termine" && !w.year) push(`w-${w.id}`, "optionnel", { key: "travaux", name: "Travaux", kind: "autre" }, w.label, "Travaux sans année prévue", "/patrimoine?vue=travaux");
  }
  return issues;
}

/** Points par priorité (tableau de bord, menu Plus). */
export function issueCounts(issues: QualityIssue[]): Record<Priority, number> {
  const out: Record<Priority, number> = { important: 0, utile: 0, optionnel: 0 };
  for (const i of issues) out[i.priority]++;
  return out;
}
