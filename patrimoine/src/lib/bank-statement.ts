import type { AppData, Unit } from "./types";
import { monthKey, shiftMonthKey } from "./engine/leases";
import { dueFor } from "./payments";
import type { Snapshot } from "./engine/snapshot";

// Rapprochement d'un relevé bancaire (fichier CSV exporté depuis la banque).
// Tout se fait dans l'application, sans IA ni service extérieur : chaque
// ligne est comparée aux loyers attendus (montant, mois, nom du locataire)
// et aux mensualités des crédits. Rien n'est enregistré sans validation.

export interface BankRow {
  /** AAAA-MM-JJ */
  date: string;
  label: string;
  /** Crédit positif, débit négatif. */
  amount: number;
}

export type Confidence = "sure" | "probable";

export type BankMatch =
  | { kind: "rent"; row: BankRow; unitId: string; month: string; due: number; confidence: Confidence; why: string; alreadyPaid: boolean }
  | { kind: "loan"; row: BankRow; loanId: string; confidence: Confidence; why: string }
  | { kind: "none"; row: BankRow };

// ——— Lecture du fichier ———

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

function splitLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === sep && !quoted) {
      out.push(cur.trim());
      cur = "";
    } else cur += c;
  }
  out.push(cur.trim());
  return out;
}

/** Montant au format français ou anglais : « 1 234,56 », « -650,00 € », « 1,234.56 ». */
export function parseAmount(raw: string): number | undefined {
  let s = raw.replace(/[\s  €]/g, "").replace(/^\+/, "");
  if (!s) return undefined;
  const neg = /^-|^\(.*\)$|-$/.test(s);
  s = s.replace(/[()-]/g, "");
  if (s.includes(",") && s.includes(".")) s = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  else if (s.includes(",")) s = s.replace(",", ".");
  const n = Number(s);
  if (!Number.isFinite(n)) return undefined;
  return neg ? -n : n;
}

/** Date « 05/10/2026 », « 05-10-26 » ou « 2026-10-05 » → AAAA-MM-JJ. */
export function parseDate(raw: string): string | undefined {
  const s = raw.trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (!m) return undefined;
  const y = m[3].length === 2 ? `20${m[3]}` : m[3];
  const mo = Number(m[2]);
  const d = Number(m[1]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return undefined;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

const HEAD = {
  label: /libelle|label|description|operation|detail|intitule/,
  amount: /^montant|^amount|^somme/,
  debit: /debit/,
  credit: /credit/,
};

/** Relevé CSV → lignes. Colonnes reconnues : date, libellé, montant (ou débit et crédit). */
export function parseStatement(text: string): { rows: BankRow[]; error?: string } {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { rows: [], error: "Fichier vide ou illisible." };
  const sep = [";", "\t", ","].map((s) => [s, splitLine(lines[0], s).length] as const).sort((a, b) => b[1] - a[1])[0][0];
  // En-tête : première ligne (parmi les 15 premières) qui nomme une date et un montant.
  let headIdx = -1;
  let cols = { date: -1, label: -1, amount: -1, debit: -1, credit: -1 };
  for (let i = 0; i < Math.min(15, lines.length) && headIdx < 0; i++) {
    const cells = splitLine(lines[i], sep).map(norm);
    const find = (re: RegExp, not = -1) => cells.findIndex((c, i) => i !== not && re.test(c));
    const date = find(/^date/);
    const c = { date, label: find(HEAD.label, date), amount: find(HEAD.amount), debit: find(HEAD.debit), credit: find(HEAD.credit) };
    if (c.date >= 0 && (c.amount >= 0 || (c.debit >= 0 && c.credit >= 0))) {
      headIdx = i;
      cols = c;
    }
  }
  if (headIdx < 0) return { rows: [], error: "Colonnes non reconnues : il faut au moins une date et un montant (ou débit et crédit)." };
  const rows: BankRow[] = [];
  for (const line of lines.slice(headIdx + 1)) {
    const cells = splitLine(line, sep);
    const date = parseDate(cells[cols.date] ?? "");
    let amount: number | undefined;
    if (cols.amount >= 0) amount = parseAmount(cells[cols.amount] ?? "");
    else {
      const d = parseAmount(cells[cols.debit] ?? "");
      const c = parseAmount(cells[cols.credit] ?? "");
      amount = c ? Math.abs(c) : d ? -Math.abs(d) : undefined;
    }
    if (!date || amount === undefined || amount === 0) continue;
    const label = cols.label >= 0 ? (cells[cols.label] ?? "") : cells.filter((_, i) => i !== cols.date && i !== cols.amount && i !== cols.debit && i !== cols.credit).join(" ");
    rows.push({ date, label: label.replace(/\s+/g, " ").trim(), amount: Math.round(amount * 100) / 100 });
  }
  if (!rows.length) return { rows, error: "Aucune opération lisible dans le fichier." };
  return { rows };
}

// ——— Rapprochement ———

function tenantNames(data: AppData, unit: Unit): string[] {
  const active = data.tenancies.filter((t) => t.unitId === unit.id && t.status !== "brouillon");
  const names = [...active.flatMap((t) => t.tenants.map((p) => p.lastName)), unit.tenantLastName];
  return [...new Set(names.filter((n): n is string => !!n && norm(n).length >= 3).map(norm))];
}

const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;

export function matchStatement(data: AppData, snap: Snapshot | undefined, rows: BankRow[]): BankMatch[] {
  const used = new Set<string>();
  const units = data.units.filter((u) => u.status !== "vacant" || data.tenancies.some((t) => t.unitId === u.id && t.status === "actif"));
  return rows.map((row): BankMatch => {
    const text = norm(row.label);
    if (row.amount > 0) {
      // Loyer du mois de l'opération, sinon du mois précédent (loyer payé en retard) ou suivant (payé d'avance).
      const month0 = monthKey(row.date);
      type Cand = { unit: Unit; month: string; due: number; named: boolean; amountOk: boolean };
      const cands: Cand[] = [];
      for (const u of units) {
        const named = tenantNames(data, u).some((n) => text.includes(n));
        for (const month of [month0, shiftMonthKey(month0, -1), shiftMonthKey(month0, 1)]) {
          if (used.has(`${u.id}|${month}`)) continue;
          const due = dueFor(data, u, month).due;
          if (!due) continue;
          const amountOk = near(row.amount, due, 1);
          if (named || amountOk) cands.push({ unit: u, month, due, named, amountOk });
        }
      }
      const pick = (list: Cand[], confidence: Confidence, why: string): BankMatch | undefined => {
        // Mois de l'opération d'abord, puis le précédent (retard), puis le suivant (avance) ; un mois déjà payé passe après.
        const rank = (c: Cand) => (c.unit.payments?.[c.month]?.status === "paye" ? 10 : 0) + (c.month === month0 ? 0 : c.month < month0 ? 1 : 2);
        const c = [...list].sort((a, b) => rank(a) - rank(b))[0];
        if (!c) return undefined;
        used.add(`${c.unit.id}|${c.month}`);
        return { kind: "rent", row, unitId: c.unit.id, month: c.month, due: c.due, confidence, why, alreadyPaid: c.unit.payments?.[c.month]?.status === "paye" };
      };
      const both = cands.filter((c) => c.named && c.amountOk);
      if (both.length) return pick(both, "sure", "nom du locataire et montant")!;
      const byAmount = cands.filter((c) => c.amountOk && !c.named);
      if (new Set(byAmount.map((c) => c.unit.id)).size === 1) return pick(byAmount, "probable", "montant identique au loyer")!;
      const byName = cands.filter((c) => c.named && c.month === month0);
      if (new Set(byName.map((c) => c.unit.id)).size === 1) return pick(byName, "probable", "nom du locataire (montant différent)")!;
      return { kind: "none", row };
    }
    // Débit : mensualité d'un crédit (assurance comprise).
    if (snap) {
      const loans = data.loans
        .map((l) => ({ l, pay: snap.byLoan.get(l.id)?.paymentMonthly ?? 0 }))
        .filter(({ pay }) => pay > 0 && near(-row.amount, pay, 2));
      const bankNamed = loans.filter(({ l }) => [l.bank, l.reference].some((x) => x && norm(x).length >= 3 && text.includes(norm(x))));
      const list = bankNamed.length ? bankNamed : loans;
      if (list.length === 1) return { kind: "loan", row, loanId: list[0].l.id, confidence: bankNamed.length ? "sure" : "probable", why: bankNamed.length ? "banque et mensualité" : "montant de la mensualité" };
    }
    return { kind: "none", row };
  });
}
