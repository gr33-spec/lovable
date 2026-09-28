import type { AppData, Company } from "../types";
import { monthLabel } from "../engine/dates";
import { NO_COMPANY, cashflowMonthly, companyTree, type Figures } from "../engine/snapshot";
import { halfDebtYear, type Projection } from "../engine/projection";
import { portfolioIndicators } from "../engine/indicators";
import { eur, eurCompact, pct, pdfSafe } from "../format";

// Chiffres du dossier banque, calculés une seule fois et testés : chaque page
// du PDF lit ce modèle, ce qui garantit des totaux identiques d'une page à l'autre.

const K = (n: number | undefined) => (n === undefined ? "—" : pdfSafe(eurCompact(n)));

// ——— Modèle du groupe (ou d'une société) ———

export interface GroupModel {
  name: string;
  f: Figures;
  indicators: Map<string, number | undefined>;
  buildings: {
    name: string;
    place: string;
    company: string;
    lots: number;
    acquisition: string;
    value?: number;
    rentAnnual: number;
    debt: number;
  }[];
  loansByCompany: { company: string; loans: { name: string; bank: string; initial?: number; balance?: number; monthly?: number; rate?: number; end?: string; note?: string }[]; balance: number; monthly: number }[];
  /** Crédits rattachés à une société et non à un immeuble. */
  companyLevelDebt: number;
  /** Immeubles loués sans aucune charge renseignée. */
  missingCharges: number;
  capacity: { company: string; rent: number; charges: number; payments: number; cf: number; dscr?: number }[];
  highlights: string[];
  milestones: { year: number; label: string; freed: number }[];
  years: number[];
  debtSeries: number[];
  cfSeries: number[];
  statements: { company: string; year: number; revenue?: number; net?: number; caf?: number; equity?: number; bankDebt?: number; cash?: number }[];
}

export function groupModel(data: AppData, p: Projection, name: string): GroupModel {
  const snap = p.snapshot;
  const f = snap.total;
  const indicators = new Map(portfolioIndicators(data, p).map((i) => [i.id, i.value]));
  const companyName = (id?: string | null) => (id ? data.companies.find((c) => c.id === id)?.name : undefined) ?? "En direct";

  const buildings = data.buildings.map((b) => {
    const bf = snap.byBuilding.get(b.id)!;
    return {
      name: b.name,
      place: [b.address, b.city].filter(Boolean).join(", "),
      company: companyName(b.companyId),
      lots: bf.units,
      acquisition: [b.acquisitionDate ? b.acquisitionDate.slice(0, 4) : undefined, b.acquisitionPrice ? K(b.acquisitionPrice) : undefined].filter(Boolean).join(" · "),
      value: bf.unvalued ? undefined : bf.value,
      rentAnnual: bf.rentMonthly * 12,
      debt: bf.debt,
    };
  });

  const byCompany = new Map<string, GroupModel["loansByCompany"][number]>();
  const buildingsById = new Map(data.buildings.map((b) => [b.id, b]));
  for (const l of data.loans) {
    const r = snap.resolvedLoans.get(l.id);
    if (!r || r.finished) continue;
    const now = snap.byLoan.get(l.id);
    const key = l.buildingId ? (buildingsById.get(l.buildingId)?.companyId ?? NO_COMPANY) : (l.companyId ?? NO_COMPANY);
    const label = key === NO_COMPANY ? "En direct" : companyName(key);
    const g = byCompany.get(label) ?? { company: label, loans: [], balance: 0, monthly: 0 };
    // Crédit signé mais pas encore débloqué : montant et mensualité à venir, hors totaux d'aujourd'hui.
    const upcoming = r.fromMonth > snap.nowMonth;
    const notes: string[] = [];
    if (upcoming) notes.push(`Premières échéances en ${monthLabel(r.fromMonth)} : non inclus dans les totaux.`);
    if (!upcoming && now?.balance === undefined) notes.push("Capital restant dû non communiqué : non inclus dans le total.");
    if (r.quality === "estimated") notes.push(r.notes[0] ?? "Échéancier estimé.");
    g.loans.push({
      name: l.name || "Crédit",
      bank: l.bank ?? "",
      initial: l.initialAmount,
      balance: upcoming ? (r.balance ?? l.initialAmount) : now?.balance,
      monthly: upcoming ? (r.payment !== undefined ? r.payment + r.insurance : undefined) : now?.paymentMonthly || undefined,
      rate: l.ratePct ?? r.impliedRatePct,
      end: r.endMonth !== undefined ? monthLabel(r.endMonth) : undefined,
      note: notes.join(" ") || undefined,
    });
    g.balance += upcoming ? 0 : (now?.balance ?? 0);
    g.monthly += now?.paymentMonthly ?? 0;
    byCompany.set(label, g);
  }

  const capacity = companyTree(data.companies)
    .map(({ company }) => ({ company, own: snap.ownByCompany.get(company.id) }))
    .filter((x): x is { company: Company; own: Figures } => !!x.own && (x.own.rentMonthly > 0 || x.own.paymentsMonthly > 0 || x.own.chargesAnnual > 0))
    .map(({ company, own }) => {
      const charges = own.chargesAnnual / 12;
      return { company: company.name, rent: own.rentMonthly, charges, payments: own.paymentsMonthly, cf: cashflowMonthly(own), dscr: own.paymentsMonthly > 0 && own.rentMonthly > 0 ? (own.rentMonthly - charges) / own.paymentsMonthly : undefined };
    });
  const direct = snap.ownByCompany.get(NO_COMPANY);
  if (direct && (direct.rentMonthly > 0 || direct.paymentsMonthly > 0 || direct.chargesAnnual > 0)) {
    const charges = direct.chargesAnnual / 12;
    capacity.push({ company: "En direct", rent: direct.rentMonthly, charges, payments: direct.paymentsMonthly, cf: cashflowMonthly(direct), dscr: direct.paymentsMonthly > 0 && direct.rentMonthly > 0 ? (direct.rentMonthly - charges) / direct.paymentsMonthly : undefined });
  }

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
  if (f.units > 0) highlights.push(`${f.buildings} immeuble(s), ${f.units} lots${occupancy !== undefined ? `, taux d'occupation de ${pct(occupancy)}` : ""}.`);
  if (cf > 0 && f.unknownPayment === 0 && chargesComplete) highlights.push(`Cash-flow positif de ${eur(Math.round(cf))} par mois, après charges et mensualités.`);
  if (dscr !== undefined && dscr >= 1.2 && f.unknownPayment === 0 && chargesComplete) highlights.push(`Loyers nets couvrant ${dscr.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} fois les mensualités de crédit.`);
  if (half) highlights.push(`Capital restant dû divisé par deux d'ici ${half}.`);

  const ends = new Map<number, { freed: number; names: string[] }>();
  for (const e of p.events.filter((x) => x.kind === "loan_end")) {
    const cur = ends.get(e.year) ?? { freed: 0, names: [] };
    cur.freed += e.monthlyFreed ?? 0;
    cur.names.push(e.label.replace(/^Fin — /, ""));
    ends.set(e.year, cur);
  }
  const milestones = [...ends.entries()]
    .sort((a, b) => a[0] - b[0])
    .slice(0, 8)
    .map(([year, v]) => ({ year, freed: v.freed, label: v.names.length > 2 ? `${v.names.length} crédits se terminent` : v.names.join(", ") }));

  const statements = companyTree(data.companies)
    .map(({ company }) => {
      const st = [...data.statements].filter((s) => s.companyId === company.id).sort((a, b) => b.year - a.year)[0];
      if (!st) return undefined;
      const fg = st.figures;
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
    buildings,
    loansByCompany: [...byCompany.values()],
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
  };
}

