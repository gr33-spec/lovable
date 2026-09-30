import type { AppData, Company, DocCategory, SaleAction } from "../types";
import { documentIndex } from "../documents";
import { saleLabel } from "../engine/sale";
import { monthLabel } from "../engine/dates";
import { NO_COMPANY, cashflowMonthly, companyTree, dscr as dscrOf, leasedUnits, rentalCharges, rentalPayments, type Figures } from "../engine/snapshot";
import { halfDebtYear, type Projection } from "../engine/projection";
import { portfolioIndicators } from "../engine/indicators";
import { eur, eurCompact, pct, pdfSafe } from "../format";
import { assetMix, isPrivateUse, kindLabel, usageLabel } from "../assets";
import { reliableInitial } from "../schedule";
import { SOURCE_LABEL, endSource, paymentSource, rateSource } from "../engine/provenance";
import { auditLoans, suspectAcquisition } from "../engine/loan-audit";

// Chiffres du dossier banque, calculés une seule fois et testés : chaque page
// du PDF lit ce modèle, ce qui garantit des totaux identiques d'une page à l'autre.

const K = (n: number | undefined) => (n === undefined ? "—" : pdfSafe(eurCompact(n)));

// ——— Modèle du groupe (ou d'une société) ———

export interface GroupModel {
  name: string;
  f: Figures;
  indicators: Map<string, number | undefined>;
  /** Nature des biens : « 6 immeubles de rapport, 3 maisons et 1 hangar ». */
  mix: { total: number; text: string; unspecified: number };
  buildings: {
    name: string;
    place: string;
    /** Type et usage déclarés (« Maison · Résidence principale »). */
    nature: string;
    privateUse: boolean;
    /** Tous les lots sont vacants. */
    allVacant: boolean;
    company: string;
    lots: number;
    acquisition: string;
    value?: number;
    rentAnnual: number;
    debt: number;
  }[];
  loansByCompany: {
    company: string;
    loans: { name: string; bank: string; reference?: string; source: string; rateType?: string; initial?: number; balance?: number; monthly?: number; rate?: number; end?: string; note?: string; monthlyEstimated: boolean; rateEstimated: boolean; endEstimated: boolean; incoherent: boolean }[];
    balance: number;
    monthly: number;
    /** Au moins une mensualité estimée ou non communiquée dans le groupe. */
    approx: boolean;
  }[];
  /** Crédits dont la mensualité n'est qu'estimée (taux inconnu). */
  estimatedLoans: number;
  /** Crédits en cours dont la mensualité est inconnue : exclus des mensualités. */
  missingPaymentLoans: number;
  /** Crédits aux chiffres contradictoires (restant dû supérieur au montant emprunté…). */
  incoherentLoans: number;
  /** Crédits rattachés à une société et non à un immeuble. */
  companyLevelDebt: number;
  /** Immeubles loués sans aucune charge renseignée. */
  missingCharges: number;
  capacity: { company: string; rent: number; charges: number; payments: number; cf: number; dscr?: number; chargesMissing: boolean; approx: boolean }[];
  highlights: string[];
  milestones: { year: number; label: string; freed: number; estimated: boolean }[];
  years: number[];
  debtSeries: number[];
  cfSeries: number[];
  statements: { company: string; year: number; revenue?: number; net?: number; caf?: number; equity?: number; bankDebt?: number; cash?: number }[];
  /** Qui détient quoi et qui porte la dette (par société, chiffres propres, hors filiales). */
  structure: { name: string; form: string; owner: string; assets: number; value?: number; debt: number; rentAnnual: number; payments: number }[];
  /** Pièces justificatives disponibles dans l'application (non recopiées dans le PDF). */
  evidence: { label: string; have: number; total: number; missing: string[] }[];
  /** Ventes prévues (immeubles ou lots) prises en compte dans la trajectoire. */
  sales: { label: string; when: string; price?: number; debtRepaid: number; costs: number; net?: number; rentLost: number; paymentsRemoved: number; underOffer: boolean }[];
}

export function groupModel(data: AppData, p: Projection, name: string): GroupModel {
  const snap = p.snapshot;
  const f = snap.total;
  const indicators = new Map(portfolioIndicators(data, p).map((i) => [i.id, i.value]));
  const companyName = (id?: string | null) => (id ? data.companies.find((c) => c.id === id)?.name : undefined) ?? "En direct";

  // Biens locatifs d'abord, biens à usage privé ensuite.
  const ordered = [...data.buildings.filter((b) => !isPrivateUse(b)), ...data.buildings.filter(isPrivateUse)];
  const buildings = ordered.map((b) => {
    const bf = snap.byBuilding.get(b.id)!;
    return {
      name: b.name,
      place: [b.address, b.city].filter(Boolean).join(", "),
      nature: [kindLabel(b.kind), b.usage && b.usage !== "location" ? usageLabel(b.usage) : undefined].filter(Boolean).join(" · "),
      privateUse: isPrivateUse(b),
      allVacant: bf.units > 0 && bf.vacantUnits >= bf.units,
      company: companyName(b.companyId),
      lots: bf.units,
      // Date recopiée d'un tableau commencé en cours de prêt : non fiable, donc non affichée.
      acquisition: [b.acquisitionDate && !suspectAcquisition(data, b) ? b.acquisitionDate.slice(0, 4) : undefined, b.acquisitionPrice ? K(b.acquisitionPrice) : undefined].filter(Boolean).join(" · "),
      value: bf.unvalued ? undefined : bf.value,
      rentAnnual: bf.rentMonthly * 12,
      debt: bf.debt,
    };
  });

  const byCompany = new Map<string, GroupModel["loansByCompany"][number]>();
  const audit = auditLoans(data, snap);
  let estimatedLoans = 0;
  let missingPaymentLoans = 0;
  let incoherentLoans = 0;
  const approxKeys = new Set<string>();
  const approxKeysLoans = new Set<string>();
  const buildingsById = new Map(data.buildings.map((b) => [b.id, b]));
  for (const l of data.loans) {
    const r = snap.resolvedLoans.get(l.id);
    if (!r || r.finished) continue;
    const now = snap.byLoan.get(l.id);
    const key = l.buildingId ? (buildingsById.get(l.buildingId)?.companyId ?? NO_COMPANY) : (l.companyId ?? NO_COMPANY);
    const label = key === NO_COMPANY ? "En direct" : companyName(key);
    const g = byCompany.get(label) ?? { company: label, loans: [], balance: 0, monthly: 0, approx: false };
    // Crédit signé mais pas encore débloqué : montant et mensualité à venir, hors totaux d'aujourd'hui.
    const upcoming = r.fromMonth > snap.nowMonth;
    const notes: string[] = [];
    if (upcoming) notes.push(`Premières échéances en ${monthLabel(r.fromMonth)} : non inclus dans les totaux.`);
    if (!upcoming && now?.balance === undefined) notes.push("Capital restant dû non communiqué : non inclus dans le total.");
    // Mensualité estimée : ni saisie, ni taux connu, ni tableau de la banque (même règle que les totaux).
    const monthlyEstimated = !upcoming && paymentSource(l, r) === "estimation";
    const missingPayment = !upcoming && !r.finished && (paymentSource(l, r) === "inconnue" || !now?.paymentMonthly);
    const rateEstimated = rateSource(l, r) === "calcul";
    const endEstimated = endSource(l, r) === "estimation";
    const initial = reliableInitial(l).value;
    const balanceNow = upcoming ? (r.balance ?? initial) : now?.balance;
    // Vérification croisée : toute contradiction est écrite sous le crédit, en rouge si un montant est en cause.
    const findings = audit.filter((x) => x.loanId === l.id);
    const incoherent = findings.some((x) => x.severity === "critical");
    for (const x of findings) if (x.short !== "Banque non renseignée." && !notes.includes(x.short)) notes.push(x.short);
    if (missingPayment) notes.push("Mensualité non communiquée : exclue des mensualités et du cash-flow.");
    if (r.quality === "estimated") notes.push(r.notes[0] ?? "Échéancier estimé.");
    if (rateEstimated && r.quality !== "estimated") notes.push("Taux déduit de la mensualité et de la date de fin.");
    if (monthlyEstimated) estimatedLoans++;
    if (monthlyEstimated || missingPayment) approxKeysLoans.add(l.id);
    if (missingPayment) missingPaymentLoans++;
    if (incoherent) incoherentLoans++;
    g.loans.push({
      name: l.name || "Crédit",
      bank: l.bank ?? l.schedule?.meta?.bank ?? "",
      reference: l.reference ?? l.schedule?.meta?.reference,
      source: upcoming ? "Crédit signé" : SOURCE_LABEL[paymentSource(l, r)],
      rateType: l.rateType === "variable" ? "variable" : undefined,
      initial,
      balance: balanceNow,
      monthly: upcoming ? (r.payment !== undefined ? r.payment + r.insurance : undefined) : now?.paymentMonthly || undefined,
      rate: l.ratePct ?? r.impliedRatePct,
      end: r.endMonth !== undefined ? monthLabel(r.endMonth) : undefined,
      note: notes.join(" ") || undefined,
      monthlyEstimated,
      rateEstimated,
      endEstimated,
      incoherent,
    });
    if (monthlyEstimated || missingPayment) {
      g.approx = true;
      approxKeys.add(key);
    }
    g.balance += upcoming ? 0 : (now?.balance ?? 0);
    g.monthly += now?.paymentMonthly ?? 0;
    byCompany.set(label, g);
  }

  // Sociétés dont un bien loué n'a aucune charge renseignée.
  const chargesMissingKeys = new Set(
    data.buildings
      .filter((b) => {
        const bf = snap.byBuilding.get(b.id);
        return !!bf && bf.rentMonthly > 0 && bf.chargesAnnual === 0;
      })
      .map((b) => b.companyId ?? NO_COMPANY),
  );
  // Capacité de remboursement : périmètre locatif (formules uniques de engine/snapshot).
  const capacityRow = (key: string, name: string, own: Figures) => {
    return {
      company: name,
      rent: own.rentMonthly,
      charges: rentalCharges(own) / 12,
      payments: rentalPayments(own),
      cf: cashflowMonthly(own),
      dscr: dscrOf(own),
      chargesMissing: chargesMissingKeys.has(key),
      approx: approxKeys.has(key),
    };
  };
  const capacity = companyTree(data.companies)
    .map(({ company }) => ({ company, own: snap.ownByCompany.get(company.id) }))
    .filter((x): x is { company: Company; own: Figures } => !!x.own && (x.own.rentMonthly > 0 || rentalPayments(x.own) > 0 || rentalCharges(x.own) > 0))
    .map(({ company, own }) => capacityRow(company.id, company.name, own));
  const direct = snap.ownByCompany.get(NO_COMPANY);
  if (direct && (direct.rentMonthly > 0 || rentalPayments(direct) > 0 || rentalCharges(direct) > 0)) capacity.push(capacityRow(NO_COMPANY, "En direct", direct));

  const cf = cashflowMonthly(f);
  const occupancy = indicators.get("occupancy");
  const dscr = indicators.get("dscr");
  const half = halfDebtYear(p);
  // Un point fort n'est affirmé que si les chiffres qui le fondent sont complets.
  const chargesComplete = !data.buildings.some((b) => {
    const bf = snap.byBuilding.get(b.id);
    return !!bf && bf.rentMonthly > 0 && bf.chargesAnnual === 0;
  });
  const highlights: string[] = [];
  // Chaque affirmation repose sur des chiffres complets et cohérents ; sinon elle est omise.
  const mix = assetMix(data.buildings);
  const reliable = f.unknownPayment === 0 && f.unknownDebt === 0 && incoherentLoans === 0;
  if (mix.total > 0) highlights.push(`${mix.total > 1 ? `${mix.total} biens immobiliers` : "1 bien immobilier"} : ${mix.text}.`);
  if (f.units > 0) highlights.push(`${f.units} lot${f.units > 1 ? "s" : ""} locatif${f.units > 1 ? "s" : ""}${occupancy !== undefined ? `, taux d'occupation de ${pct(occupancy)} (${f.units - f.vacantUnits} loué${f.units - f.vacantUnits > 1 ? "s" : ""})` : ""}.`);
  if (cf > 0 && reliable && chargesComplete) highlights.push(`Cash-flow positif de ${eur(Math.round(cf))} par mois, après charges et mensualités.`);
  if (dscr !== undefined && dscr >= 1.2 && reliable && chargesComplete) highlights.push(`Loyers nets couvrant ${dscr.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} fois les mensualités de crédit.`);
  if (half && reliable) highlights.push(`Capital restant dû divisé par deux d'ici ${half}.`);

  // Fin de crédit estimée (taux inconnu, ni date de fin ni tableau) : signalée comme telle.
  const endGuessed = new Set(data.loans.filter((l) => snap.resolvedLoans.has(l.id) && endSource(l, snap.resolvedLoans.get(l.id)!) === "estimation").map((l) => l.id));
  const ends = new Map<number, { freed: number; names: string[]; estimated: boolean }>();
  for (const e of p.events.filter((x) => x.kind === "loan_end")) {
    const cur = ends.get(e.year) ?? { freed: 0, names: [], estimated: false };
    cur.freed += e.monthlyFreed ?? 0;
    cur.names.push(e.label.replace(/^Fin — /, ""));
    if (e.loanId && (endGuessed.has(e.loanId) || approxKeysLoans.has(e.loanId))) cur.estimated = true;
    ends.set(e.year, cur);
  }
  const milestones = [...ends.entries()]
    .sort((a, b) => a[0] - b[0])
    .slice(0, 8)
    .map(([year, v]) => ({ year, freed: v.freed, estimated: v.estimated, label: v.names.length > 3 ? `${v.names.slice(0, 2).join(", ")} et ${v.names.length - 2} autres` : v.names.join(", ") }));

  const statements = companyTree(data.companies)
    .map(({ company }) => {
      const st = [...data.statements].filter((s) => s.companyId === company.id).sort((a, b) => b.year - a.year)[0];
      if (!st) return undefined;
      const fg = st.figures;
      // Un exercice sans aucun chiffre saisi n'apporte rien au dossier.
      if ([fg.revenue, fg.netResult, fg.equity, fg.bankDebt, fg.cash].every((v) => v === undefined)) return undefined;
      return {
        company: company.name,
        year: st.year,
        revenue: fg.revenue,
        net: fg.netResult,
        caf: fg.netResult !== undefined && fg.depreciation !== undefined ? fg.netResult + fg.depreciation : undefined,
        equity: fg.equity,
        bankDebt: fg.bankDebt,
        cash: fg.cash,
      };
    })
    .filter((x): x is NonNullable<typeof x> => !!x);

  const horizon = p.years.slice(0, 26);
  return {
    name,
    f,
    indicators,
    mix,
    buildings,
    loansByCompany: [...byCompany.values()],
    structure: structureRows(data, snap),
    evidence: evidenceRows(data, snap),
    estimatedLoans,
    missingPaymentLoans,
    incoherentLoans,
    companyLevelDebt: Math.max(0, f.debt - buildings.reduce((s, b) => s + b.debt, 0)),
    missingCharges: data.buildings.filter((b) => {
      const bf = snap.byBuilding.get(b.id);
      return !!bf && bf.rentMonthly > 0 && bf.chargesAnnual === 0;
    }).length,
    capacity,
    highlights,
    milestones,
    years: horizon.map((r) => r.year),
    debtSeries: horizon.map((r) => r.debt),
    cfSeries: horizon.map((r) => Math.round(r.cashflow / 12)),
    statements,
    sales: p.sales
      .filter((x) => x.source === "plan")
      .map((x) => {
        const a = data.plans.find((pl): pl is SaleAction => pl.id === x.actionId && pl.type === "sale");
        return {
          label: a ? pdfSafe(saleLabel(data, a)) : "Vente",
          when: monthLabel(x.month),
          price: x.price,
          debtRepaid: x.debtRepaid,
          costs: x.fees + x.tax,
          net: x.netCash,
          rentLost: x.rentLostMonthly,
          paymentsRemoved: x.paymentsRemovedMonthly,
          underOffer: !!a?.underOffer,
        };
      }),
  };
}


function structureRows(data: AppData, snap: Projection["snapshot"]): GroupModel["structure"] {
  const byId = new Map(data.companies.map((c) => [c.id, c]));
  const row = (key: string, name: string, form: string, owner: string) => {
    const f = snap.ownByCompany.get(key);
    if (!f) return undefined;
    const assets = data.buildings.filter((b) => (b.companyId ?? NO_COMPANY) === key).length;
    if (!assets && f.debt <= 0 && f.loans === 0) return undefined;
    return { name, form, owner, assets, value: f.unvalued ? undefined : f.value, debt: f.debt, rentAnnual: f.rentMonthly * 12, payments: f.paymentsMonthly };
  };
  const out: GroupModel["structure"] = [];
  for (const { company } of companyTree(data.companies)) {
    const parent = company.parentId ? byId.get(company.parentId) : undefined;
    const owner = parent ? `${parent.name}${company.ownershipPct ? ` (${pct(company.ownershipPct, 0)})` : ""}` : (company.partners ?? []).map((p) => p.name).filter(Boolean).slice(0, 2).join(", ");
    const r = row(company.id, company.name, company.kind === "holding" ? "Holding" : company.kind, owner);
    if (r) out.push(r);
    else if (company.kind === "holding") out.push({ name: company.name, form: "Holding", owner, assets: 0, value: undefined, debt: 0, rentAnnual: 0, payments: 0 });
  }
  const direct = row(NO_COMPANY, "En direct", "Personnes physiques", data.settings.ownerName ?? "");
  if (direct) out.push(direct);
  return out;
}

function evidenceRows(data: AppData, snap: Projection["snapshot"]): GroupModel["evidence"] {
  const docs = documentIndex(data);
  const has = (cat: DocCategory, pick: (d: (typeof docs)[number]) => boolean) => docs.some((d) => d.category === cat && pick(d));
  const active = data.loans.filter((l) => {
    const r = snap.resolvedLoans.get(l.id);
    return r && !r.finished;
  });
  const rental = data.buildings.filter((b) => !isPrivateUse(b));
  const leased = leasedUnits(data).filter((u) => u.status !== "vacant");
  const loanName = (l: (typeof active)[number]) => l.name || l.bank || "Crédit";
  const rows: GroupModel["evidence"] = [];
  const add = <T,>(label: string, list: T[], ok: (x: T) => boolean, name: (x: T) => string) => {
    if (!list.length) return;
    const missing = list.filter((x) => !ok(x));
    rows.push({ label, have: list.length - missing.length, total: list.length, missing: missing.map(name) });
  };
  add("Tableaux d'amortissement de la banque", active, (l) => !!l.schedule || has("tableau_amortissement", (d) => d.loanId === l.id), loanName);
  add("Offres de prêt", active, (l) => has("offre_pret", (d) => d.loanId === l.id), loanName);
  add("Actes d'achat", rental, (b) => has("acte", (d) => d.buildingId === b.id), (b) => b.name);
  add("Assurances des biens", rental, (b) => has("assurance", (d) => d.buildingId === b.id), (b) => b.name);
  add("Baux signés", leased, (u) => data.tenancies.some((t) => t.unitId === u.id && t.status === "actif" && !!t.signedLease), (u) => {
    const b = data.buildings.find((x) => x.id === u.buildingId);
    return [b?.name, u.name].filter(Boolean).join(" · ");
  });
  add("Derniers bilans", data.companies.filter((c) => c.kind !== "holding" || data.statements.some((st) => st.companyId === c.id)), (c) => data.statements.some((st) => st.companyId === c.id && !!st.fileId), (c) => c.name);
  return rows;
}
