import type { AppData, Building } from "../types";
import { balanceSource, paymentSource, SOURCE_LABEL } from "./provenance";
import { buildingValue, cashflowMonthly, leasedUnits, netWorth, rentalCharges, rentalPayments, type Snapshot } from "./snapshot";

// « Pourquoi ce chiffre ? » : le détail d'un chiffre clé, ligne par ligne,
// avec l'origine de chaque montant. Mêmes formules que le moteur (aucun
// recalcul parallèle) : la somme des lignes redonne le chiffre affiché.

export type ExplainKind = "net" | "value" | "debt" | "cashflow";

export interface ExplainLine {
  label: string;
  /** Montant signé (négatif = retranché). Absent : donnée manquante. */
  amount?: number;
  source?: string;
  href?: string;
}

export interface ExplainGroup {
  title: string;
  lines: ExplainLine[];
  subtotal?: number;
}

export interface Explanation {
  title: string;
  formula: string;
  total?: number;
  unit: "eur" | "eur/mois";
  groups: ExplainGroup[];
  notes: string[];
}

const bHref = (b: Building) => `/patrimoine/immeuble/${b.id}`;

function valueSource(b: Building, data: AppData): string {
  if (b.valueMode === "surface" && b.surface && b.pricePerSqm) return `Surface × prix au m² (${b.surface} m² × ${Math.round(b.pricePerSqm)} €)`;
  if (b.value !== undefined && b.value !== null) return "Valeur saisie";
  if (b.surface && b.pricePerSqm) return `Surface × prix au m² (${b.surface} m² × ${Math.round(b.pricePerSqm)} €)`;
  if (data.units.some((u) => u.buildingId === b.id && u.value !== undefined)) return "Somme des valeurs des lots";
  return "Non renseignée";
}

function valueGroup(data: AppData): ExplainGroup {
  const lines = data.buildings.map((b) => {
    const v = buildingValue(b, data.units.filter((u) => u.buildingId === b.id));
    return { label: b.name, amount: v, source: valueSource(b, data), href: bHref(b) };
  });
  return { title: "Valeur des biens", lines, subtotal: lines.reduce((s, l) => s + (l.amount ?? 0), 0) };
}

function debtGroup(data: AppData, snap: Snapshot, sign: 1 | -1): ExplainGroup {
  const lines: ExplainLine[] = [];
  for (const l of data.loans) {
    const r = snap.resolvedLoans.get(l.id);
    if (!r || r.finished) continue;
    const balance = snap.byLoan.get(l.id)?.balance;
    lines.push({ label: l.name || l.bank || "Crédit", amount: balance === undefined ? undefined : sign * balance, source: SOURCE_LABEL[balanceSource(l, r)], href: `/patrimoine/credit/${l.id}` });
  }
  return { title: "Capital restant dû", lines, subtotal: lines.reduce((s, l) => s + (l.amount ?? 0), 0) };
}

const personal = (b: Building) => b.usage === "residence_principale" || b.usage === "residence_secondaire";

export function explain(kind: ExplainKind, data: AppData, snap: Snapshot): Explanation {
  const t = snap.total;
  const notes: string[] = [];
  if (kind === "value") {
    const g = valueGroup(data);
    if (t.unvalued) notes.push(`${t.unvalued} bien(s) sans valeur : le total est un minimum.`);
    return { title: "Valeur des biens", formula: "Somme des valeurs de chaque bien", total: t.value, unit: "eur", groups: [g], notes };
  }
  if (kind === "debt") {
    const g = debtGroup(data, snap, 1);
    if (t.unknownDebt) notes.push(`${t.unknownDebt} crédit(s) sans capital restant dû connu : non comptés.`);
    notes.push("Avec un tableau d'amortissement, le restant dû est celui du tableau au 1er du mois.");
    return { title: "Capital restant dû", formula: "Somme des capitaux restant dus des crédits en cours", total: t.debt, unit: "eur", groups: [g], notes };
  }
  if (kind === "net") {
    const v = valueGroup(data);
    const d = debtGroup(data, snap, -1);
    if (t.unvalued) notes.push(`Données insuffisantes : ${t.unvalued} bien(s) sans valeur.`);
    if (t.unknownDebt) notes.push(`${t.unknownDebt} crédit(s) sans capital restant dû connu : non comptés.`);
    return { title: "Patrimoine net", formula: "Valeur des biens − capital restant dû", total: netWorth(t), unit: "eur", groups: [v, d], notes };
  }
  // Cash-flow locatif mensuel.
  const leased = leasedUnits(data);
  const rent: ExplainLine[] = [];
  const charges: ExplainLine[] = [];
  for (const b of data.buildings) {
    const f = snap.byBuilding.get(b.id);
    if (!f) continue;
    const withLease = leased.filter((u) => u.buildingId === b.id && u.status !== "vacant").length;
    if (f.rentMonthly) rent.push({ label: b.name, amount: f.rentMonthly, source: withLease ? `${withLease} lot(s) loué(s) · loyer du bail` : "Loyer global de l'immeuble", href: bHref(b) });
    if (personal(b)) continue;
    charges.push({ label: b.name, amount: f.chargesAnnual ? -f.chargesAnnual / 12 : undefined, source: f.chargesAnnual ? "Taxe foncière, assurance, comptabilité… ÷ 12" : "Non renseignées", href: bHref(b) });
  }
  const payments: ExplainLine[] = [];
  const personalLoan = (buildingId?: string | null) => {
    const b = data.buildings.find((x) => x.id === buildingId);
    return !!b && personal(b);
  };
  for (const l of data.loans) {
    const r = snap.resolvedLoans.get(l.id);
    if (!r || r.finished || personalLoan(l.buildingId)) continue;
    const p = snap.byLoan.get(l.id)?.paymentMonthly;
    payments.push({ label: l.name || l.bank || "Crédit", amount: p ? -p : undefined, source: SOURCE_LABEL[paymentSource(l, r)] + " · assurance comprise", href: `/patrimoine/credit/${l.id}` });
  }
  if (t.personalPaymentsMonthly) notes.push("Résidence principale ou secondaire exclue : ce n'est pas de l'activité locative.");
  if (charges.some((c) => c.amount === undefined)) notes.push("Des charges ne sont pas renseignées : le cash-flow est un maximum.");
  if (t.unknownPayment) notes.push(`${t.unknownPayment} mensualité(s) estimée(s) ou inconnue(s) : montant approché.`);
  return {
    title: "Cash-flow locatif mensuel",
    formula: "Loyers − charges ÷ 12 − mensualités",
    total: cashflowMonthly(t),
    unit: "eur/mois",
    groups: [
      { title: "Loyers", lines: rent, subtotal: t.rentMonthly },
      { title: "Charges", lines: charges, subtotal: -rentalCharges(t) / 12 },
      { title: "Mensualités", lines: payments, subtotal: -rentalPayments(t) },
    ],
    notes,
  };
}
