import "server-only";
import ExcelJS from "exceljs";
import type { AppData } from "../types";
import { currentMonth, monthLabel, yearOf } from "../engine/dates";
import { project } from "../engine/projection";
import { buildingValue, cashflowMonthly, netWorth } from "../engine/snapshot";
import { latentGain } from "../engine/history";
import { leaseInfo, outstanding, todayIso } from "../engine/leases";
import { statementRatios } from "../engine/indicators";
import { COMPANY_KINDS, CONDITIONS, LEASE_TYPES, UNIT_TYPES, WITHDRAWAL_KINDS, WORK_STATUSES, labelOf } from "../labels";

// Export Excel de toutes les données, avec les chiffres calculés par le
// moteur (capital restant dû, mensualités, projection). Cellules vides =
// donnée non renseignée.

const EUR = '#,##0 "€";-#,##0 "€"';
const EUR2 = '#,##0.00 "€";-#,##0.00 "€"';
const PCT = '0.0" %"';
const NAVY = "FF14213D";

type Col = { header: string; key: string; width?: number; fmt?: string };

function sheet(wb: ExcelJS.Workbook, name: string, cols: Col[], rows: Record<string, unknown>[]) {
  const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = cols.map((c) => ({ header: c.header, key: c.key, width: c.width ?? Math.max(12, c.header.length + 2), style: c.fmt ? { numFmt: c.fmt } : {} }));
  const head = ws.getRow(1);
  head.font = { bold: true, color: { argb: "FFFFFFFF" } };
  head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
  head.alignment = { vertical: "middle", wrapText: true };
  head.height = 30;
  for (const r of rows) {
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(r)) clean[k] = v === undefined || v === null || (typeof v === "number" && !Number.isFinite(v)) ? null : v;
    ws.addRow(clean);
  }
  if (rows.length > 0) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } };
  return ws;
}

export async function buildWorkbook(data: AppData): Promise<Buffer> {
  const nowMonth = currentMonth();
  const year = yearOf(nowMonth);
  const today = todayIso();
  const p = project(data, nowMonth);
  const snap = p.snapshot;
  const companyName = (id?: string | null) => data.companies.find((c) => c.id === id)?.name ?? "";
  const buildingName = (id?: string | null) => data.buildings.find((b) => b.id === id)?.name ?? "";

  const wb = new ExcelJS.Workbook();
  wb.creator = "Patrimoine";
  wb.created = new Date();

  // Synthèse
  const t = snap.total;
  const nw = netWorth(t);
  const syn = wb.addWorksheet("Synthèse");
  syn.columns = [{ width: 42 }, { width: 22 }];
  syn.addRow([data.settings.groupName || "Patrimoine", `Export du ${today.split("-").reverse().join("/")}`]).font = { bold: true, size: 14, color: { argb: NAVY } };
  syn.addRow([]);
  const lines: [string, number | string | undefined, string?][] = [
    ["Valeur des biens", t.unvalued > 0 ? "Données insuffisantes" : t.value, EUR],
    ["Capital restant dû", t.debt, EUR],
    ["Patrimoine net", nw === undefined ? "Données insuffisantes" : nw, EUR],
    ["Loyers mensuels", t.rentMonthly, EUR],
    ["Mensualités de crédit", t.paymentsMonthly, EUR],
    ["Charges annuelles", t.chargesAnnual, EUR],
    ["Cash-flow mensuel", cashflowMonthly(t), EUR],
    ["Trésorerie des sociétés", t.cash, EUR],
    ["Comptes courants d'associés", t.partnerAccounts, EUR],
    ["Immeubles", t.buildings],
    ["Lots", t.units],
    ["Lots vacants", t.vacantUnits],
    ["Crédits", t.loans],
  ];
  for (const [label, value, fmt] of lines) {
    const row = syn.addRow([label, value]);
    if (fmt && typeof value === "number") row.getCell(2).numFmt = fmt;
  }
  if (t.unvalued || t.unknownDebt || t.unknownPayment) {
    syn.addRow([]);
    syn.addRow([`À compléter : ${t.unvalued} bien(s) sans valeur, ${t.unknownDebt} crédit(s) sans capital restant dû, ${t.unknownPayment} crédit(s) sans mensualité connue.`]).font = { italic: true, color: { argb: "FFB45309" } };
  }

  sheet(
    wb,
    "Sociétés",
    [
      { header: "Société", key: "name", width: 26 },
      { header: "Type", key: "kind" },
      { header: "Détenue par", key: "parent", width: 22 },
      { header: "% détenu", key: "pct", fmt: PCT },
      { header: "Associés", key: "partners", width: 30 },
      { header: "Valeur des biens", key: "value", fmt: EUR, width: 16 },
      { header: "Capital restant dû", key: "debt", fmt: EUR, width: 16 },
      { header: "Loyers / mois", key: "rent", fmt: EUR },
      { header: "Mensualités / mois", key: "pay", fmt: EUR },
      { header: "Cash-flow / mois", key: "cf", fmt: EUR },
      { header: "Trésorerie", key: "cash", fmt: EUR },
      { header: "Comptes courants", key: "cca", fmt: EUR },
      { header: "Fiscalité", key: "tax", width: 18 },
    ],
    data.companies.map((c) => {
      const f = snap.ownByCompany.get(c.id);
      return {
        name: c.name,
        kind: labelOf(COMPANY_KINDS, c.kind),
        parent: companyName(c.parentId),
        pct: c.ownershipPct,
        partners: (c.partners ?? []).map((x) => `${x.name}${x.pct !== undefined ? ` ${x.pct} %` : ""}`).join(", "),
        value: f && !f.unvalued ? f.value : undefined,
        debt: f?.debt,
        rent: f?.rentMonthly,
        pay: f?.paymentsMonthly,
        cf: f ? cashflowMonthly(f) : undefined,
        cash: c.cash,
        cca: c.partnerAccounts,
        tax: c.taxRegime,
      };
    }),
  );

  sheet(
    wb,
    "Immeubles",
    [
      { header: "Bien", key: "name", width: 24 },
      { header: "Société", key: "company", width: 22 },
      { header: "Adresse", key: "address", width: 28 },
      { header: "Commune", key: "city" },
      { header: "Acquisition", key: "acqDate" },
      { header: "Prix d'achat", key: "acq", fmt: EUR },
      { header: "Valeur estimée", key: "value", fmt: EUR },
      { header: "Plus-value latente", key: "gain", fmt: EUR },
      { header: "Plus-value %", key: "gainPct", fmt: PCT },
      { header: "Surface m²", key: "surface" },
      { header: "Lots", key: "lots" },
      { header: "Loyers / mois", key: "rent", fmt: EUR },
      { header: "Capital restant dû", key: "debt", fmt: EUR },
      { header: "Mensualités / mois", key: "pay", fmt: EUR },
      { header: "Taxe foncière", key: "tf", fmt: EUR },
      { header: "Assurance", key: "ins", fmt: EUR },
      { header: "Comptabilité", key: "acc", fmt: EUR },
      { header: "Autres charges", key: "other", fmt: EUR },
      { header: "État", key: "condition" },
    ],
    data.buildings.map((b) => {
      const f = snap.byBuilding.get(b.id);
      const g = latentGain(data, b, year);
      return {
        name: b.name,
        company: companyName(b.companyId),
        address: b.address,
        city: b.city,
        acqDate: b.acquisitionDate,
        acq: b.acquisitionPrice,
        value: buildingValue(b, data.units.filter((u) => u.buildingId === b.id)),
        gain: g.gain,
        gainPct: g.gainPct,
        surface: b.surface,
        lots: data.units.filter((u) => u.buildingId === b.id).length || b.lotsCount,
        rent: f?.rentMonthly,
        debt: f?.debt,
        pay: f?.paymentsMonthly,
        tf: b.propertyTax,
        ins: b.insurance,
        acc: b.accounting,
        other: b.otherCharges,
        condition: labelOf(CONDITIONS, b.condition),
      };
    }),
  );

  sheet(
    wb,
    "Logements",
    [
      { header: "Bien", key: "building", width: 22 },
      { header: "Logement", key: "name", width: 16 },
      { header: "Type", key: "type" },
      { header: "Surface m²", key: "surface" },
      { header: "Statut", key: "status" },
      { header: "Locataire", key: "tenant", width: 22 },
      { header: "Loyer HC", key: "rent", fmt: EUR2 },
      { header: "Charges", key: "charges", fmt: EUR2 },
      { header: "Bail", key: "lease", width: 16 },
      { header: "Début du bail", key: "start" },
      { header: "Fin / échéance", key: "end" },
      { header: "Prochaine révision", key: "revision" },
      { header: "Indice de référence", key: "index", width: 18 },
      { header: "Impayé cumulé", key: "unpaid", fmt: EUR2 },
    ],
    data.units.map((u) => {
      const info = leaseInfo(u, today);
      return {
        building: buildingName(u.buildingId),
        name: u.name,
        type: labelOf(UNIT_TYPES, u.type),
        surface: u.surface,
        status: u.status === "vacant" ? "Vacant" : "Occupé",
        tenant: [u.tenantFirstName, u.tenantLastName].filter(Boolean).join(" "),
        rent: u.rent,
        charges: u.charges,
        lease: labelOf(LEASE_TYPES, u.leaseType),
        start: u.leaseStart,
        end: info.end,
        revision: info.nextRevision,
        index: [u.indexLabel, u.indexValue].filter((x) => x !== undefined && x !== "").join(" "),
        unpaid: Object.values(u.payments ?? {}).reduce((s, x) => s + outstanding(x), 0) || undefined,
      };
    }),
  );

  sheet(
    wb,
    "Crédits",
    [
      { header: "Crédit", key: "name", width: 24 },
      { header: "Banque", key: "bank", width: 16 },
      { header: "Bien", key: "building", width: 20 },
      { header: "Société", key: "company", width: 20 },
      { header: "Type", key: "kind" },
      { header: "Montant initial", key: "initial", fmt: EUR },
      { header: "Taux %", key: "rate", fmt: '0.00" %"' },
      { header: "Début", key: "start" },
      { header: "Fin", key: "end" },
      { header: "Capital restant dû (aujourd'hui)", key: "balance", fmt: EUR, width: 18 },
      { header: "Mensualité hors assurance", key: "payment", fmt: EUR2, width: 16 },
      { header: "Assurance / mois", key: "ins", fmt: EUR2 },
      { header: "Qualité du calcul", key: "quality", width: 18 },
      { header: "Remarques", key: "notes", width: 40 },
    ],
    data.loans.map((l) => {
      const r = snap.resolvedLoans.get(l.id);
      const b = data.buildings.find((x) => x.id === l.buildingId);
      return {
        name: l.name || l.bank || "Crédit",
        bank: l.bank,
        building: b?.name,
        company: companyName(b?.companyId ?? l.companyId),
        kind: l.kind === "in_fine" ? "In fine" : "Amortissable",
        initial: l.initialAmount,
        rate: l.ratePct ?? r?.impliedRatePct,
        start: l.startDate,
        end: r?.endMonth !== undefined ? monthLabel(r.endMonth) : l.endDate,
        balance: snap.byLoan.get(l.id)?.balance,
        payment: r?.payment,
        ins: l.insuranceMonthly,
        quality: r ? { complete: "Complet", estimated: "Estimé", insufficient: "Données insuffisantes" }[r.quality] : "",
        notes: [...(r?.notes ?? []), l.notes].filter(Boolean).join(" · "),
      };
    }),
  );

  sheet(
    wb,
    "Projection 30 ans",
    [
      { header: "Année", key: "year", width: 8 },
      { header: "Valeur des biens", key: "value", fmt: EUR, width: 16 },
      { header: "Dette", key: "debt", fmt: EUR, width: 14 },
      { header: "Patrimoine net", key: "net", fmt: EUR, width: 16 },
      { header: "Loyers", key: "rent", fmt: EUR },
      { header: "Charges", key: "charges", fmt: EUR },
      { header: "Mensualités", key: "payments", fmt: EUR },
      { header: "Cash-flow", key: "cashflow", fmt: EUR },
      { header: "Travaux", key: "works", fmt: EUR },
      { header: "Trésorerie", key: "treasury", fmt: EUR },
      { header: "Crédits en cours", key: "activeLoans" },
    ],
    p.years.map((r) => ({ ...r, value: t.unvalued ? undefined : r.value, net: t.unvalued ? undefined : r.net })),
  );

  sheet(
    wb,
    "Travaux",
    [
      { header: "Travaux", key: "label", width: 28 },
      { header: "Année", key: "year" },
      { header: "Montant", key: "amount", fmt: EUR },
      { header: "État", key: "status" },
      { header: "Bien", key: "building", width: 20 },
      { header: "Société", key: "company", width: 20 },
      { header: "Notes", key: "notes", width: 30 },
    ],
    data.works.map((w) => ({
      label: w.label,
      year: w.year,
      amount: w.amount,
      status: labelOf(WORK_STATUSES, w.status ?? "prevu"),
      building: buildingName(w.buildingId),
      company: companyName(data.buildings.find((b) => b.id === w.buildingId)?.companyId ?? w.companyId),
      notes: w.notes,
    })),
  );

  sheet(
    wb,
    "Rémunération",
    [
      { header: "Type", key: "kind", width: 26 },
      { header: "Libellé", key: "label", width: 22 },
      { header: "Société", key: "company", width: 20 },
      { header: "Montant annuel brut", key: "amount", fmt: EUR, width: 16 },
      { header: "De", key: "from" },
      { header: "À", key: "to" },
      { header: "Taux de prélèvements %", key: "tax", fmt: PCT, width: 16 },
    ],
    data.withdrawals.map((w) => ({
      kind: labelOf(WITHDRAWAL_KINDS, w.kind),
      label: w.label,
      company: companyName(w.companyId),
      amount: w.annualAmount,
      from: w.startYear,
      to: w.endYear,
      tax: w.taxRatePct,
    })),
  );

  sheet(
    wb,
    "Bilans",
    [
      { header: "Société", key: "company", width: 22 },
      { header: "Exercice", key: "year" },
      { header: "Chiffre d'affaires", key: "revenue", fmt: EUR },
      { header: "Résultat d'exploitation", key: "operatingResult", fmt: EUR },
      { header: "Dotations amort.", key: "depreciation", fmt: EUR },
      { header: "Charges financières", key: "financialCharges", fmt: EUR },
      { header: "Résultat net", key: "netResult", fmt: EUR },
      { header: "EBE", key: "ebe", fmt: EUR },
      { header: "CAF", key: "caf", fmt: EUR },
      { header: "Capitaux propres", key: "equity", fmt: EUR },
      { header: "Dettes bancaires", key: "bankDebt", fmt: EUR },
      { header: "Comptes courants", key: "partnerAccounts", fmt: EUR },
      { header: "Disponibilités", key: "cash", fmt: EUR },
      { header: "Total bilan", key: "totalAssets", fmt: EUR },
      { header: "Source", key: "source" },
    ],
    [...data.statements]
      .sort((a, b) => companyName(a.companyId).localeCompare(companyName(b.companyId)) || b.year - a.year)
      .map((s) => {
        const r = statementRatios(s.figures);
        return { company: companyName(s.companyId), year: s.year, ...s.figures, ebe: r.ebe, caf: r.caf, source: s.source === "ia" ? "Lecture IA validée" : "Saisie manuelle" };
      }),
  );

  const payRows: Record<string, unknown>[] = [];
  for (const u of data.units) {
    for (const [month, pay] of Object.entries(u.payments ?? {}).sort()) {
      payRows.push({
        month,
        building: buildingName(u.buildingId),
        unit: u.name,
        tenant: [u.tenantFirstName, u.tenantLastName].filter(Boolean).join(" "),
        status: pay.status === "paye" ? "Payé" : pay.status === "impaye" ? "Impayé" : "Partiel",
        due: pay.due,
        paid: pay.status === "paye" ? pay.due : pay.status === "partiel" ? pay.paid : 0,
        left: outstanding(pay),
        note: pay.note,
      });
    }
  }
  sheet(
    wb,
    "Encaissements",
    [
      { header: "Mois", key: "month" },
      { header: "Bien", key: "building", width: 20 },
      { header: "Logement", key: "unit", width: 14 },
      { header: "Locataire", key: "tenant", width: 22 },
      { header: "Statut", key: "status" },
      { header: "Attendu", key: "due", fmt: EUR2 },
      { header: "Encaissé", key: "paid", fmt: EUR2 },
      { header: "Reste dû", key: "left", fmt: EUR2 },
      { header: "Note", key: "note", width: 30 },
    ],
    payRows.sort((a, b) => String(b.month).localeCompare(String(a.month))),
  );

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf as ArrayBuffer);
}
